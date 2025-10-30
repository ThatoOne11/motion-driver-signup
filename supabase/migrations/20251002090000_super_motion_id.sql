-- Superbase Motion ID infrastructure: MYYNNNN (e.g., M250000)
-- - YY: two-digit year
-- - NNNN: zero-padded counter per year (0..9999)

-- 1) Add columns to users to store Motion ID and Airtable record id
alter table public.users
  add column if not exists super_motion_id text,
  add column if not exists airtable_record_id text,
  add column if not exists airtable_motion_id text;

-- Unique indexes for identifiers
do $$
begin
  if not exists (
    select 1 from pg_indexes where schemaname='public' and indexname='idx_users_super_motion_id_unique'
  ) then
    create unique index idx_users_super_motion_id_unique on public.users (super_motion_id);
  end if;

  if not exists (
    select 1 from pg_indexes where schemaname='public' and indexname='idx_users_airtable_record_unique'
  ) then
    create unique index idx_users_airtable_record_unique on public.users (airtable_record_id);
  end if;
end$$;

-- 2) Yearly counter table
create table if not exists public.super_motion_id_counters (
  year smallint primary key,
  next_serial integer not null default 0,
  updated_at timestamptz not null default now()
);

-- 3) Function to allocate a Motion ID once per user, concurrency-safe
create or replace function public.allocate_super_motion_id_for_user(target_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing text;
  v_year smallint;
  v_serial integer;
  v_super_motion_id text;
begin
  -- Lock the user row; if already has a super_motion_id, return it.
  select super_motion_id into v_existing
  from public.users
  where id = target_user_id
  for update;

  if v_existing is not null then
    return v_existing;
  end if;

  -- Compute two-digit year (YY)
  v_year := (extract(year from now())::int % 100)::smallint;

  -- Ensure counter row exists for this year
  insert into public.super_motion_id_counters(year, next_serial)
  values (v_year, 0)
  on conflict (year) do nothing;

  -- Atomically allocate the current serial (start from 1) and increment for next time
  update public.super_motion_id_counters
     set next_serial = next_serial + 1,
         updated_at = now()
   where year = v_year
  returning next_serial into v_serial;

  if v_serial is null then
    raise exception 'Failed to allocate Super Motion ID serial';
  end if;

  if v_serial > 9999 then
    raise exception 'Yearly Super Motion ID limit reached for year %', v_year;
  end if;

  -- Format: MYYNNNN
  v_super_motion_id := 'M' || lpad(v_year::text, 2, '0') || lpad(v_serial::text, 4, '0');

  -- Persist if still empty (another concurrent call might have set it already)
  update public.users
     set super_motion_id = v_super_motion_id
   where id = target_user_id
     and super_motion_id is null;

  return v_super_motion_id;
end;
$$;

-- Ownership & privileges
alter function public.allocate_super_motion_id_for_user(uuid) owner to postgres;
revoke all on function public.allocate_super_motion_id_for_user(uuid) from public, anon, authenticated;
grant execute on function public.allocate_super_motion_id_for_user(uuid) to service_role;
