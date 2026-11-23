-- A Palavra em Ordem: progress, diary, subscriptions (Founder Access) and analytics events.
-- Every table has Row Level Security: a user only ever reads or writes their own rows.

-- ---------- Progress ----------
-- One row per user. `data` mirrors the app's Progress object (without the diary),
-- so game rules stay in the client as pure functions.
create table public.progress (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.progress enable row level security;

create policy "progress: read own" on public.progress
  for select to authenticated using (user_id = auth.uid());
create policy "progress: insert own" on public.progress
  for insert to authenticated with check (user_id = auth.uid());
create policy "progress: update own" on public.progress
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "progress: delete own" on public.progress
  for delete to authenticated using (user_id = auth.uid());

-- ---------- Diary ----------
create table public.diary_entries (
  id         uuid primary key,               -- generated on the device, so offline entries sync without duplicates
  user_id    uuid not null references auth.users (id) on delete cascade,
  tag        text not null,                  -- e.g. "Dia 1 · Reflexão" or "Registro livre"
  fields     jsonb not null,
  created_at timestamptz not null default now()
);

create index diary_entries_user_created on public.diary_entries (user_id, created_at desc);

alter table public.diary_entries enable row level security;

create policy "diary: read own" on public.diary_entries
  for select to authenticated using (user_id = auth.uid());
create policy "diary: insert own" on public.diary_entries
  for insert to authenticated with check (user_id = auth.uid());
create policy "diary: update own" on public.diary_entries
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "diary: delete own" on public.diary_entries
  for delete to authenticated using (user_id = auth.uid());

-- ---------- Subscriptions (Founder Access) ----------
-- Written only by the hotmart-webhook Edge Function (service role). Clients can only read.
create table public.subscriptions (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid references auth.users (id) on delete set null,
  email                 text not null,
  product               text not null default 'fundador',
  provider              text not null default 'hotmart',
  provider_transaction  text not null unique,
  status                text not null check (status in ('active', 'canceled', 'refunded', 'chargeback', 'disputed', 'expired')),
  purchased_at          timestamptz,
  expires_at            timestamptz,
  raw                   jsonb,
  updated_at            timestamptz not null default now()
);

create index subscriptions_email on public.subscriptions (lower(email));
create index subscriptions_user on public.subscriptions (user_id);

alter table public.subscriptions enable row level security;

-- A buyer sees the purchase linked to their account, or made with their (verified) login e-mail.
create policy "subscriptions: read own" on public.subscriptions
  for select to authenticated
  using (user_id = auth.uid() or lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- Link purchases made before the account existed, as soon as the account is created.
create or replace function public.link_subscriptions_to_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.subscriptions
     set user_id = new.id, updated_at = now()
   where user_id is null and lower(email) = lower(new.email);
  return new;
end;
$$;

create trigger on_auth_user_created_link_subscriptions
  after insert on auth.users
  for each row execute function public.link_subscriptions_to_new_user();

-- True while the signed-in user has an active, unexpired Founder Access.
create or replace function public.is_founder()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1 from public.subscriptions s
     where s.status = 'active'
       and (s.expires_at is null or s.expires_at > now())
       and (s.user_id = auth.uid() or lower(s.email) = lower(coalesce(auth.jwt() ->> 'email', '')))
  );
$$;

-- ---------- Analytics events ----------
-- Insert-only from the app. Nobody can read through the API; reports are SQL in the dashboard.
create table public.events (
  id         bigint generated always as identity primary key,
  user_id    uuid references auth.users (id) on delete set null,
  anon_id    text not null,                  -- random id kept on the device, joins events before and after login
  name       text not null,
  props      jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index events_name_created on public.events (name, created_at desc);

alter table public.events enable row level security;

create policy "events: insert" on public.events
  for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());
