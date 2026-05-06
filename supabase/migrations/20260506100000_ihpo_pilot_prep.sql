-- June CS email: detailed lead notification, separate from june_backup_email
ALTER TABLE partners ADD COLUMN june_cs_email text;

-- Shop-level promo code override (overrides partner.stripe_promo_code in QR URL)
ALTER TABLE shops ADD COLUMN promo_code text;

-- SEPA mandate text, editable per-partner in CMS (FR/NL/EN JSONB)
ALTER TABLE partners ADD COLUMN sepa_mandate_text_i18n jsonb;

-- Add june_cs_lead to the email_send_queue email_type constraint
ALTER TABLE email_send_queue DROP CONSTRAINT email_send_queue_email_type_check;
ALTER TABLE email_send_queue ADD CONSTRAINT email_send_queue_email_type_check
  CHECK (email_type IN (
    'confirmation',
    'digest_partner',
    'digest_summary',
    'june_lead_backup',
    'june_cs_lead'
  ));
