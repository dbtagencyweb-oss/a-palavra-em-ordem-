-- Licença Igreja (docs/07, Prompt 10): a leader buys for the group and follows it without invading
-- anyone's privacy. Same rules, in TypeScript, in supabase/functions/_shared/logic-group.ts.
--
-- Flow
--  - Buying "igreja" (30 seats) or "igreja-100" (100 seats) creates the group, with the buyer as
--    leader (trigger on entitlements, so the payment webhook needs no change). Renewal, refund and
--    expiry of that purchase carry over to the group.
--  - The leader shares one invite link. Whoever joins gets an entitlement with origem "igreja",
--    live while the group is live, if there is a free seat.
--
-- Privacy (non-negotiable, enforced here, not in the app)
--  - Nobody gets a policy to read another person's progress, diary or entitlements. Those tables
--    keep their "own rows only" policies.
--  - groups and group_members are readable only by the leader (the group row) and by each person
--    (their own membership row). Everything else goes through the functions below, which return
--    first names and progress numbers only: whether the member read today, their lamp, and the
--    trail and day they reached. Never the diary, reflections, quiz answers, e-mail or user id.
--  - Proof: supabase/tests/church_group_privacy.test.sql (pgTAP, `supabase test db`) and
--    supabase/functions/_shared/church-privacy.test.ts (checks this file and the panel fields).

-- ---------- The 100-seat license ----------
insert into public.products (code, nome, tipo, preco_referencia) values
  ('igreja-100', 'Licença Igreja (até 100 pessoas)', 'licenca', 697)
on conflict (code) do nothing;

-- ---------- Tables ----------
create table public.groups (
  id             uuid primary key default gen_random_uuid(),
  entitlement_id uuid not null unique references public.entitlements (id) on delete cascade,
  nome           text not null default 'Meu grupo',
  lider_id       uuid references auth.users (id) on delete set null,   -- set once the buyer has an account
  lider_email    text not null,
  vagas          int not null check (vagas > 0),                       -- seats for members (the leader takes none)
  vencimento     timestamptz,                                          -- null = no expiry
  ativo          boolean not null default true,
  codigo         text not null unique default substr(md5(random()::text || clock_timestamp()::text), 1, 10),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index groups_lider on public.groups (lider_id);

create table public.group_members (
  id        uuid primary key default gen_random_uuid(),   -- the membership (what the panel uses to remove someone; never the user id)
  grupo_id  uuid not null references public.groups (id) on delete cascade,
  user_id   uuid not null references auth.users (id) on delete cascade,
  papel     text not null check (papel in ('lider', 'membro')),
  entrou_em timestamptz not null default now(),
  unique (grupo_id, user_id)
);
create index group_members_user on public.group_members (user_id);

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
-- The leader reads their group row; each person reads their own membership. No writes from clients:
-- only the functions below (security definer) change these tables.
create policy "groups: leader reads" on public.groups
  for select to authenticated using (lider_id = auth.uid());
create policy "group_members: own row" on public.group_members
  for select to authenticated using (user_id = auth.uid());

-- ---------- The group follows the leader's purchase ----------
create or replace function public.sync_church_group()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  g public.groups;
begin
  if new.origem <> 'compra' or new.product_code not in ('igreja', 'igreja-100') then return new; end if;
  insert into public.groups (entitlement_id, lider_id, lider_email, vagas, vencimento, ativo)
  values (new.id, new.user_id, lower(new.email), case new.product_code when 'igreja-100' then 100 else 30 end,
          new.expires_at, new.status in ('ativo', 'cancelado'))
  on conflict (entitlement_id) do update
     set lider_id = coalesce(excluded.lider_id, public.groups.lider_id),
         vagas = excluded.vagas, vencimento = excluded.vencimento, ativo = excluded.ativo, updated_at = now()
  returning * into g;
  if g.lider_id is not null then
    insert into public.group_members (grupo_id, user_id, papel) values (g.id, g.lider_id, 'lider')
    on conflict (grupo_id, user_id) do update set papel = 'lider';
  end if;
  return new;
end;
$$;

create trigger on_entitlement_sync_church_group
  after insert or update on public.entitlements
  for each row execute function public.sync_church_group();

create or replace function public.church_group_live(p_group uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.groups g where g.id = p_group and g.ativo and (g.vencimento is null or g.vencimento > now()));
$$;

-- ---------- Access checks, now with church groups and the 100-seat license ----------
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
       and (e.origem <> 'igreja' or public.church_group_live(e.grupo_id))
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
    when content in ('trilha-jesus-em-ordem', 'biblia-em-ordem') then public.has_live_product(array['fundador', 'vitalicio', 'mensal', 'igreja', 'igreja-100'])
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
  select public.has_live_product(array['fundador', 'vitalicio', 'mensal', 'igreja', 'igreja-100']);
$$;

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
            where e.user_id = p_owner and e.origem = 'compra' and e.product_code in ('fundador', 'vitalicio', 'mensal', 'igreja', 'igreja-100')
              and e.status in ('ativo', 'cancelado') and (e.expires_at is null or e.expires_at > now()));
$$;

-- What the app reads: a member's church access shows as expired once the group isn't live.
create or replace function public.my_entitlements()
returns setof public.entitlements
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
         e.starts_at, e.expires_at, e.provider, e.order_id, e.subscription_id, e.grupo_id, e.created_at, e.updated_at
    from public.entitlements e
   where e.user_id = auth.uid() or lower(e.email) = lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

-- ---------- Progress, reduced to what the panel may show ----------
-- From the app's progress (progress.data) to: read today?, live lamp, furthest trail and its last
-- completed day. Mirrors panelMember() in logic-group.ts. Nothing else of the progress leaves here.
create or replace function public.church_progress(p jsonb, p_today date)
returns table (leu_hoje boolean, lampada int, trilha text, dia int)
language sql
immutable
set search_path = public
as $$
  with days as (
    select jsonb_build_object('mapa-7-dias', coalesce(p -> 'completedDays', '{}'::jsonb)) || coalesce(p -> 'trails', '{}'::jsonb) as m
  ),
  furthest as (
    select o.t, (select max(k::int) from jsonb_object_keys(d.m -> o.t) k where k ~ '^\d+$') as dia
      from days d, unnest(array['biblia-em-ordem', 'jesus-em-ordem', 'mapa-7-dias']) with ordinality o(t, ord)
     where jsonb_typeof(d.m -> o.t) = 'object'
       and exists (select 1 from jsonb_object_keys(d.m -> o.t) k where k ~ '^\d+$')
     order by o.ord
     limit 1
  )
  select
    exists (select 1 from days d, jsonb_each(d.m) t, jsonb_each_text(t.value) x
             where jsonb_typeof(t.value) = 'object' and x.value = to_char(p_today, 'YYYY-MM-DD')),
    case when (p ->> 'lastStreakDate') >= to_char(p_today - 1, 'YYYY-MM-DD') then coalesce((p ->> 'streak')::int, 0) else 0 end,
    (select f.t from furthest f),
    coalesce((select f.dia from furthest f), 0);
$$;

-- The group's calendar day (Brazil).
create or replace function public.church_today()
returns date
language sql
stable
as $$ select (now() at time zone 'America/Sao_Paulo')::date; $$;

-- ---------- First name only ----------
-- (family_first_name, from the family migration: the first word of the name, or of the e-mail's
-- local part. Never the e-mail itself.)

-- ---------- The group of the signed-in person ----------
-- Leader: the group (with its link), seat use and the collective lamp. Member: the group's name and
-- the collective lamp. No names of other members here.
create or replace function public.my_church_group()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  my_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  g public.groups;
  gid uuid;
  role text;
  lit int;
  total int;
begin
  if me is null then return json_build_object('papel', null); end if;
  -- A leader who bought before having an account: claim the group on first use.
  update public.groups set lider_id = me, updated_at = now()
   where lider_id is null and lider_email = my_email;
  insert into public.group_members (grupo_id, user_id, papel)
  select id, me, 'lider' from public.groups where lider_id = me
  on conflict (grupo_id, user_id) do update set papel = 'lider';

  select gm.grupo_id, gm.papel into gid, role
    from public.group_members gm join public.groups gr on gr.id = gm.grupo_id
   where gm.user_id = me
   order by (gm.papel = 'lider') desc, gr.created_at desc
   limit 1;
  if gid is null then return json_build_object('papel', null); end if;
  select * into g from public.groups where id = gid;

  select count(*) filter (where cp.leu_hoje), count(*) into lit, total
    from public.group_members gm
    left join public.progress pr on pr.user_id = gm.user_id
    cross join lateral public.church_progress(coalesce(pr.data, '{}'::jsonb), public.church_today()) cp
   where gm.grupo_id = g.id;

  return json_build_object(
    'papel', role,
    'id', g.id,
    'nome', g.nome,
    'ativo', public.church_group_live(g.id),
    'vencimento', g.vencimento,
    'vagas', g.vagas,
    'membros', (select count(*) from public.group_members where grupo_id = g.id and papel = 'membro'),
    'codigo', case when role = 'lider' then g.codigo end,
    'lampada', json_build_object('acesas', lit, 'total', total)
  );
end;
$$;

-- ---------- Leader's panel ----------
-- One row per member, with exactly the fields of PANEL_FIELDS in logic-group.ts:
-- id (the membership, to remove someone), nome, leu_hoje, lampada, trilha, dia.
create or replace function public.church_group_panel()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  gid uuid;
begin
  select id into gid from public.groups where lider_id = me order by created_at desc limit 1;
  if gid is null then raise exception 'só o líder do grupo vê o painel'; end if;
  return coalesce((
    select json_agg(json_build_object(
             'id', gm.id,
             'nome', public.family_first_name(gm.user_id),
             'leu_hoje', cp.leu_hoje,
             'lampada', cp.lampada,
             'trilha', cp.trilha,
             'dia', cp.dia) order by public.family_first_name(gm.user_id))
      from public.group_members gm
      left join public.progress pr on pr.user_id = gm.user_id
      cross join lateral public.church_progress(coalesce(pr.data, '{}'::jsonb), public.church_today()) cp
     where gm.grupo_id = gid and gm.papel = 'membro'), '[]'::json);
end;
$$;

-- ---------- Leader: name, new link, remove someone ----------
create or replace function public.set_church_group_name(p_nome text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if length(trim(coalesce(p_nome, ''))) not between 2 and 60 then raise exception 'nome inválido'; end if;
  update public.groups set nome = trim(p_nome), updated_at = now() where lider_id = auth.uid();
  if not found then raise exception 'só o líder muda o nome'; end if;
end;
$$;

-- A new link: the old one stops working (people who already joined stay).
create or replace function public.new_church_group_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  c text := substr(md5(random()::text || clock_timestamp()::text || auth.uid()::text), 1, 10);
begin
  update public.groups set codigo = c, updated_at = now() where lider_id = auth.uid();
  if not found then raise exception 'só o líder gera o link'; end if;
  return c;
end;
$$;

create or replace function public.remove_church_member(p_membro uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m public.group_members;
begin
  select gm.* into m from public.group_members gm join public.groups g on g.id = gm.grupo_id
   where gm.id = p_membro and gm.papel = 'membro' and g.lider_id = auth.uid();
  if not found then raise exception 'membro não encontrado'; end if;
  delete from public.group_members where id = m.id;
  update public.entitlements set status = 'cancelado', expires_at = now(), updated_at = now()
   where origem = 'igreja' and grupo_id = m.grupo_id and user_id = m.user_id;
end;
$$;

-- ---------- Member: join, leave ----------
create or replace function public.join_church_group(p_code text)
returns text   -- the group's name
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  g public.groups;
begin
  if me is null then raise exception 'sem login'; end if;
  select * into g from public.groups where codigo = p_code;
  if not found then raise exception 'convite inválido'; end if;
  if g.lider_id = me then raise exception 'você é o líder deste grupo'; end if;
  if exists (select 1 from public.group_members where grupo_id = g.id and user_id = me) then return g.nome; end if;
  if not public.church_group_live(g.id) then raise exception 'o grupo não está ativo'; end if;
  if (select count(*) from public.group_members where grupo_id = g.id and papel = 'membro') >= g.vagas then
    raise exception 'o grupo está cheio';
  end if;
  insert into public.group_members (grupo_id, user_id, papel) values (g.id, me, 'membro');
  -- Full access while the group is live (no expiry of its own; see has_live_product).
  insert into public.entitlements (user_id, email, product_code, origem, status, starts_at, expires_at, provider, order_id, grupo_id)
  values (me, lower(coalesce(auth.jwt() ->> 'email', '')), 'igreja', 'igreja', 'ativo', now(), null, 'manual', 'igreja:' || g.id || ':' || me, g.id)
  on conflict (provider, order_id, product_code)
  do update set status = 'ativo', expires_at = null, user_id = excluded.user_id, updated_at = now();
  return g.nome;
end;
$$;

create or replace function public.leave_church_group()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  update public.entitlements set status = 'cancelado', expires_at = now(), updated_at = now()
   where origem = 'igreja' and user_id = me
     and grupo_id in (select grupo_id from public.group_members where user_id = me and papel = 'membro');
  delete from public.group_members where user_id = me and papel = 'membro';
end;
$$;
