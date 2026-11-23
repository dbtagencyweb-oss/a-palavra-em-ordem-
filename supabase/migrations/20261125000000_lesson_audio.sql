-- Modo Áudio (docs/07, Prompt 8): the full narration of each lesson, in a private bucket that only
-- buyers of the "audio" bump can read. The app plays it through a signed link.
-- Files: <trilha>/dia-XX.mp3 (A Bíblia em Ordem: biblia-em-ordem/etapa-XX/dia-XX.mp3).
-- Upload with: npm run audio:upload

insert into storage.buckets (id, name, public)
values ('lesson-audio', 'lesson-audio', false)
on conflict (id) do update set public = false;

create policy "lesson-audio: buyers of Modo Áudio"
  on storage.objects for select to authenticated
  using (bucket_id = 'lesson-audio' and public.has_live_product(array['audio']));
