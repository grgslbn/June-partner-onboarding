-- Submission route: how a submitted lead is handled post-form.
-- cs_handoff (default/existing): June CS contacts the customer within 48h.
-- self_onboarding: customer gets an email with a Stripe link to complete payment.
-- in_shop_stripe: form immediately redirects the customer's browser to Stripe.

alter table partners
  add column submission_route    text not null default 'cs_handoff'
    check (submission_route in ('cs_handoff', 'self_onboarding', 'in_shop_stripe')),
  add column stripe_url_template text,        -- required when route ≠ cs_handoff
  add column stripe_promo_code   text,        -- optional default promo forwarded to Stripe
  add column june_backup_email   text;        -- required when route ≠ cs_handoff; receives Stripe redirect notifications

-- Promo code captured from ?promo= URL param on the landing page.
-- Persisted here so the backup email and analytics can show what was applied.
-- Distinct from discount_codes (internal discounts); this is a Stripe promo code.
alter table leads
  add column promo_code text;

-- Extend the email_type check constraint to include the new internal notification type.
-- The inline constraint gets the auto-generated name email_send_queue_email_type_check.
alter table email_send_queue
  drop constraint email_send_queue_email_type_check,
  add  constraint email_send_queue_email_type_check
    check (email_type in (
      'confirmation',
      'digest_partner',
      'digest_summary',
      'stripe_redirect_backup'
    ));
