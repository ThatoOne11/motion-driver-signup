-- Static lookup tables for driver sign-up form
create table if not exists public.platforms (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true
);

create table if not exists public.provinces (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table if not exists public.cities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  province_id uuid references public.provinces(id) on delete set null,
  constraint cities_name_province_unique unique (name, province_id)
);

create table if not exists public.bike_ownership_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table if not exists public.years_driving_options (
  id uuid primary key default gen_random_uuid(),
  label text not null unique
);

create table if not exists public.days_per_week_options (
  value integer primary key
  
);

-- suburbs table prepared but unseeded for now
create table if not exists public.suburbs (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text not null,
  city_id uuid references public.cities(id) on delete set null,
  active boolean not null default true
);

-- Enable RLS and allow authenticated read access to lookup tables
do $$
begin
  -- platforms
  alter table public.platforms enable row level security;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='platforms' and policyname='platforms_select_authenticated'
  ) then
    create policy platforms_select_authenticated on public.platforms for select to authenticated using (true);
  end if;


  -- provinces
  alter table public.provinces enable row level security;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='provinces' and policyname='provinces_select_authenticated'
  ) then
    create policy provinces_select_authenticated on public.provinces for select to authenticated using (true);
  end if;

  -- cities
  alter table public.cities enable row level security;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='cities' and policyname='cities_select_authenticated'
  ) then
    create policy cities_select_authenticated on public.cities for select to authenticated using (true);
  end if;

  -- bike ownership types
  alter table public.bike_ownership_types enable row level security;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='bike_ownership_types' and policyname='bot_select_authenticated'
  ) then
    create policy bot_select_authenticated on public.bike_ownership_types for select to authenticated using (true);
  end if;

  -- years driving
  alter table public.years_driving_options enable row level security;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='years_driving_options' and policyname='ydo_select_authenticated'
  ) then
    create policy ydo_select_authenticated on public.years_driving_options for select to authenticated using (true);
  end if;

  -- days per week
  alter table public.days_per_week_options enable row level security;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='days_per_week_options' and policyname='dpwo_select_authenticated'
  ) then
    create policy dpwo_select_authenticated on public.days_per_week_options for select to authenticated using (true);
  end if;

  -- suburbs
  alter table public.suburbs enable row level security;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='suburbs' and policyname='suburbs_select_authenticated'
  ) then
    create policy suburbs_select_authenticated on public.suburbs for select to authenticated using (true);
  end if;
end$$;
