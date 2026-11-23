-- Founder seats with real scarcity (content/oferta.json): 500 Founder places at R$ 47, then the
-- annual access at R$ 67. The landing page reads only the number of seats taken; the payment
-- webhook gives a seat while there is one and queues anything past the limit for review.

-- ---------- The seat on the purchase ----------
-- true = this Founder purchase holds one of the limited seats (its renewals keep R$ 47).
alter table public.entitlements add column if not exists preco_fundador boolean not null default false;

-- Founder purchases made before this migration all got the Founder price.
update public.entitlements
   set preco_fundador = true
 where product_code in ('fundador', 'vitalicio') and origem = 'compra';

-- ---------- The annual access after the seats ----------
insert into public.products (code, nome, tipo, preco_referencia)
values ('anual', 'Acesso anual', 'principal', 67)
on conflict (code) do nothing;

-- ---------- Seats taken (public, only a number) ----------
-- One seat per buyer (renewals and lifetime upgrades never count twice); refunds free the seat.
create or replace function public.fundadores_vendidos()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(distinct lower(e.email))::integer
    from public.entitlements e
   where e.product_code = 'fundador'
     and e.origem = 'compra'
     and e.preco_fundador
     and e.status = 'ativo';
$$;

revoke all on function public.fundadores_vendidos() from public;
grant execute on function public.fundadores_vendidos() to anon, authenticated, service_role;

-- ---------- Safety queue: Founder sales past the limit ----------
-- The buyer still gets access (as annual, without the Founder price); someone reviews each row
-- (refund the difference, or honour the seat) and marks it resolved.
create table if not exists public.fundador_excedentes (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  provider   text not null,
  order_id   text not null,
  vendidos   integer not null,
  limite     integer not null,
  resolvido  boolean not null default false,
  nota       text,
  created_at timestamptz not null default now(),
  unique (provider, order_id)
);
alter table public.fundador_excedentes enable row level security;
-- No policies: only the server (service role) reads or writes it.

-- ---------- Access: the annual access opens the same journey ----------
create or replace function public.can_access(content text)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select case
    when content = 'trilha-mapa-7-dias' then true
    when content in ('trilha-jesus-em-ordem', 'biblia-em-ordem') then public.has_live_product(array['fundador', 'anual', 'vitalicio', 'mensal', 'igreja', 'igreja-100'])
    when content = 'download-mapa-impresso' then public.has_live_product(array['mapa-impresso'])
    when content = 'modo-audio-completo' then public.has_live_product(array['audio'])
    when content like 'estudo-%' then public.has_live_product(array[content])
    else false
  end;
$$;

create or replace function public.is_founder()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select public.has_live_product(array['fundador', 'anual', 'vitalicio', 'mensal', 'igreja', 'igreja-100']);
$$;

-- The app reads its rows through my_entitlements: now with the seat flag, and every column named
-- (the 20261126 version returned setof entitlements but left out cobranca_falhou_em, so the
-- monthly late-charge notice never reached the app; src came later too).
drop function if exists public.my_entitlements();
create function public.my_entitlements()
returns table (
  id uuid, user_id uuid, email text, product_code text, origem text, status text,
  starts_at timestamptz, expires_at timestamptz, provider text, order_id text,
  subscription_id text, grupo_id uuid, created_at timestamptz, updated_at timestamptz,
  cobranca_falhou_em timestamptz, src text, preco_fundador boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select e.id, e.user_id, e.email, e.product_code, e.origem,
         case
           when e.origem = 'convite_familia' and not public.family_owner_live(e.grupo_id) then 'expirado'
           when e.origem = 'igreja' and not public.church_group_live(e.grupo_id) then 'expirado'
           else e.status
         end,
         e.starts_at, e.expires_at, e.provider, e.order_id, e.subscription_id, e.grupo_id, e.created_at, e.updated_at,
         e.cobranca_falhou_em, e.src, e.preco_fundador
    from public.entitlements e
   where e.user_id = auth.uid() or lower(e.email) = lower(coalesce(auth.jwt() ->> 'email', ''));
$$;
grant execute on function public.my_entitlements() to authenticated;

-- ---------- Transparent renewal: e-mails 15 and 3 days before the end ----------
-- One row per access and mark, so each reminder goes out once (Edge Function renovacao-emails).
create table if not exists public.renovacao_avisos (
  entitlement_id uuid not null references public.entitlements (id) on delete cascade,
  marco          integer not null check (marco in (15, 3)),
  sent_at        timestamptz not null default now(),
  primary key (entitlement_id, marco)
);
alter table public.renovacao_avisos enable row level security;
-- No policies: only the server writes and reads it.
