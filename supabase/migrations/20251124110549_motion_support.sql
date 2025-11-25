create table
    if not exists public.motion_support (
        id uuid primary key default gen_random_uuid (),
        phone_number text not null unique
    );

alter table public.motion_support enable row level security;

insert into
    public.motion_support (phone_number)
values
    ('+27823626215') on conflict (phone_number) do nothing;