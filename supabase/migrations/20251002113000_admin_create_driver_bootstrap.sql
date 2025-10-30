-- Create an admin helper to insert a driver row into public.users
-- Inserts with role = 'driver' and profile/doc flags = false

create schema if not exists admin;

create or replace function admin.bootstrap_create_driver(
  p_user_id uuid,
  p_display_name text,
  p_email text,
  p_phone text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller text := session_user;
  v_role_id uuid;
begin
  -- Restrict execution
  if v_caller not in ('postgres', 'supabase_admin') then
    raise exception 'unauthorized caller: %', v_caller
      using errcode = '42501';
  end if;

  -- Ensure the driver role exists
  select id into v_role_id from public.roles where name = 'driver' limit 1;
  if v_role_id is null then
    insert into public.roles (name) values ('driver') returning id into v_role_id;
  end if;

  -- Insert into users (booleans default to false as requested)
  insert into public.users (
    id, display_name, email, role_id, phone_number, profile_completed, documents_uploaded
  ) values (
    p_user_id, p_display_name, p_email, v_role_id, p_phone, false, false
  );

  return jsonb_build_object(
    'ok', true,
    'message', 'driver created',
    'user_id', p_user_id,
    'role_id', v_role_id
  );
exception
  when others then
    return jsonb_build_object(
      'ok', false,
      'error', sqlerrm,
      'code', sqlstate
    );
end;
$$;

alter function admin.bootstrap_create_driver(uuid, text, text, text) owner to postgres;
revoke all on function admin.bootstrap_create_driver(uuid, text, text, text)
  from public, anon, authenticated, service_role, supabase_auth_admin;
grant execute on function admin.bootstrap_create_driver(uuid, text, text, text) to postgres;
-- Optionally: grant execute to a curated DB role you control
-- grant execute on function admin.bootstrap_create_driver(uuid, text, text, text) to supabase_admin;

