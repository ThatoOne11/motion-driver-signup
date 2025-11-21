insert into
    public.inspector_options (name)
values
    ('Name'),
    ('Email Address'),
    ('Motion ID') on conflict (name) do nothing;