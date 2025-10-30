insert into public.roles
    (name)
values
    ('inspector')
on conflict
(name) do nothing;