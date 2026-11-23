-- Access per product (docs/06 and docs/07, Prompt 1): what each person bought and what it unlocks.
-- Written only by the `pagamento` Edge Function (service role). Clients only read their own rows.

-- ---------- Products ----------
create table public.products (
  code             text primary key,
  nome             text not null,
  tipo             text not null,      -- gratis, principal, bump, upsell, downsell, avulso, licenca
  preco_referencia numeric(10, 2) not null default 0
);

alter table public.products enable row level security;
create policy "products: read" on public.products for select to anon, authenticated using (true);

insert into public.products (code, nome, tipo, preco_referencia) values
  ('free',              'Mapa da Bíblia em 7 dias',          'gratis',    0),
  ('fundador',          'Acesso Fundador',                   'principal', 47),
  ('mapa-impresso',     'Mapa da Bíblia para imprimir',      'bump',      14.90),
  ('familia',           'Acesso Família',                    'bump',      27),
  ('vitalicio',         'Fundador Vitalício',                'upsell',    97),
  ('audio',             'Modo Áudio',                        'bump',      19.90),
  ('mensal',            'Plano Mensal',                      'downsell',  9.90),
  ('estudo-romanos',    'Romanos: o evangelho explicado',    'avulso',    37),
  ('estudo-salmos',     'Salmos para os dias difíceis',      'avulso',    37),
  ('estudo-apocalipse', 'Apocalipse sem medo',               'avulso',    37),
  ('igreja',            'Licença Igreja',                    'licenca',   297);

-- ---------- Entitlements ----------
create table public.entitlements (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users (id) on delete set null,
  email           text not null,                          -- buyer e-mail (lowercase); links to the account on signup
  product_code    text not null references public.products (code),
  origem          text not null check (origem in ('compra', 'convite_familia', 'igreja', 'cortesia')),
  status          text not null check (status in ('ativo', 'cancelado', 'reembolsado', 'expirado')),
  starts_at       timestamptz not null default now(),
  expires_at      timestamptz,                            -- null = no expiry
  provider        text not null check (provider in ('hotmart', 'kiwify', 'dev', 'manual')),
  order_id        text not null,                          -- order / transaction id on the platform
  subscription_id text,                                   -- recurring plan id (mensal)
  grupo_id        uuid,                                   -- family or church group (Prompts 6 and 10)
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (provider, order_id, product_code)
);

create index entitlements_user on public.entitlements (user_id);
create index entitlements_email on public.entitlements (lower(email));
create index entitlements_subscription on public.entitlements (subscription_id) where subscription_id is not null;

alter table public.entitlements enable row level security;

-- Each person reads only their own: linked to the account, or bought with the login e-mail.
create policy "entitlements: read own" on public.entitlements
  for select to authenticated
  using (user_id = auth.uid() or lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
-- No insert/update/delete policies: only the server (service role) writes.

-- A purchase made before the account existed is linked as soon as the account is created.
create or replace function public.link_entitlements_to_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.entitlements
     set user_id = new.id, updated_at = now()
   where user_id is null and lower(email) = lower(new.email);
  return new;
end;
$$;

create trigger on_auth_user_created_link_entitlements
  after insert on auth.users
  for each row execute function public.link_entitlements_to_new_user();

-- Bring over the Founder Access purchases recorded by the old hotmart-webhook.
insert into public.entitlements (user_id, email, product_code, origem, status, starts_at, expires_at, provider, order_id)
select s.user_id, lower(s.email), 'fundador', 'compra',
       case s.status when 'active' then 'ativo' when 'expired' then 'expirado' when 'canceled' then 'cancelado' else 'reembolsado' end,
       coalesce(s.purchased_at, s.updated_at), s.expires_at, 'hotmart', s.provider_transaction
  from public.subscriptions s
on conflict do nothing;

-- ---------- Access checks (server side) ----------
-- Same rules as src/access/rules.ts. Keep both in step.

create or replace function public.has_live_product(codes text[])
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1 from public.entitlements e
     where e.product_code = any (codes)
       and e.status in ('ativo', 'cancelado')            -- a canceled monthly plan keeps access until it ends
       and (e.expires_at is null or e.expires_at > now())
       and (e.user_id = auth.uid() or lower(e.email) = lower(coalesce(auth.jwt() ->> 'email', '')))
  );
$$;

create or replace function public.can_access(content text)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select case
    when content = 'trilha-mapa-7-dias' then true
    when content in ('trilha-jesus-em-ordem', 'biblia-em-ordem') then public.has_live_product(array['fundador', 'vitalicio', 'mensal', 'igreja'])
    when content = 'download-mapa-impresso' then public.has_live_product(array['mapa-impresso'])
    when content = 'modo-audio-completo' then public.has_live_product(array['audio'])
    when content like 'estudo-%' then public.has_live_product(array[content])
    else false
  end;
$$;

-- Kept for older app versions: now reads the entitlements.
create or replace function public.is_founder()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select public.has_live_product(array['fundador', 'vitalicio', 'mensal', 'igreja']);
$$;

-- ---------- Paid lesson content ----------
-- Lessons of paid trails live here, not in the app bundle: the server only returns them to
-- whoever can_access the trail, so locked content never reaches the browser.
create table public.premium_lessons (
  trilha     text not null,           -- e.g. trilha-jesus-em-ordem, biblia-em-ordem, estudo-romanos
  dia        int not null,
  data       jsonb not null,          -- same shape as a day in content/trilha-mapa-7-dias.json
  updated_at timestamptz not null default now(),
  primary key (trilha, dia)
);

alter table public.premium_lessons enable row level security;
create policy "premium_lessons: read with access" on public.premium_lessons
  for select to authenticated using (public.can_access(trilha));

-- ---------- Webhook log ----------
-- Every call received, for checking by hand in the SQL editor. Nobody reads it through the API.
create table public.webhook_log (
  id          bigint generated always as identity primary key,
  received_at timestamptz not null default now(),
  provider    text not null,
  event       text,
  ok          boolean not null,
  detail      text,
  payload     jsonb
);

create index webhook_log_received on public.webhook_log (received_at desc);
alter table public.webhook_log enable row level security;
