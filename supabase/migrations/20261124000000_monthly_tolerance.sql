-- Vitalício e Mensal (docs/07, Prompt 7): when a monthly charge fails, the payment webhook keeps
-- the access for 3 more days and records when it failed, so the app can show a discreet warning.
-- A charge that goes through clears it.
alter table public.entitlements add column if not exists cobranca_falhou_em timestamptz;

-- my_entitlements lists the table's columns: include the new one (same order as the table).
create or replace function public.my_entitlements()
returns setof public.entitlements
language sql
stable
security definer
set search_path = public
as $$
  select e.id, e.user_id, e.email, e.product_code, e.origem,
         case when e.origem = 'convite_familia' and not public.family_owner_live(e.grupo_id) then 'expirado' else e.status end,
         e.starts_at, e.expires_at, e.provider, e.order_id, e.subscription_id, e.grupo_id, e.created_at, e.updated_at,
         e.cobranca_falhou_em
    from public.entitlements e
   where e.user_id = auth.uid() or lower(e.email) = lower(coalesce(auth.jwt() ->> 'email', ''));
$$;
