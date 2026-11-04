-- Xưởng Thiết Kế — admin round: admins, is_admin(), admin access to designs/images, public_templates, app_settings.
-- Apply after schema.sql (SQL editor or `supabase db push`). Safe to re-run.

-- 1) Admins ---------------------------------------------------------------------------------------
create table if not exists public.admins (email text primary key);
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;
drop policy if exists "admins_select_self" on public.admins;
grant select on public.admins to authenticated;
create policy "admins_select_self" on public.admins for select to authenticated
  using (lower(email) = lower(auth.jwt() ->> 'email'));
insert into public.admins (email) values ('hoaingoctruyenky74@gmail.com') on conflict do nothing;

-- Admin = JWT email is in admins AND that account's email is confirmed (checked server-side in auth.users).
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins a where lower(a.email) = lower(auth.jwt() ->> 'email'))
     and exists (select 1 from auth.users u where u.id = auth.uid()
                 and lower(u.email) = lower(auth.jwt() ->> 'email') and u.email_confirmed_at is not null);
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- 2) Designs: owner email + admin access --------------------------------------------------------
alter table public.designs add column if not exists owner_email text default (auth.jwt() ->> 'email');
create or replace function public.designs_set_updated_at() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if auth.jwt() ->> 'email' is not null then new.owner_email := auth.jwt() ->> 'email'; end if; -- cannot be forged
    if new.updated_at is null then new.updated_at := now(); end if;
    return new;
  end if;
  if new.updated_at is null or new.updated_at is not distinct from old.updated_at then new.updated_at := now(); end if;
  new.user_id := old.user_id;          -- ownership cannot be transferred (also by admins)
  new.owner_email := old.owner_email;
  return new;
end $$;
drop trigger if exists designs_updated_at on public.designs;
drop trigger if exists designs_ins_owner on public.designs;
create trigger designs_updated_at before update on public.designs for each row execute function public.designs_set_updated_at();
create trigger designs_ins_owner before insert on public.designs for each row execute function public.designs_set_updated_at();

drop policy if exists "designs_select_admin" on public.designs;
drop policy if exists "designs_update_admin" on public.designs;
create policy "designs_select_admin" on public.designs for select to authenticated using (public.is_admin());
create policy "designs_update_admin" on public.designs for update to authenticated using (public.is_admin()) with check (public.is_admin());
-- (no admin delete policy: admins soft-delete / restore via update of `deleted`)

drop policy if exists "user_images_select_admin" on storage.objects;
create policy "user_images_select_admin" on storage.objects for select to authenticated
  using (bucket_id = 'user-images' and public.is_admin());

-- 3) Public templates ------------------------------------------------------------------------------
create table if not exists public.public_templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default '',
  category    text not null default 'Mẫu từ Xưởng',
  data        jsonb not null default '{}'::jsonb,
  thumb       text,
  created_by  uuid default auth.uid(),
  updated_at  timestamptz not null default now(),
  published   boolean not null default false
);
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists public_templates_touch on public.public_templates;
create trigger public_templates_touch before update on public.public_templates for each row execute function public.touch_updated_at();
alter table public.public_templates enable row level security;
grant select on public.public_templates to anon, authenticated;
grant insert, update, delete on public.public_templates to authenticated;
drop policy if exists "tpl_select_published" on public.public_templates;
drop policy if exists "tpl_select_admin" on public.public_templates;
drop policy if exists "tpl_insert_admin" on public.public_templates;
drop policy if exists "tpl_update_admin" on public.public_templates;
drop policy if exists "tpl_delete_admin" on public.public_templates;
create policy "tpl_select_published" on public.public_templates for select to anon, authenticated using (published);
create policy "tpl_select_admin" on public.public_templates for select to authenticated using (public.is_admin());
create policy "tpl_insert_admin" on public.public_templates for insert to authenticated with check (public.is_admin());
create policy "tpl_update_admin" on public.public_templates for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "tpl_delete_admin" on public.public_templates for delete to authenticated using (public.is_admin());

-- 4) App settings ----------------------------------------------------------------------------------
create table if not exists public.app_settings (
  key        text primary key,
  value      jsonb not null default 'null'::jsonb,
  updated_at timestamptz not null default now()
);
drop trigger if exists app_settings_touch on public.app_settings;
create trigger app_settings_touch before update on public.app_settings for each row execute function public.touch_updated_at();
alter table public.app_settings enable row level security;
grant select on public.app_settings to anon, authenticated;
grant insert, update, delete on public.app_settings to authenticated;
drop policy if exists "settings_select_all" on public.app_settings;
drop policy if exists "settings_write_admin" on public.app_settings;
drop policy if exists "settings_update_admin" on public.app_settings;
drop policy if exists "settings_delete_admin" on public.app_settings;
create policy "settings_select_all" on public.app_settings for select to anon, authenticated using (true);
create policy "settings_write_admin" on public.app_settings for insert to authenticated with check (public.is_admin());
create policy "settings_update_admin" on public.app_settings for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "settings_delete_admin" on public.app_settings for delete to authenticated using (public.is_admin());
insert into public.app_settings (key, value) values
  ('accent', '"#4f46e5"'), ('app_name', '"Xưởng Thiết Kế"'), ('logo_text', '"🎨"'), ('default_font', '"Be Vietnam Pro"'),
  ('greeting', '""'), ('announcement', '""'),
  ('features', '{"ai": true, "stock": true, "bg_remove": true, "signup": true}')
on conflict (key) do nothing;
