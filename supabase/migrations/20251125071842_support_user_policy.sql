create policy "Allow select for authenticated on support" on "public"."motion_support" as permissive for
select
    to authenticated using (true);

create policy "Allow select for anon on support" on "public"."motion_support" as permissive for
select
    to anon using (true);