-- Drop old policies
drop policy if exists "users_all_service_role" on "public"."users";

drop policy if exists "users_select_authenticated" on "public"."users";

drop policy if exists "users_write_admins" on "public"."users";

drop policy if exists "roles_write_admins" on "public"."roles";

drop policy if exists "roles_select_authenticated" on "public"."roles";

-- Read access for everyone
create policy "Enable read access for all users"
on "public"."users"
for select
to public
using (true);

-- Admins & superadmins can do everything on users
create policy "Enable all for admin and superadmin users on users"
on "public"."users"
for all
to authenticated
using ( (auth.jwt() ->> 'user_role') = ANY (ARRAY['admin','superadmin']) )
with check ( (auth.jwt() ->> 'user_role') = ANY (ARRAY['admin','superadmin']) );

--select access on public roles
create policy "Enable authenticated select access on roles"
on "public"."roles"
for select
to authenticated
using (true);
