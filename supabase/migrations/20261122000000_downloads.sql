-- Files of the "Mapa da Bíblia para imprimir" bump (docs/07, Prompt 5): a private bucket that only
-- buyers of mapa-impresso can read. The app hands them a signed link valid for 10 minutes
-- (createSignedUrl), which Supabase only signs when this policy lets the person read the file.
-- Upload the files with: npm run print:export && npm run print:upload

insert into storage.buckets (id, name, public)
values ('downloads', 'downloads', false)
on conflict (id) do update set public = false;

create policy "downloads: buyers of the printable map"
  on storage.objects for select to authenticated
  using (bucket_id = 'downloads' and public.has_live_product(array['mapa-impresso']));
-- No insert/update/delete policies: only the server (service role) writes to this bucket.
