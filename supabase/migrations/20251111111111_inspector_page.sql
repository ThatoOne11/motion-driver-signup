create table
    if not exists public.inspector_options (
        id uuid primary key default gen_random_uuid (),
        active boolean not null default true,
        name text not null unique
    );

alter table public.inspector_options enable row level security;