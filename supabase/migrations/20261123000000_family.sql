-- Acesso Família (docs/07, Prompt 6): the buyer of the "familia" bump invites up to 2 people.
-- Each invitee has their own account, progress, lamp and diary (all private). Their access is not
-- copied: it follows the owner's, so it renews, becomes lifetime or ends (refund) with it.
-- Same rules, in TypeScript, in supabase/functions/_shared/logic-family.ts.

-- ---------- Invites ----------
create table public.family_invites (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users (id) on delete cascade,
  codigo      text not null unique,
  email       text,                                         -- optional: who the invite is for
  status      text not null default 'pendente' check (status in ('pendente', 'aceito', 'revogado')),
  aceito_por  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  revogado_em timestamptz
);
create index family_invites_owner on public.family_invites (owner_id);
create index family_invites_member on public.family_invites (aceito_por);

alter table public.family_invites enable row level security;
-- The owner sees their invites; an invitee sees the one they accepted. Changes only through the
-- functions below.
create policy "family_invites: owner or member reads" on public.family_invites
  for select to authenticated using (owner_id = auth.uid() or aceito_por = auth.uid());

-- ---------- Showing the lamp to the family (on by default) ----------
create table public.family_lamp_prefs (
  user_id uuid primary key references auth.users (id) on delete cascade,
  share   boolean not null default true
);
alter table public.family_lamp_prefs enable row level security;
create policy "family_lamp_prefs: own" on public.family_lamp_prefs
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- Does the owner still share access? ----------
-- The bump and a full-access product, both bought (an access received as an invitee does not pass on).
create or replace function public.family_owner_live(p_owner uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
           select 1 from public.entitlements e
            where e.user_id = p_owner and e.origem = 'compra' and e.product_code = 'familia'
              and e.status in ('ativo', 'cancelado') and (e.expires_at is null or e.expires_at > now()))
     and exists (
           select 1 from public.entitlements e
            where e.user_id = p_owner and e.origem = 'compra' and e.product_code in ('fundador', 'vitalicio', 'mensal', 'igreja')
              and e.status in ('ativo', 'cancelado') and (e.expires_at is null or e.expires_at > now()));
$$;

-- Access checks now treat family access as live only while the owner's is.
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
       and e.status in ('ativo', 'cancelado')
       and (e.expires_at is null or e.expires_at > now())
       and (e.origem <> 'convite_familia' or public.family_owner_live(e.grupo_id))
       and (e.user_id = auth.uid() or lower(e.email) = lower(coalesce(auth.jwt() ->> 'email', '')))
  );
$$;

-- What the app reads: the person's entitlements, with family access shown as expired once the
-- owner's has ended (the app's rules can't see the owner's rows).
create or replace function public.my_entitlements()
returns setof public.entitlements
language sql
stable
security definer
set search_path = public
as $$
  select e.id, e.user_id, e.email, e.product_code, e.origem,
         case when e.origem = 'convite_familia' and not public.family_owner_live(e.grupo_id) then 'expirado' else e.status end,
         e.starts_at, e.expires_at, e.provider, e.order_id, e.subscription_id, e.grupo_id, e.created_at, e.updated_at
    from public.entitlements e
   where e.user_id = auth.uid() or lower(e.email) = lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

-- ---------- First name to show to the family (never the e-mail domain or anything else) ----------
create or replace function public.family_first_name(p_user uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select initcap(split_part(coalesce(nullif(u.raw_user_meta_data ->> 'full_name', ''), nullif(u.raw_user_meta_data ->> 'name', ''), split_part(u.email, '@', 1)), ' ', 1))
    from auth.users u where u.id = p_user;
$$;

-- ---------- Owner: invite, revoke ----------
create or replace function public.create_family_invite(p_email text default null)
returns public.family_invites
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  row public.family_invites;
begin
  if me is null then raise exception 'sem login'; end if;
  if not public.family_owner_live(me) then raise exception 'sem Acesso Família ativo'; end if;
  if (select count(*) from public.family_invites where owner_id = me and status <> 'revogado') >= 2 then
    raise exception 'as 2 vagas já estão em uso';
  end if;
  insert into public.family_invites (owner_id, codigo, email)
  values (me, substr(md5(random()::text || clock_timestamp()::text || me::text), 1, 10), nullif(lower(trim(p_email)), ''))
  returning * into row;
  return row;
end;
$$;

create or replace function public.revoke_family_invite(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  inv public.family_invites;
begin
  select * into inv from public.family_invites where id = p_id and owner_id = me;
  if not found or inv.status = 'revogado' then raise exception 'convite não encontrado'; end if;
  -- Removing someone who accepted is a swap: at most 2 in 365 days.
  if inv.status = 'aceito' and (
       select count(*) from public.family_invites
        where owner_id = me and status = 'revogado' and aceito_por is not null and revogado_em > now() - interval '365 days') >= 2 then
    raise exception 'limite de 2 trocas por ano atingido';
  end if;
  update public.family_invites set status = 'revogado', revogado_em = now(), updated_at = now() where id = p_id;
  if inv.aceito_por is not null then
    update public.entitlements
       set status = 'cancelado', expires_at = now(), updated_at = now()
     where origem = 'convite_familia' and grupo_id = me and user_id = inv.aceito_por;
  end if;
end;
$$;

-- ---------- Invitee: accept ----------
create or replace function public.accept_family_invite(p_code text)
returns text   -- the owner's first name
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  inv public.family_invites;
begin
  if me is null then raise exception 'sem login'; end if;
  select * into inv from public.family_invites where codigo = p_code;
  if not found or inv.status = 'revogado' then raise exception 'convite inválido'; end if;
  if inv.status = 'aceito' and inv.aceito_por <> me then raise exception 'convite já usado'; end if;
  if inv.owner_id = me then raise exception 'o convite é para outra pessoa'; end if;
  if not public.family_owner_live(inv.owner_id) then raise exception 'o acesso de quem convidou não está ativo'; end if;
  update public.family_invites set status = 'aceito', aceito_por = me, updated_at = now() where id = inv.id;
  -- Same access as the owner, for as long as the owner has it (no expiry of its own).
  insert into public.entitlements (user_id, email, product_code, origem, status, starts_at, expires_at, provider, order_id, grupo_id)
  values (me, lower(coalesce(auth.jwt() ->> 'email', '')), 'fundador', 'convite_familia', 'ativo', now(), null, 'manual', 'familia:' || inv.id, inv.owner_id)
  on conflict (provider, order_id, product_code)
  do update set status = 'ativo', expires_at = null, user_id = excluded.user_id, updated_at = now();
  return public.family_first_name(inv.owner_id);
end;
$$;

-- ---------- The family, as the Profile shows it ----------
-- Role, owner's name, invites (owner only), swaps used and the lamps of those who share them.
-- Only first names and lamps: never progress details, diary, reflections or answers.
create or replace function public.my_family()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  owner uuid;
  role text;
begin
  if me is null then return null; end if;
  if exists (select 1 from public.entitlements where user_id = me and origem = 'compra' and product_code = 'familia') then
    owner := me; role := 'dono';
  else
    select owner_id into owner from public.family_invites where aceito_por = me and status = 'aceito' limit 1;
    if owner is null then return json_build_object('papel', null); end if;
    role := 'membro';
  end if;
  return json_build_object(
    'papel', role,
    'dono_nome', public.family_first_name(owner),
    'compartilhar', coalesce((select share from public.family_lamp_prefs where user_id = me), true),
    'convites', case when role = 'dono' then coalesce((
        select json_agg(json_build_object('id', i.id, 'codigo', i.codigo, 'email', i.email, 'status', i.status,
                                          'aceito_por', i.aceito_por, 'created_at', i.created_at, 'revogado_em', i.revogado_em,
                                          'membro_nome', case when i.aceito_por is not null then public.family_first_name(i.aceito_por) end)
                        order by i.created_at)
          from public.family_invites i where i.owner_id = owner), '[]'::json) else '[]'::json end,
    'trocas_usadas', (select count(*) from public.family_invites
                       where owner_id = owner and status = 'revogado' and aceito_por is not null and revogado_em > now() - interval '365 days'),
    'lampadas', coalesce((
        select json_agg(json_build_object('nome', public.family_first_name(m.uid), 'eu', m.uid = me,
                 'lampada', case when (p.data ->> 'lastStreakDate') >= to_char(current_date - 1, 'YYYY-MM-DD')
                                 then coalesce((p.data ->> 'streak')::int, 0) else 0 end))
          from (select owner as uid union select aceito_por from public.family_invites where owner_id = owner and status = 'aceito') m
          left join public.progress p on p.user_id = m.uid
         where coalesce((select share from public.family_lamp_prefs where user_id = m.uid), true)), '[]'::json)
  );
end;
$$;

create or replace function public.set_family_lamp_share(p_share boolean)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.family_lamp_prefs (user_id, share) values (auth.uid(), p_share)
  on conflict (user_id) do update set share = excluded.share;
$$;
