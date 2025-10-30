alter table public.driver_documents
add column if not exists extraction_data_error boolean not null default false;