-- Rename email_type value: stripe_redirect_backup → june_lead_backup
-- The backup notification now fires for all submission routes, not just Stripe ones.
alter table email_send_queue
  drop constraint email_send_queue_email_type_check,
  add  constraint email_send_queue_email_type_check
    check (email_type in (
      'confirmation',
      'digest_partner',
      'digest_summary',
      'june_lead_backup'
    ));
