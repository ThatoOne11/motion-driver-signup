-- Update admin.bootstrap_create_driver to also allocate super_motion_id
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
  v_super_motion_id text;
begin
  -- Restrict execution to trusted roles
  if v_caller not in ('postgres', 'supabase_admin') then
    raise exception 'unauthorized caller: %', v_caller using errcode = '42501';
  end if;

  -- Ensure driver role exists
  select id into v_role_id from public.roles where name = 'driver' limit 1;
  if v_role_id is null then
    insert into public.roles (name) values ('driver') returning id into v_role_id;
  end if;

  -- Insert user row (flags false as requested)
  insert into public.users (
    id, display_name, email, role_id, phone_number, profile_completed, documents_uploaded
  ) values (
    p_user_id, p_display_name, p_email, v_role_id, p_phone, false, false
  ) on conflict (id) do nothing;

  -- Allocate Motion ID (MYYNNNN) via server-side function
  v_super_motion_id := public.allocate_super_motion_id_for_user(p_user_id);

  -- Persist Motion ID on users
  update public.users
     set super_motion_id = v_super_motion_id
   where id = p_user_id
     and (super_motion_id is null or super_motion_id = v_super_motion_id);

  return jsonb_build_object(
    'ok', true,
    'message', 'driver created',
    'user_id', p_user_id,
    'role_id', v_role_id,
    'super_motion_id', v_super_motion_id
  );
exception
  when others then
    return jsonb_build_object('ok', false, 'error', sqlerrm, 'code', sqlstate);
end;
$$;

alter function admin.bootstrap_create_driver(uuid, text, text, text) owner to postgres;
revoke all on function admin.bootstrap_create_driver(uuid, text, text, text)
  from public, anon, authenticated, service_role, supabase_auth_admin;
grant execute on function admin.bootstrap_create_driver(uuid, text, text, text) to postgres;
-- grant execute on function admin.bootstrap_create_driver(uuid, text, text, text) to supabase_admin;

