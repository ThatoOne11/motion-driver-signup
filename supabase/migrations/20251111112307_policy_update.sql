drop policy if exists "Read for all on inspector options" on public.inspector_options;

drop policy if exists "Read for all" on public.inspector_options;

create policy "Read for all on inspector options" on "public"."inspector_options" as permissive for
select
  to public using (true);