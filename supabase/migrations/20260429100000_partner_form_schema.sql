-- form_schema: per-partner config for which optional fields are visible/required and their step.
-- Default is empty fields object → renders identically to the pre-schema Simple form.
-- product_choices: [{id: string, label_i18n: {fr,nl,en}}] for the product_choice field.
alter table partners
  add column form_schema     jsonb not null default '{"fields":{}}'::jsonb,
  add column product_choices jsonb;

-- Optional data columns collected by configurable form fields.
-- address jsonb (already exists) stores {street, postal_code, city}.
-- iban text (already exists) is reused for the inline iban field.
alter table leads
  add column mobile            text,
  add column is_business       boolean,
  add column business_name     text,
  add column business_vat      text,
  add column sepa_accepted     boolean,
  add column housing_type      text,
  add column birth_date        date,
  add column billing_frequency text,
  add column product_choice    text;
