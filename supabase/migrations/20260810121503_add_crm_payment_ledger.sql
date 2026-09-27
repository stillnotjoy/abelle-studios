create table if not exists public.crm_payment_transactions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.manual_bookings(id) on delete set null,
  booking_reference text not null,
  client_name text,
  package_title text,
  payment_date timestamptz not null default now(),
  amount numeric(12,2) not null check (amount > 0),
  transaction_type text not null default 'PAYMENT'
    check (transaction_type in ('PAYMENT', 'REFUND')),
  payment_method text not null default 'UNKNOWN',
  payment_provider text,
  payment_reference text,
  source text not null default 'MANUAL_PAYMENT'
    check (source in (
      'HISTORICAL_OPENING_BALANCE',
      'INITIAL_MANUAL_PAYMENT',
      'MANUAL_PAYMENT',
      'ONLINE_PAYMENT',
      'ADJUSTMENT'
    )),
  notes text,
  idempotency_key text unique,
  created_at timestamptz not null default now()
);

alter table public.crm_payment_transactions enable row level security;

revoke all on table public.crm_payment_transactions from anon, authenticated;
grant select, insert, update, delete on table public.crm_payment_transactions to service_role;

create index if not exists crm_payment_transactions_payment_date_idx
  on public.crm_payment_transactions (payment_date desc);

create index if not exists crm_payment_transactions_booking_id_idx
  on public.crm_payment_transactions (booking_id);

create index if not exists crm_payment_transactions_booking_reference_idx
  on public.crm_payment_transactions (booking_reference);

insert into public.crm_payment_transactions (
  booking_id,
  booking_reference,
  client_name,
  package_title,
  payment_date,
  amount,
  transaction_type,
  payment_method,
  payment_provider,
  payment_reference,
  source,
  notes,
  idempotency_key
)
select
  booking.id,
  booking.booking_reference,
  booking.client_name,
  booking.package_title,
  booking.shoot_date::timestamp at time zone 'Asia/Manila',
  booking.amount_paid,
  'PAYMENT',
  case
    when lower(coalesce(booking.payment_provider, '')) = 'cash' then 'CASH'
    when lower(coalesce(booking.payment_provider, '')) = 'gcash' then 'GCASH'
    when lower(coalesce(booking.payment_provider, '')) = 'paymongo' then 'ONLINE'
    else 'UNKNOWN'
  end,
  booking.payment_provider,
  booking.payment_reference,
  'HISTORICAL_OPENING_BALANCE',
  'Opening payment total imported from the existing booking record. Its date uses the shoot date because the original transaction date was not stored in the CRM.',
  'historical-opening:' || booking.id::text
from public.manual_bookings as booking
where booking.amount_paid > 0
on conflict (idempotency_key) do nothing;
