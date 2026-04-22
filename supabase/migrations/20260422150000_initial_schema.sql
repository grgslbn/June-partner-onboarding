-- Initial schema from docs/02_ARCHITECTURE.md §3.1
-- Briefing 02 adds RLS policies and analytics views on top of this.

create extension if not exists pgcrypto;

create table partners (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  logo_url text,
  primary_color text not null default '#E53935',
  accent_color text not null default '#FFFFFF',
  slogan_i18n jsonb not null default '{}'::jsonb,
  locales_enabled text[] not null default array['nl','fr','en'],
  default_locale text not null default 'nl',
  flow_preset text not null default 'simple' check (flow_preset in ('simple','standard','complete')),
  iban_behavior text not null default 'deferred' check (iban_behavior in ('in_flow','deferred','skip')),
  savings_sim_enabled boolean not null default false,
  product_sold text not null default 'switch' check (product_sold in ('switch','switch_plus','premium')),
  confirmation_email_subject_i18n jsonb not null default '{}'::jsonb,
  confirmation_email_body_i18n jsonb not null default '{}'::jsonb,
  tc_url_i18n jsonb not null default '{}'::jsonb,
  digest_partner_email text,
  active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  role text not null check (role in ('june_admin', 'partner_admin')),
  partner_id uuid references partners on delete cascade,
  created_at timestamptz default now()
);

create table shops (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references partners on delete cascade,
  name text not null,
  address text,
  city text,
  zip text,
  qr_token text unique not null default encode(extensions.gen_random_bytes(9), 'base64'),
  active boolean not null default true,
  created_at timestamptz default now()
);
create index on shops(partner_id);
create index on shops(qr_token);

create table sales_reps (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops on delete cascade,
  display_name text not null,
  email text,
  active boolean not null default true,
  created_at timestamptz default now()
);
create index on sales_reps(shop_id);

create table discount_codes (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references partners on delete cascade,
  code text not null,
  type text not null check (type in ('fixed_eur','percent')),
  amount numeric not null,
  valid_from timestamptz,
  valid_to timestamptz,
  max_uses integer,
  used_count integer not null default 0,
  active boolean not null default true,
  created_at timestamptz default now(),
  unique (partner_id, code)
);

create table leads (
  id uuid primary key default gen_random_uuid(),
  confirmation_id text unique not null default ('JUN-' || upper(substring(md5(random()::text) from 1 for 6))),
  partner_id uuid not null references partners on delete restrict,
  shop_id uuid references shops on delete set null,
  sales_rep_id uuid references sales_reps on delete set null,
  status text not null default 'submitted' check (status in ('submitted','deferred_pending','complete','june_synced','failed')),
  locale text not null,

  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  iban text,
  tc_accepted_at timestamptz not null,

  address jsonb,
  complete_flow_data jsonb,

  discount_code text,
  referrer text,
  landing_url text,
  user_agent text,
  ip_address inet,

  deferred_token text unique,
  deferred_completed_at timestamptz,
  confirmation_email_sent_at timestamptz,
  confirmation_email_opened_at timestamptz,
  june_contract_id bigint,
  june_synced_at timestamptz,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index on leads(partner_id);
create index on leads(shop_id);
create index on leads(created_at desc);
create index on leads(status);

create table events (
  id bigint generated always as identity primary key,
  partner_id uuid not null references partners on delete cascade,
  shop_id uuid references shops on delete set null,
  lead_id uuid references leads on delete set null,
  event_type text not null check (event_type in (
    'landing_view', 'rep_selected', 'form_started',
    'step_completed', 'form_submitted', 'email_opened',
    'deferred_completed'
  )),
  meta jsonb,
  session_id text,
  created_at timestamptz default now()
);
create index on events(partner_id, created_at desc);
create index on events(lead_id);
create index on events(event_type, created_at desc);
