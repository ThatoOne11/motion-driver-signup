create table
  if not exists public.twilio_message_fallback (
    message_sid text primary key,
    to_e164 text not null,
    sms_body text not null,
    sent boolean not null default false,
    created_at timestamptz not null default now ()
  );

alter table public.twilio_message_fallback enable row level security;