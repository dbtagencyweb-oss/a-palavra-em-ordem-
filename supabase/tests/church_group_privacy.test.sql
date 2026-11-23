-- Licença Igreja · privacy (docs/07, Prompt 10, item 5). Run with: supabase test db
-- Proves that a group leader can't reach a member's diary, reflections, quiz answers or personal
-- data beyond the first name: not through the tables, not through the panel.
begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

-- ---------- Setup (as the database owner) ----------
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'lider@igreja.test', '{"full_name": "Paulo Lider"}'),
  ('00000000-0000-0000-0000-0000000000b2', 'ana.secreta@exemplo.test', '{"full_name": "Ana Souza"}');

-- The leader's purchase creates the group (trigger).
insert into public.entitlements (user_id, email, product_code, origem, status, expires_at, provider, order_id)
values ('00000000-0000-0000-0000-0000000000a1', 'lider@igreja.test', 'igreja', 'compra', 'ativo', now() + interval '1 year', 'dev', 'ORDER-IGREJA-1');

select is((select count(*)::int from public.groups where lider_id = '00000000-0000-0000-0000-0000000000a1'), 1, 'buying the license creates the group');

-- The member's private data.
insert into public.progress (user_id, data) values ('00000000-0000-0000-0000-0000000000b2',
  jsonb_build_object('completedDays', jsonb_build_object('1', to_char(public.church_today(), 'YYYY-MM-DD')),
                     'trails', '{}'::jsonb, 'streak', 3, 'lastStreakDate', to_char(public.church_today(), 'YYYY-MM-DD'),
                     'quizSecreto', 'resposta do quiz'));
insert into public.diary_entries (id, user_id, tag, fields) values
  (gen_random_uuid(), '00000000-0000-0000-0000-0000000000b2', 'Dia 1 · Reflexão', '{"texto": "REFLEXAO-PRIVADA"}');

-- ---------- The member joins ----------
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000b2", "email": "ana.secreta@exemplo.test", "role": "authenticated"}';
select is(public.join_church_group((select codigo from public.groups limit 1)), 'Meu grupo', 'the member joins with the link');
select ok(public.can_access('trilha-jesus-em-ordem'), 'the member gets the paid trails while the group is live');

-- ---------- Now as the leader ----------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "email": "lider@igreja.test", "role": "authenticated"}';

select is((select count(*)::int from public.diary_entries where user_id = '00000000-0000-0000-0000-0000000000b2'), 0, 'leader cannot read the member''s diary');
select is((select count(*)::int from public.progress where user_id = '00000000-0000-0000-0000-0000000000b2'), 0, 'leader cannot read the member''s progress row');
select is((select count(*)::int from public.entitlements where user_id = '00000000-0000-0000-0000-0000000000b2'), 0, 'leader cannot read the member''s entitlements (e-mail)');
select is((select count(*)::int from public.group_members where user_id = '00000000-0000-0000-0000-0000000000b2'), 0, 'leader cannot list members (user ids) directly');

-- The panel: exactly the allowed fields, first name only, and nothing private in it.
select is(
  (select array_agg(k order by k) from json_object_keys((public.church_group_panel() -> 0)) k),
  array['dia', 'id', 'lampada', 'leu_hoje', 'nome', 'trilha'],
  'the panel returns only id, nome, leu_hoje, lampada, trilha and dia');
select is(public.church_group_panel() -> 0 ->> 'nome', 'Ana', 'the panel shows the first name only');
select ok(public.church_group_panel()::text not like '%REFLEXAO-PRIVADA%', 'no diary text in the panel');
select ok(public.church_group_panel()::text not like '%resposta do quiz%', 'no quiz answers in the panel');
select ok(public.church_group_panel()::text not like '%secreta%' and public.church_group_panel()::text not like '%@%', 'no e-mail in the panel');
select is((public.church_group_panel() -> 0 ->> 'leu_hoje')::boolean, true, 'the panel shows who read today');

select * from finish();
rollback;
