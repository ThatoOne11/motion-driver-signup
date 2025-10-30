-- Driver documents and document types
-- Safe to run multiple times; uses IF NOT EXISTS where applicable

-- Document types lookup table
create table if not exists public.document_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true
);

-- Driver documents table
create table if not exists public.driver_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  document_storage_path text not null,
  document_type_id uuid not null references public.document_types(id) on delete restrict,
  created_at timestamptz not null default now(),
  active boolean not null default true
);

-- Helpful indexes
do $$
begin
  if not exists (
    select 1 from pg_indexes where schemaname='public' and indexname='idx_driver_documents_user'
  ) then
    create index idx_driver_documents_user on public.driver_documents(user_id);
  end if;
  if not exists (
    select 1 from pg_indexes where schemaname='public' and indexname='idx_driver_documents_type'
  ) then
    create index idx_driver_documents_type on public.driver_documents(document_type_id);
  end if;
end$$;

-- Enable RLS
alter table public.document_types enable row level security;
alter table public.driver_documents enable row level security;

-- Policies: document_types readable by authenticated users
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='document_types' and policyname='document_types_select_authenticated'
  ) then
    create policy document_types_select_authenticated
      on public.document_types
      for select
      to authenticated
      using (true);
  end if;
end$$;

-- Policies: driver_documents only accessible by owner; service_role full access
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='driver_documents' and policyname='driver_documents_owner_all'
  ) then
    create policy driver_documents_owner_all
      on public.driver_documents
      for all
      to authenticated
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='driver_documents' and policyname='driver_documents_all_service_role'
  ) then
    create policy driver_documents_all_service_role
      on public.driver_documents
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end$$;
