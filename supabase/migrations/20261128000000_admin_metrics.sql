-- Internal panel (/admin, docs/07 Prompt 11): numbers of the funnel and of sales, by period and UTM.
-- Only e-mails in public.admins can read them, checked here on the server (the app's screen only
-- shows what these functions return). Add yours once:
--   insert into public.admins (email) values ('seu-email@exemplo.com');

-- ---------- Who is an admin ----------
create table public.admins (
  email text primary key check (email = lower(email))
);
alter table public.admins enable row level security;  -- no policies: nobody reads it through the API

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where email = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;

-- ---------- Campaign of each sale ----------
-- `src` from the checkout link (the landing page sets it to utm_source), written by the webhook.
alter table public.entitlements add column if not exists src text;

-- ---------- Indexes for the panel ----------
create index if not exists events_created on public.events (created_at desc);
create index if not exists entitlements_created on public.entitlements (created_at desc);

-- ---------- The numbers ----------
-- p_from / p_to: period (p_to exclusive). p_source / p_campaign: utm_source / utm_campaign (null = all).
-- Funnel (distinct people: the account when known, otherwise the device's visitor id):
--   visitantes  = opened the landing page (lp_view)
--   leads       = started the journey in the app (onboarding_start)
--   dia1/2/7    = completed Day 1, 2 and 7 of the free map for the first time
-- Sales and refunds come from entitlements (bought on Hotmart/Kiwify); they can only be filtered by
-- utm_source (the platforms send back `src`, not the campaign).
create or replace function public.admin_metrics(p_from timestamptz, p_to timestamptz, p_source text default null, p_campaign text default null)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result json;
begin
  if not public.is_admin() then raise exception 'acesso restrito'; end if;

  with ev as (
    select e.name, e.props, coalesce(e.user_id::text, e.anon_id) as who
      from public.events e
     where e.created_at >= p_from and e.created_at < p_to
       and (p_source is null or e.props -> 'utm' ->> 'utm_source' = p_source)
       and (p_campaign is null or e.props -> 'utm' ->> 'utm_campaign' = p_campaign)
  ),
  day_done as (
    select (props ->> 'dia')::int as dia, who from ev
     where name = 'day_complete' and coalesce(props ->> 'trilha', 'mapa-7-dias') = 'mapa-7-dias' and props ->> 'primeiraVez' = 'true'
  ),
  sales as (
    select e.product_code, e.email, e.status, e.created_at, e.updated_at, p.preco_referencia
      from public.entitlements e join public.products p on p.code = e.product_code
     where e.origem = 'compra' and e.provider in ('hotmart', 'kiwify')
       and (p_source is null or e.src = p_source)
  ),
  sold as (select * from sales where created_at >= p_from and created_at < p_to),
  front as (select count(distinct email) as n from sold where product_code = 'fundador')
  select json_build_object(
    'visitantes', (select count(distinct who) from ev where name = 'lp_view'),
    'cliques_compra', (select count(distinct who) from ev where name = 'lp_click' and props ->> 'tipo' = 'compra'),
    'leads', (select count(distinct who) from ev where name = 'onboarding_start'),
    'dia1', (select count(distinct who) from day_done where dia = 1),
    'dia2', (select count(distinct who) from day_done where dia = 2),
    'dia7', (select count(distinct who) from day_done where dia = 7),
    'vendas', coalesce((select json_agg(json_build_object('produto', product_code, 'qtd', qtd, 'receita', receita) order by receita desc)
                          from (select product_code, count(*) as qtd, sum(preco_referencia) as receita from sold group by product_code) v), '[]'::json),
    'fundadores', (select n from front),
    'aceite', json_build_object(
       'mapa-impresso', (select count(distinct email) from sold where product_code = 'mapa-impresso'),
       'familia', (select count(distinct email) from sold where product_code = 'familia'),
       'audio', (select count(distinct email) from sold where product_code = 'audio'),
       'vitalicio', (select count(distinct email) from sold where product_code = 'vitalicio')),
    'reembolsos', (select count(*) from sales where status = 'reembolsado' and updated_at >= p_from and updated_at < p_to),
    'renovacoes', (select count(*) from public.webhook_log where event = 'renewed' and ok and received_at >= p_from and received_at < p_to)
  ) into result;
  return result;
end;
$$;

-- The utm_source / utm_campaign values seen in the last 180 days (for the panel's filters).
create or replace function public.admin_utm_options()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'acesso restrito'; end if;
  return json_build_object(
    'sources', coalesce((select json_agg(distinct props -> 'utm' ->> 'utm_source') from public.events
                          where created_at > now() - interval '180 days' and props -> 'utm' ->> 'utm_source' is not null), '[]'::json),
    'campaigns', coalesce((select json_agg(distinct props -> 'utm' ->> 'utm_campaign') from public.events
                            where created_at > now() - interval '180 days' and props -> 'utm' ->> 'utm_campaign' is not null), '[]'::json));
end;
$$;
