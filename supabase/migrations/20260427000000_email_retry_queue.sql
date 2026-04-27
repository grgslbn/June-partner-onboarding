create table email_retry_queue (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads on delete cascade,
  attempt int not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now()
);

alter table email_retry_queue enable row level security;

-- Service role bypasses RLS; no user-facing policies needed.
