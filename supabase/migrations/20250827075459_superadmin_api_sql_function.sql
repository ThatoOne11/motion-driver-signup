-- Namespace for admin helpers (optional but tidy)
create schema if not exists admin;

-- Creates a superadmin row in public.users for an existing auth user.
-- Only executable by postgres (and optionally a custom DB role).
create or replace function admin.bootstrap_create_superadmin(
  p_user_id uuid,
  p_display_name text default null
)
returns jsonb
language plpgsql
security definer          -- run with the definer's privileges (owner: postgres)
set search_path = public  -- avoid search_path hijacking
as $$
declare
  v_caller text := session_user;          -- who is calling
  v_email  text;
  v_role_id uuid;
  result jsonb := jsonb_build_object('ok', false);
begin
  -- 1) Gate: only allow specific DB roles to run this (no app JWT involved)
  if v_caller not in ('postgres', 'supabase_admin') then
    raise exception 'unauthorized caller: %', v_caller
      using errcode = '42501'; -- insufficient_privilege
  end if;

  -- 2) Ensure the auth user exists
  select email
    into v_email
  from auth.users
  where id = p_user_id;

  if v_email is null then
    raise exception 'auth.users row not found for id=%', p_user_id
      using errcode = '22023'; -- invalid_parameter_value
  end if;

  -- 3) Ensure not already present in public.users
  if exists (select 1 from public.users where id = p_user_id) then
    raise exception 'public.users already contains id=%', p_user_id
      using errcode = '23505'; -- unique_violation-ish signalling
  end if;

  -- 4) Ensure a superadmin role exists (accepts "superadmin" or "super-admin")
  select id
    into v_role_id
  from public.roles
  where name in ('superadmin','super-admin')
  limit 1;

  if v_role_id is null then
    -- create it if missing
    insert into public.roles (name)
    values ('superadmin')
    returning id into v_role_id;
  end if;

  -- 5) Insert into public.users
  insert into public.users (id, display_name, email, role_id, phone_number, documents_uploaded, profile_completed)
  values (p_user_id, p_display_name, v_email, v_role_id, '0111234567', true, true);

  result := jsonb_build_object(
    'ok', true,
    'message', 'superadmin created',
    'user_id', p_user_id,
    'email', v_email,
    'role_id', v_role_id
  );
  return result;
exception
  when others then
    return jsonb_build_object(
      'ok', false,
      'error', sqlerrm,
      'code', sqlstate
    );
end
$$;

-- Lock it down: owner + grants
alter function admin.bootstrap_create_superadmin(uuid, text) owner to postgres;

-- Optional: create a dedicated DB role you can grant to trusted humans/tools
-- create role supabase_admin noinherit;
-- grant supabase_admin to postgres; -- postgres already superuser; example only

revoke all on function admin.bootstrap_create_superadmin(uuid, text) from public, anon, authenticated, service_role, supabase_auth_admin;
grant execute on function admin.bootstrap_create_superadmin(uuid, text) to postgres;
-- If you created a dedicated role: grant execute to it as well:
-- grant execute on function admin.bootstrap_create_superadmin(uuid, text) to supabase_admin;