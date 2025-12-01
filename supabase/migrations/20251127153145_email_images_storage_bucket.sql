-- Create the storage bucket for email assets
insert into storage.buckets (id, name, public)
values ('email-assets', 'email-assets', true);

-- Allow public access to read files (images)
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'email-assets' );

-- Allow authenticated users (like admins) to upload files
create policy "Authenticated Insert"
  on storage.objects for insert
  to authenticated
  with check ( bucket_id = 'email-assets' );