-- Retention messages by Web Push (docs/07, Prompt 11).
-- The app saves its reminder state (texts and numbers it builds itself, see
-- supabase/functions/_shared/logic-reminders.ts) and each device's push subscription. The
-- `lembretes` function reads them with the service role and sends the message of the day.

create table public.reminder_state (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  state      jsonb not null,
  tz         text not null default 'America/Sao_Paulo',
  updated_at timestamptz not null default now()
);
alter table public.reminder_state enable row level security;
create policy "reminder_state: own" on public.reminder_state
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.push_subscriptions (
  endpoint   text primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  keys       jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index push_subscriptions_user on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
create policy "push_subscriptions: own" on public.push_subscriptions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
