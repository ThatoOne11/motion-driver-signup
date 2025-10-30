-- Admin helper to manually allocate Motion IDs (invocation snippet-friendly)
create schema if not exists admin;

create or replace function admin.bootstrap_allocate_super_motion_id(
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller text := session_user;
  v_exists boolean;
  v_super_motion_id text;
begin
  -- Allow only privileged DB roles to run directly
  if v_caller not in ('postgres', 'supabase_admin') then
    raise exception 'unauthorized caller: %', v_caller
      using errcode = '42501';
  end if;

  -- Ensure the user exists in public.users
  select exists(select 1 from public.users where id = p_user_id) into v_exists;
  if not v_exists then
    raise exception 'public.users row not found for id=%', p_user_id
      using errcode = '22023';
  end if;

  -- Delegate to the allocator (idempotent)
  v_super_motion_id := public.allocate_super_motion_id_for_user(p_user_id);

  return jsonb_build_object(
    'ok', true,
    'user_id', p_user_id,
    'super_motion_id', v_super_motion_id
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

alter function admin.bootstrap_allocate_super_motion_id(uuid) owner to postgres;
revoke all on function admin.bootstrap_allocate_super_motion_id(uuid) from public, anon, authenticated, service_role, supabase_auth_admin;
grant execute on function admin.bootstrap_allocate_super_motion_id(uuid) to postgres;
-- Optionally allow a curated admin role:
-- grant execute on function admin.bootstrap_allocate_super_motion_id(uuid) to supabase_admin;
