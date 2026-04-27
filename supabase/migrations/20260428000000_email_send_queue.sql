-- Generalise the confirmation-only email_retry_queue into a unified
-- email_send_queue that handles all outbound email types (confirmation,
-- digest_partner, digest_summary, …). Lead_id is now nullable so digest
-- emails (not scoped to a single lead) can be queued here too.

-- Drop and recreate rather than alter — no production rows exist yet.
drop table if exists email_retry_queue;

create table email_send_queue (
  id              uuid        primary key default gen_random_uuid(),
  email_type      text        not null check (email_type in ('confirmation', 'digest_partner', 'digest_summary')),
  to_address      text        not null,
  subject         text        not null,
  body_html       text,
  body_text       text,
  attachments     jsonb       not null default '[]'::jsonb,
  -- nullable: set for confirmation emails, null for digest emails
  lead_id         uuid        references leads on delete cascade,
  failure_count   int         not null default 0,
  max_failures    int         not null default 5,
  status          text        not null default 'pending'
                              check (status in ('pending', 'sent', 'permanent_failure')),
  last_error      text,
  next_retry_at   timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

create index email_send_queue_pending_idx
  on email_send_queue (next_retry_at)
  where status = 'pending';

alter table email_send_queue enable row level security;
-- Service role bypasses RLS; no user-facing policies needed.
