-- Create table to persist OCR extraction results per uploaded document
create table if not exists public.document_upload_extraction (
  id uuid primary key default gen_random_uuid(),
  driver_document_id uuid not null references public.driver_documents(id) on delete cascade,
  document_type_id uuid not null references public.document_types(id),
  user_id uuid not null references public.users(id) on delete cascade,
  fields_json jsonb not null default '{}'::jsonb,
  raw_text text,
  created_at timestamptz not null default now(),
  active boolean not null default true
);

-- Ensure one extraction record per driver_document row
create unique index if not exists uq_document_upload_extraction_driver_doc
  on public.document_upload_extraction(driver_document_id);

-- Helpful index for querying by user
create index if not exists idx_document_upload_extraction_user
  on public.document_upload_extraction(user_id);

-- RLS optional: allow service role only; edge function uses service key
alter table public.document_upload_extraction enable row level security;
-- Allow users to select their own extraction rows

drop policy if exists "Select own extractions" on public.document_upload_extraction;

create policy "Select own extractions" on public.document_upload_extraction
  for select using (user_id = auth.uid());
