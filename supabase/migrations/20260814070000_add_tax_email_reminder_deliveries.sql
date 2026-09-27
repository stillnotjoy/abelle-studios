create table if not exists public.bir_tax_reminder_deliveries (
  id uuid primary key default gen_random_uuid(),
  obligation_id uuid not null references public.bir_tax_obligations(id) on delete cascade,
  channel text not null default 'EMAIL' check (channel in ('EMAIL')),
  reminder_key text not null unique,
  recipient text not null,
  reminder_type text not null,
  reminder_level text not null,
  scheduled_for date not null,
  sent_at timestamptz not null default now(),
  provider_reference text,
  status text not null default 'SENT' check (status in ('SENT','FAILED')),
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists bir_tax_reminder_deliveries_obligation_idx
  on public.bir_tax_reminder_deliveries (obligation_id);

create index if not exists bir_tax_reminder_deliveries_schedule_idx
  on public.bir_tax_reminder_deliveries (scheduled_for, channel, status);

alter table public.bir_tax_reminder_deliveries enable row level security;

revoke all on public.bir_tax_reminder_deliveries from anon, authenticated;

grant all on public.bir_tax_reminder_deliveries to service_role;
