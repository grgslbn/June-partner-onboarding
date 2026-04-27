-- Additive-only: adds content management columns to partners.
-- No existing rows are broken — all new columns have safe defaults.

alter table public.partners
  add column if not exists content_status text not null default 'draft'
    check (content_status in ('draft', 'review', 'live')),
  add column if not exists tertiary_color    text,
  add column if not exists success_color     text,
  add column if not exists danger_color      text,
  add column if not exists muted_text_color  text,
  add column if not exists trust_badge_i18n  jsonb not null default '{}'::jsonb,
  add column if not exists privacy_url_i18n  jsonb not null default '{}'::jsonb;

comment on column public.partners.content_status is
  'CMS editorial state: draft → review → live. Controls banner in /admin/partners/[id].';
