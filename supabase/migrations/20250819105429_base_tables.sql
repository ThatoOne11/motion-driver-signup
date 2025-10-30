

-- Base tables and JWT hook for Motion Ads
-- Safe to run multiple times; uses IF NOT EXISTS where possible

-- Extensions -------------------------------------------------------------------
create extension if not exists "pgcrypto" with schema "extensions";

-- SCHEMA USAGE FOR AUTH HOOK ADMIN ---------------------------------------------
grant usage on schema public to supabase_auth_admin;

-- ROLES TABLE ------------------------------------------------------------------
create table if not exists public.roles (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique
);

-- USERS TABLE ------------------------------------------------------------------
-- Note: `auth.users` is managed by Supabase Auth. This table stores app profile/role.
create table if not exists public.users (
  id                  uuid primary key references auth.users(id) on delete cascade,
  display_name        text not null,
  email               text not null unique,
  created_at          timestamptz not null default now(),
  role_id             uuid not null references public.roles(id) on delete set null,
  phone_number        text not null unique,
  profile_completed   boolean not null,
  documents_uploaded  boolean not null
);

-- Helpful indexes ---------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_indexes where schemaname='public' and indexname='idx_users_email') then
    create unique index idx_users_email on public.users (email);
  end if;
end$$;

-- Enable RLS -------------------------------------------------------------------
alter table public.roles enable row level security;
alter table public.users enable row level security;

-- Policies: ROLES ---------------------------------------------------------------
-- Read roles: all authenticated users may read available roles
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'roles' and policyname = 'roles_select_authenticated'
  ) then
    create policy "roles_select_authenticated"
      on public.roles
      for select
      to authenticated
      using (true);
  end if;

  -- Admins can insert/update/delete roles (based on JWT claim `user_role`)
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'roles' and policyname = 'roles_write_admins'
  ) then
    create policy "roles_write_admins"
      on public.roles
      for all
      to authenticated
      using ( (auth.jwt() ->> 'user_role') = any (array['admin','superadmin']) )
      with check ( (auth.jwt() ->> 'user_role') = any (array['admin','superadmin']) );
  end if;
end
$$;

-- Policies: USERS ---------------------------------------------------------------
-- Read users: all authenticated users may read user records
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'users' and policyname = 'users_select_authenticated'
  ) then
    create policy "users_select_authenticated"
      on public.users
      for select
      to authenticated
      using (true);
  end if;

  -- Admins can insert new users (profiles) and update users
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'users' and policyname = 'users_write_admins'
  ) then
    create policy "users_write_admins"
      on public.users
      for all
      to authenticated
      using ( (auth.jwt() ->> 'user_role') = any (array['admin','superadmin']) )
      with check ( (auth.jwt() ->> 'user_role') = any (array['admin','superadmin']) );
  end if;

  -- (Optional) Allow service_role to bypass RLS for seeding/edge functions
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'users' and policyname = 'users_all_service_role'
  ) then
    create policy "users_all_service_role"
      on public.users
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end
$$;

-- AUTH HOOK: add user_role and display_name to JWT ------------------------------
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  claims jsonb := coalesce(event->'claims', '{}'::jsonb);
  v_role text;
  v_display_name text;
begin
  -- Find role/display_name for the authenticated user (if a public.users row exists)
  select r.name, u.display_name
    into v_role, v_display_name
  from public.users u
  left join public.roles r on r.id = u.role_id
  where u.id = (event->>'user_id')::uuid;

  -- Write into JWT claims (allow explicit null)
  claims := jsonb_set(claims, '{user_role}',    coalesce(to_jsonb(v_role), 'null'::jsonb), true);
  claims := jsonb_set(claims, '{display_name}', coalesce(to_jsonb(v_display_name), 'null'::jsonb), true);

  return jsonb_set(event, '{claims}', claims, true);
end;
$$;

-- Function ownership and grants (so GoTrue can execute it) ----------------------
alter function public.custom_access_token_hook(jsonb) owner to postgres;

grant execute
  on function public.custom_access_token_hook(jsonb)
  to supabase_auth_admin;

revoke execute
  on function public.custom_access_token_hook(jsonb)
  from authenticated, anon, public;

-- END OF MIGRATION --------------------------------------------------------------
