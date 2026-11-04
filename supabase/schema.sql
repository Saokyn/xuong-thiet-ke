-- Xưởng Thiết Kế — Supabase schema for optional cloud sync.
-- Run in the Supabase SQL editor (or `supabase db push`). Safe to re-run.

create table if not exists public.designs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null default '',
  data        jsonb not null default '{}'::jsonb,   -- tpl, json, pages (image data URLs replaced by sb://user-images/... refs)
  thumb       text,                                  -- small JPEG/PNG data URL
  updated_at  timestamptz not null default now(),    -- client sets it (last-write-wins); trigger fills it if missing
  deleted     boolean not null default false          -- soft delete (tombstone)
);
create index if not exists designs_user_updated_idx on public.designs (user_id, updated_at desc);

-- updated_at trigger: keep the client timestamp for LWW, but never let it go backwards and default to now()
create or replace function public.designs_set_updated_at() returns trigger
language plpgsql as $$
begin
  if new.updated_at is null then new.updated_at := now(); end if;
  if tg_op = 'UPDATE' and new.updated_at is not distinct from old.updated_at then new.updated_at := now(); end if;
  new.user_id := old.user_id;  -- ownership cannot be transferred
  return new;
end $$;
drop trigger if exists designs_updated_at on public.designs;
create trigger designs_updated_at before update on public.designs
  for each row execute function public.designs_set_updated_at();

-- Row Level Security: owner only
alter table public.designs enable row level security;
drop policy if exists "designs_select_own" on public.designs;
drop policy if exists "designs_insert_own" on public.designs;
drop policy if exists "designs_update_own" on public.designs;
drop policy if exists "designs_delete_own" on public.designs;
create policy "designs_select_own" on public.designs for select to authenticated using (user_id = auth.uid());
create policy "designs_insert_own" on public.designs for insert to authenticated with check (user_id = auth.uid());
create policy "designs_update_own" on public.designs for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "designs_delete_own" on public.designs for delete to authenticated using (user_id = auth.uid());

-- Storage: private bucket for uploaded images, path {user_id}/...
insert into storage.buckets (id, name, public) values ('user-images', 'user-images', false)
  on conflict (id) do update set public = false;

drop policy if exists "user_images_select_own" on storage.objects;
drop policy if exists "user_images_insert_own" on storage.objects;
drop policy if exists "user_images_update_own" on storage.objects;
drop policy if exists "user_images_delete_own" on storage.objects;
create policy "user_images_select_own" on storage.objects for select to authenticated
  using (bucket_id = 'user-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "user_images_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'user-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "user_images_update_own" on storage.objects for update to authenticated
  using (bucket_id = 'user-images' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'user-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "user_images_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'user-images' and (storage.foldername(name))[1] = auth.uid()::text);
