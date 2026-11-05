-- Phase 10: private custom fonts per user. NOT applied automatically — run in the Supabase SQL editor when ready.
-- The client degrades gracefully (fonts stay local in IndexedDB) until this is applied.

-- 1) Metadata table
create table if not exists public.user_fonts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  sha256     text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  family     text not null check (char_length(family) between 1 and 60),
  ext        text not null check (ext in ('ttf','otf','woff','woff2')),
  size       integer not null check (size > 0 and size <= 10485760),
  path       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, sha256),
  check (path = user_id::text || '/' || sha256 || '.' || ext)
);
alter table public.user_fonts enable row level security;

drop policy if exists "user_fonts owner select" on public.user_fonts;
drop policy if exists "user_fonts owner insert" on public.user_fonts;
drop policy if exists "user_fonts owner update" on public.user_fonts;
drop policy if exists "user_fonts owner delete" on public.user_fonts;
create policy "user_fonts owner select" on public.user_fonts for select to authenticated using (user_id = (select auth.uid()));
create policy "user_fonts owner insert" on public.user_fonts for insert to authenticated with check (user_id = (select auth.uid()));
create policy "user_fonts owner update" on public.user_fonts for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "user_fonts owner delete" on public.user_fonts for delete to authenticated using (user_id = (select auth.uid()));

-- 2) Private storage bucket: user-fonts/{user_id}/<sha256>.<ext>
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('user-fonts', 'user-fonts', false, 10485760,
        array['font/ttf','font/otf','font/woff','font/woff2','application/octet-stream','application/font-woff','application/x-font-ttf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "user-fonts owner read"   on storage.objects;
drop policy if exists "user-fonts owner write"  on storage.objects;
drop policy if exists "user-fonts owner update" on storage.objects;
drop policy if exists "user-fonts owner delete" on storage.objects;
create policy "user-fonts owner read"   on storage.objects for select to authenticated using (bucket_id = 'user-fonts' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "user-fonts owner write"  on storage.objects for insert to authenticated with check (bucket_id = 'user-fonts' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "user-fonts owner update" on storage.objects for update to authenticated using (bucket_id = 'user-fonts' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "user-fonts owner delete" on storage.objects for delete to authenticated using (bucket_id = 'user-fonts' and (storage.foldername(name))[1] = (select auth.uid())::text);
