create table if not exists public.bir_business_profile (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  registration_date date not null,
  taxpayer_type text not null,
  rdo_code text,
  income_tax_method text not null default 'GRADUATED_OSD',
  eight_percent_option boolean not null default false,
  rent_monthly numeric(12,2) not null default 0 check (rent_monthly >= 0),
  default_rent_ewt_rate numeric(7,4) not null default 0 check (default_rent_ewt_rate between 0 and 1),
  registered_forms text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bir_tax_obligations (
  id uuid primary key default gen_random_uuid(),
  form_code text not null,
  tax_type text not null,
  period_key text not null,
  period_label text not null,
  period_start date not null,
  period_end date not null,
  original_due_date date not null,
  adjusted_due_date date,
  adjusted_due_reason text,
  filing_status text not null default 'UPCOMING' check (
    filing_status in ('UPCOMING','DUE_SOON','DUE_TODAY','OVERDUE','PREPARED','FILED','COMPLETED')
  ),
  payment_status text not null default 'FOR_VERIFICATION' check (
    payment_status in ('NO_PAYMENT_REQUIRED','PAYMENT_PENDING','PARTIALLY_PAID','PAID','FOR_VERIFICATION')
  ),
  system_gross_sales numeric(14,2) not null default 0 check (system_gross_sales >= 0),
  tax_declared_gross_sales numeric(14,2) check (tax_declared_gross_sales >= 0),
  amount_calculated numeric(14,2) not null default 0 check (amount_calculated >= 0),
  amount_due numeric(14,2) not null default 0 check (amount_due >= 0),
  amount_paid numeric(14,2) not null default 0 check (amount_paid >= 0),
  estimated_penalties numeric(14,2) not null default 0 check (estimated_penalties >= 0),
  penalty_status text not null default 'NOT_ESTIMATED' check (
    penalty_status in ('NOT_ESTIMATED','ESTIMATED_FOR_BIR_VERIFICATION','CONFIRMED')
  ),
  calculation_method text,
  calculation_breakdown jsonb not null default '{}'::jsonb,
  prepared_at timestamptz,
  filed_at timestamptz,
  final_declared_amount numeric(14,2) check (final_declared_amount >= 0),
  filing_confirmation_reference text,
  paid_at timestamptz,
  payment_method text,
  payment_reference text,
  notes text,
  source_reference text,
  historical_locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (form_code, period_key),
  check (period_end >= period_start),
  check (adjusted_due_date is null or adjusted_due_date >= original_due_date)
);

create table if not exists public.bir_deadline_adjustments (
  id uuid primary key default gen_random_uuid(),
  circular_number text not null unique,
  circular_date date not null,
  description text not null,
  original_deadline date not null,
  extended_deadline date not null,
  applicable_forms text[] not null default '{}',
  applicable_rdos_areas text,
  applicability_status text not null default 'PENDING_VERIFICATION' check (
    applicability_status in ('PENDING_VERIFICATION','APPLICABLE','NOT_APPLICABLE')
  ),
  verification_status text not null default 'PENDING_VERIFICATION' check (
    verification_status in ('PENDING_VERIFICATION','VERIFIED','REJECTED')
  ),
  notes text,
  source_reference text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (extended_deadline >= original_deadline)
);

create table if not exists public.bir_tax_expenses (
  id uuid primary key default gen_random_uuid(),
  expense_date date not null,
  supplier_payee text not null,
  description text not null,
  category text not null,
  gross_amount numeric(14,2) not null check (gross_amount >= 0),
  receipt_invoice_reference text,
  withholding_applicable boolean,
  withholding_status text not null default 'FOR_VERIFICATION' check (
    withholding_status in ('NOT_APPLICABLE','FOR_VERIFICATION','CONFIRMED','WITHHELD','REMITTED')
  ),
  ewt_rate numeric(7,4) not null default 0 check (ewt_rate between 0 and 1),
  ewt_amount numeric(14,2) not null default 0 check (ewt_amount >= 0),
  net_amount_paid numeric(14,2) not null default 0 check (net_amount_paid >= 0),
  tax_period text not null,
  recurring_key text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (recurring_key, expense_date)
);

create table if not exists public.bir_tax_payments (
  id uuid primary key default gen_random_uuid(),
  obligation_id uuid not null references public.bir_tax_obligations(id) on delete restrict,
  payment_date timestamptz not null,
  amount numeric(14,2) not null check (amount > 0),
  payment_method text not null,
  payment_reference text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.bir_tax_audit_log (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  changed_by uuid,
  old_values jsonb,
  new_values jsonb,
  change_notes text,
  created_at timestamptz not null default now()
);

create index if not exists bir_tax_obligations_due_date_idx
  on public.bir_tax_obligations (original_due_date, filing_status);
create index if not exists bir_tax_obligations_period_idx
  on public.bir_tax_obligations (period_start, period_end);
create index if not exists bir_tax_expenses_date_idx
  on public.bir_tax_expenses (expense_date, category);
create index if not exists bir_tax_payments_obligation_id_idx
  on public.bir_tax_payments (obligation_id);
create index if not exists bir_tax_audit_entity_idx
  on public.bir_tax_audit_log (entity_type, entity_id, created_at desc);

alter table public.bir_business_profile enable row level security;
alter table public.bir_tax_obligations enable row level security;
alter table public.bir_deadline_adjustments enable row level security;
alter table public.bir_tax_expenses enable row level security;
alter table public.bir_tax_payments enable row level security;
alter table public.bir_tax_audit_log enable row level security;

revoke all on public.bir_business_profile from anon, authenticated;
revoke all on public.bir_tax_obligations from anon, authenticated;
revoke all on public.bir_deadline_adjustments from anon, authenticated;
revoke all on public.bir_tax_expenses from anon, authenticated;
revoke all on public.bir_tax_payments from anon, authenticated;
revoke all on public.bir_tax_audit_log from anon, authenticated;

grant all on public.bir_business_profile to service_role;
grant all on public.bir_tax_obligations to service_role;
grant all on public.bir_deadline_adjustments to service_role;
grant all on public.bir_tax_expenses to service_role;
grant all on public.bir_tax_payments to service_role;
grant all on public.bir_tax_audit_log to service_role;

insert into public.bir_business_profile (
  business_name, registration_date, taxpayer_type, income_tax_method,
  rdo_code, eight_percent_option, rent_monthly, default_rent_ewt_rate,
  registered_forms, notes
)
select
  'Abelle Photography and Videography Services', '2026-05-14',
  'Single Proprietorship Only - Resident Citizen', 'GRADUATED_OSD',
  '073', false, 5000, 0.05,
  array['1701Q','1701/1701A/1701MS','2551Q','0619-E','1601-EQ','1604-E'],
  'Tax compliance tracker and estimator. Filing and payment require manual confirmation.'
where not exists (select 1 from public.bir_business_profile);

insert into public.bir_tax_obligations (
  form_code, tax_type, period_key, period_label, period_start, period_end,
  original_due_date, filing_status, payment_status, system_gross_sales,
  tax_declared_gross_sales, amount_calculated, amount_due, amount_paid,
  calculation_method, calculation_breakdown, filed_at, final_declared_amount,
  paid_at, payment_method, notes, historical_locked
)
values
  ('0619-E','Expanded Withholding Tax','2026-05','May 2026','2026-05-14','2026-05-31',
   '2026-06-10','COMPLETED','PAID',0,0,250,250,250,'5% of studio rent',
   '{"rent":5000,"ewt_rate":0.05,"ewt":250}'::jsonb,'2026-06-10 12:00:00+08',250,
   '2026-06-10 12:00:00+08','MANUAL_CONFIRMATION','Filed and paid June 10, 2026.',true),
  ('2551Q','Quarterly Percentage Tax','2026-Q2','Q2 2026','2026-05-14','2026-06-30',
   '2026-07-25','OVERDUE','PAYMENT_PENDING',2796,2796,83.88,83.88,0,'3% of tax-declared gross sales',
   '{"gross_sales":2796,"percentage_tax_rate":0.03,"basic_tax":83.88}'::jsonb,null,null,
   null,null,'Estimated basic tax only. Penalties are not included or confirmed.',false),
  ('1601-EQ','Quarterly Expanded Withholding Tax','2026-Q2','Q2 2026','2026-05-14','2026-06-30',
   '2026-07-31','OVERDUE','PAYMENT_PENDING',0,0,500,250,0,'5% of confirmed Q2 studio rent less prior monthly remittance',
   '{"rent":10000,"ewt_rate":0.05,"quarter_ewt":500,"prior_0619e_remittance":250,"estimated_remaining":250}'::jsonb,
   null,null,null,null,'Estimated remaining amount requires return preparation and reconciliation.',false),
  ('1701Q','Quarterly Individual Income Tax','2026-Q2','Q2 2026','2026-05-14','2026-06-30',
   '2026-08-15','DUE_SOON','NO_PAYMENT_REQUIRED',2796,2796,0,0,0,'Graduated income tax using 40% Optional Standard Deduction',
   '{"gross_sales":2796,"osd_rate":0.40,"osd":1118.40,"taxable_business_income":1677.60,"estimated_income_tax":0}'::jsonb,
   null,null,null,null,'RMC 089-2026 extension is pending applicability verification. Statutory deadline remains active.',false),
  ('2551Q','Quarterly Percentage Tax','2026-Q3','Q3 2026','2026-07-01','2026-09-30',
   '2026-10-25','UPCOMING','FOR_VERIFICATION',0,null,0,0,0,'3% of reviewed tax-declared gross sales','{}'::jsonb,
   null,null,null,null,'System sales will update from the CRM. Review before preparation.',false),
  ('1701Q','Quarterly Individual Income Tax','2026-Q3','Q3 2026','2026-07-01','2026-09-30',
   '2026-11-15','UPCOMING','FOR_VERIFICATION',0,null,0,0,0,'Graduated income tax using 40% Optional Standard Deduction','{}'::jsonb,
   null,null,null,null,'System sales will update from the CRM. Review before preparation.',false),
  ('1601-EQ','Quarterly Expanded Withholding Tax','2026-Q3','Q3 2026','2026-07-01','2026-09-30',
   '2026-10-31','UPCOMING','FOR_VERIFICATION',0,null,0,0,0,'Reconcile confirmed withholding transactions for the quarter','{}'::jsonb,
   null,null,null,null,'No payable amount is assumed until withholding transactions are confirmed.',false),
  ('2551Q','Quarterly Percentage Tax','2026-Q4','Q4 2026','2026-10-01','2026-12-31',
   '2027-01-25','UPCOMING','FOR_VERIFICATION',0,null,0,0,0,'3% of reviewed tax-declared gross sales','{}'::jsonb,
   null,null,null,null,'System sales will update from the CRM. Review before preparation.',false),
  ('1601-EQ','Quarterly Expanded Withholding Tax','2026-Q4','Q4 2026','2026-10-01','2026-12-31',
   '2027-01-31','UPCOMING','FOR_VERIFICATION',0,null,0,0,0,'Reconcile confirmed withholding transactions for the quarter','{}'::jsonb,
   null,null,null,null,'No payable amount is assumed until withholding transactions are confirmed.',false),
  ('1604-E','Annual Expanded Withholding Tax Information Return','2026-ANNUAL','Calendar Year 2026','2026-05-14','2026-12-31',
   '2027-03-01','UPCOMING','NO_PAYMENT_REQUIRED',0,null,0,0,0,'Annual information return of EWT transactions','{}'::jsonb,
   null,null,null,null,'Information return; filing still requires manual confirmation.',false),
  ('1701/1701A/1701MS','Annual Individual Income Tax','2026-ANNUAL','Calendar Year 2026','2026-05-14','2026-12-31',
   '2027-04-15','UPCOMING','FOR_VERIFICATION',0,null,0,0,0,'Annual graduated income tax reconciliation','{}'::jsonb,
   null,null,null,null,'Final annual return form and figures require reconciliation.',false)
on conflict (form_code, period_key) do nothing;

insert into public.bir_tax_obligations (
  form_code, tax_type, period_key, period_label, period_start, period_end,
  original_due_date, filing_status, payment_status, amount_calculated,
  amount_due, calculation_method, notes, source_reference
)
values
  ('0619-E','Monthly Expanded Withholding Tax','2026-07','July 2026','2026-07-01','2026-07-31','2026-08-10','OVERDUE','FOR_VERIFICATION',0,0,'Applicable withholding transactions only','Verify whether any July withholding transaction requires filing; no payable is assumed.','Expected obligation from BIR registration.'),
  ('0619-E','Monthly Expanded Withholding Tax','2026-08','August 2026','2026-08-01','2026-08-31','2026-09-10','UPCOMING','FOR_VERIFICATION',0,0,'Applicable withholding transactions only','Track applicable August withholding transactions; no payable is assumed.','Expected obligation from BIR registration.'),
  ('0619-E','Monthly Expanded Withholding Tax','2026-10','October 2026','2026-10-01','2026-10-31','2026-11-10','UPCOMING','FOR_VERIFICATION',0,0,'Applicable withholding transactions only','Track applicable October withholding transactions; no payable is assumed.','Expected obligation from BIR registration.'),
  ('0619-E','Monthly Expanded Withholding Tax','2026-11','November 2026','2026-11-01','2026-11-30','2026-12-10','UPCOMING','FOR_VERIFICATION',0,0,'Applicable withholding transactions only','Track applicable November withholding transactions; no payable is assumed.','Expected obligation from BIR registration.')
on conflict (form_code, period_key) do nothing;

insert into public.bir_deadline_adjustments (
  circular_number, circular_date, description, original_deadline,
  extended_deadline, applicable_forms, applicable_rdos_areas,
  applicability_status, verification_status, notes, source_reference
)
values (
  'RMC 089-2026','2026-08-10',
  'Possible extension of specified August 2026 tax deadlines, including Q2 1701Q.',
  '2026-08-15','2026-08-17',array['1701Q'],
  'Affected RDOs/areas listed in the circular; Antique applicability not yet verified.',
  'PENDING_VERIFICATION','PENDING_VERIFICATION',
  'Do not apply this deadline until applicability to Abelle Studios is explicitly verified.',
  'User-provided circular reference; authoritative source copy pending verification.'
)
on conflict (circular_number) do nothing;

insert into public.bir_tax_expenses (
  expense_date, supplier_payee, description, category, gross_amount,
  withholding_applicable, withholding_status, ewt_rate, ewt_amount,
  net_amount_paid, tax_period, recurring_key, notes
)
values
  ('2026-05-31','Studio Landlord','May 2026 studio rent','RENT',5000,true,'REMITTED',0.05,250,4750,'2026-Q2','STUDIO_RENT','May EWT filed and paid June 10, 2026.'),
  ('2026-06-30','Studio Landlord','June 2026 studio rent','RENT',5000,true,'WITHHELD',0.05,250,4750,'2026-Q2','STUDIO_RENT','Include in Q2 1601-EQ reconciliation; remittance not yet confirmed.')
on conflict (recurring_key, expense_date) do nothing;

insert into public.bir_tax_payments (
  obligation_id, payment_date, amount, payment_method, payment_reference, notes
)
select id, '2026-06-10 12:00:00+08', 250, 'MANUAL_CONFIRMATION', null,
  'May 2026 0619-E filed and paid.'
from public.bir_tax_obligations
where form_code = '0619-E' and period_key = '2026-05'
and not exists (
  select 1 from public.bir_tax_payments p
  where p.obligation_id = bir_tax_obligations.id and p.amount = 250
);

insert into public.bir_tax_audit_log (
  entity_type, entity_id, action, new_values, change_notes
)
select 'TAX_OBLIGATION', id, 'SEEDED', to_jsonb(o),
  'Initial 2026 BIR compliance snapshot seeded from confirmed user-provided records.'
from public.bir_tax_obligations o
where not exists (
  select 1 from public.bir_tax_audit_log a
  where a.entity_type = 'TAX_OBLIGATION' and a.entity_id = o.id and a.action = 'SEEDED'
);
