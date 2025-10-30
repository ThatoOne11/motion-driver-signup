-- Storage bucket + RLS policies for driver document uploads
-- Bucket: driver-document-uploads (private)

do $$
begin
insert into storage.buckets (id, name, public)
values ('driver-document-uploads', 'driver-document-uploads', false)
on conflict (id) do nothing;
end$$;

-- NOTE: RLS on storage.objects is already enabled by default in Supabase Storage.
-- Attempting to ALTER the table fails unless you are the storage schema owner,
-- so we do not alter it here.

-- Idempotent policy resets
drop policy if exists driver_docs_read on storage.objects;
drop policy if exists driver_docs_insert on storage.objects;
drop policy if exists driver_docs_update on storage.objects;
drop policy if exists driver_docs_delete on storage.objects;
drop policy if exists driver_docs_service_role_all on storage.objects;

-- READ: authenticated users can read only their own files in this bucket
create policy driver_docs_read
on storage.objects
for select
to authenticated
using (
bucket_id = 'driver-document-uploads'
and name like ('user/' || auth.uid() || '/%')
);

-- INSERT: authenticated users can upload only under user/{uid}/...
create policy driver_docs_insert
on storage.objects
for insert
to authenticated
with check (
bucket_id = 'driver-document-uploads'
and name like ('user/' || auth.uid() || '/%')
);

-- UPDATE: authenticated users can update only their own files
create policy driver_docs_update
on storage.objects
for update
to authenticated
using (
bucket_id = 'driver-document-uploads'
and name like ('user/' || auth.uid() || '/%')
)
with check (
bucket_id = 'driver-document-uploads'
and name like ('user/' || auth.uid() || '/%')
);

-- DELETE: authenticated users can delete only their own files
create policy driver_docs_delete
on storage.objects
for delete
to authenticated
using (
bucket_id = 'driver-document-uploads'
and name like ('user/' || auth.uid() || '/%')
);

-- Service role: full access (for edge functions/admin)
create policy driver_docs_service_role_all
on storage.objects
for all
to service_role
using (true)
with check (true);