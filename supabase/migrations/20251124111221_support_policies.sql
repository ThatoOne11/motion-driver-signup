drop policy if exists "Allow all for service" on public.motion_support;

drop policy if exists "Allow select for authenticated" on public.motion_support;

drop policy if exists "Allow select for authenticated" on public.motion_support;

drop policy if exists "Allow select for authenticated on support" on public.motion_support;

drop policy if exists "Allow select for anon on support" on public.motion_support;

create policy "Allow all for service on support" on "public"."motion_support" as permissive for all to service_role using (true);