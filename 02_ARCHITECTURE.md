# Architecture — June Partner Onboarding

**Companion to:** `01_PRD.md` · **Status:** Draft v1

---

## 1. Stack at a glance

| Layer | Choice | Why |
|---|---|---|
| **Frontend (public + CMS)** | Next.js 15 (App Router) on Vercel | SSR for public pages (SEO, fast LCP), great DX, first-class Vercel hosting, React Server Components reduce client JS |
| **Styling** | Tailwind + shadcn/ui | Matches the skills in your brief, accessible by default, partner theming via CSS variables |
| **PWA** | `next-pwa` or Serwist | Installable tablet shell, no app store |
| **Forms** | React Hook Form + Zod | Schema once, validate client + server |
| **i18n** | `next-intl` | Locale routing `/nl`, `/fr`, `/en`; namespaced JSON messages |
| **Auth (CMS)** | Supabase Auth (email + magic link) | Tight RLS integration |
| **Database** | Supabase Postgres | RLS for multi-tenancy, real-time subscriptions for live dashboards (nice-to-have), managed backups |
| **File storage** | Supabase Storage | Partner logos, future T&C PDFs |
| **Email** | Resend + React Email | DX, React templates, EU region available |
| **Background jobs** | Railway cron + worker | Nightly digest, email retries, savings calc pre-warming |
| **Monitoring** | Sentry (frontend + worker) | Error tracking, sourcemaps |
| **Analytics (events)** | Supabase `events` table + Recharts | Keeps v1 simple; PostHog later |
| **CI/CD** | GitHub Actions → Vercel + Railway | Vercel auto-deploys per PR; Railway redeploys on main |

## 2. Repo layout (monorepo)

```
june-partner-onboarding/
├── apps/
│   ├── web/                    # Next.js app (public + CMS)
│   │   ├── app/
│   │   │   ├── (public)/       # Unauthenticated routes
│   │   │   │   └── p/[slug]/   # Partner landing + onboarding flow
│   │   │   ├── (cms)/          # Authenticated CMS routes
│   │   │   │   └── admin/
│   │   │   └── api/            # Next.js route handlers (lead submit, internal)
│   │   ├── components/
│   │   │   ├── ui/             # shadcn components
│   │   │   ├── flow/           # OnboardingStep, ProgressBar, etc.
│   │   │   └── cms/            # Admin-specific
│   │   ├── lib/
│   │   │   ├── supabase/       # server + browser clients
│   │   │   ├── flows/          # preset definitions (simple/standard/complete)
│   │   │   ├── i18n/
│   │   │   └── validators/     # Zod schemas
│   │   ├── messages/           # next-intl JSON: nl.json, fr.json, en.json
│   │   └── emails/             # React Email templates
│   │
│   └── worker/                 # Railway background worker
│       ├── src/
│       │   ├── jobs/
│       │   │   ├── daily-digest.ts
│       │   │   ├── email-retry.ts
│       │   │   └── phase3-june-sync.ts   # Stubbed for now
│       │   ├── lib/
│       │   └── index.ts        # cron scheduler entry
│       └── Dockerfile
│
├── packages/
│   ├── db/                     # Shared DB types + Supabase client factory
│   │   ├── schema.sql          # Canonical schema (for reference; Supabase migrations are truth)
│   │   ├── types.ts            # Generated via `supabase gen types typescript`
│   │   └── index.ts
│   ├── shared/                 # Cross-app types, constants, pure fns
│   │   ├── flow-presets.ts     # SIMPLE, STANDARD, COMPLETE definitions
│   │   ├── lead-schema.ts      # Zod schemas, shared client + server
│   │   └── savings-estimator/  # Pure calc module, no IO
│   └── june-api/               # Typed wrapper around the June REST API
│       └── src/
│           ├── auth.ts         # OAuth 2-step dance
│           ├── contract.ts
│           ├── supplier.ts
│           └── index.ts
│
├── supabase/
│   ├── migrations/             # Timestamped SQL migrations
│   ├── seed.sql                # Dev seed data (demo partner, shops, reps)
│   └── config.toml
│
├── docs/                       # PRD, architecture, dev setup, delivery plan
├── briefings/                  # Claude Code briefings, one per build chunk
├── .github/workflows/
│   ├── ci.yml                  # lint + test + typecheck + e2e
│   └── deploy-worker.yml       # Railway deploy on main
├── turbo.json                  # Turborepo build orchestration
├── package.json
└── pnpm-workspace.yaml
```

**Monorepo tool:** Turborepo + pnpm workspaces. Reason: fastest DX on Vercel, remote caching out of the box, Vercel native support.

## 3. Data model

### 3.1 Tables

```sql
-- Profiles (mirrors auth.users, adds role + partner scoping)
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  role text not null check (role in ('june_admin', 'partner_admin')),
  partner_id uuid references partners on delete cascade,  -- null for june_admin
  created_at timestamptz default now()
);

-- Partners
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

-- Shops
create table shops (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references partners on delete cascade,
  name text not null,
  address text,
  city text,
  zip text,
  qr_token text unique not null default encode(gen_random_bytes(9), 'base64'),
  active boolean not null default true,
  created_at timestamptz default now()
);
create index on shops(partner_id);
create index on shops(qr_token);

-- Sales reps
create table sales_reps (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops on delete cascade,
  display_name text not null,
  email text,
  active boolean not null default true,
  created_at timestamptz default now()
);
create index on sales_reps(shop_id);

-- Discount codes
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

-- Leads
create table leads (
  id uuid primary key default gen_random_uuid(),
  confirmation_id text unique not null default ('JUN-' || upper(substring(md5(random()::text) from 1 for 6))),
  partner_id uuid not null references partners on delete restrict,
  shop_id uuid references shops on delete set null,
  sales_rep_id uuid references sales_reps on delete set null,
  status text not null default 'submitted' check (status in ('submitted','deferred_pending','complete','june_synced','failed')),
  locale text not null,

  -- Common fields
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  iban text,  -- nullable; populated later if deferred
  tc_accepted_at timestamptz not null,

  -- Structured optional data
  address jsonb,  -- { street, houseNumber, box, city, zip }
  complete_flow_data jsonb,  -- full 9-step payload when flow_preset = complete

  -- Attribution & analytics
  discount_code text,
  referrer text,
  landing_url text,
  user_agent text,
  ip_address inet,  -- pruned after 90 days via cron

  -- Lifecycle
  deferred_token text unique,  -- magic link token for IBAN completion
  deferred_completed_at timestamptz,
  confirmation_email_sent_at timestamptz,
  confirmation_email_opened_at timestamptz,
  june_contract_id bigint,  -- populated in Phase 3 when synced to June
  june_synced_at timestamptz,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index on leads(partner_id);
create index on leads(shop_id);
create index on leads(created_at desc);
create index on leads(status);

-- Events (for funnel analytics)
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
```

### 3.2 Row-Level Security

Every partner-scoped table has RLS on. The canonical policy pattern:

```sql
alter table leads enable row level security;

-- June admins see everything
create policy "june_admin_all_leads" on leads
  for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'june_admin'
    )
  );

-- Partner admins see only their partner's leads
create policy "partner_admin_own_leads" on leads
  for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'partner_admin'
        and profiles.partner_id = leads.partner_id
    )
  );
```

Same pattern for `shops`, `sales_reps`, `discount_codes`, `events`, `partners`.

The **public** lead submit endpoint uses the Supabase `service_role` key **server-side only** (in a Next.js route handler), bypassing RLS deliberately. The route handler does its own validation (partner slug + shop token match a real partner + shop).

### 3.3 Analytics views

```sql
-- Daily lead counts per partner (materialised refresh nightly)
create materialized view lead_daily_counts as
select
  partner_id,
  date_trunc('day', created_at) as day,
  count(*) as leads
from leads
group by partner_id, date_trunc('day', created_at);

-- Funnel per partner, last 30 days (regular view, live)
create view funnel_30d as
select
  partner_id,
  event_type,
  count(*) as count
from events
where created_at > now() - interval '30 days'
group by partner_id, event_type;
```

## 4. Request flow — public lead submit

```
Customer browser                Next.js API route             Supabase                  Resend                 Worker
─────────────────                ─────────────────              ────────                  ──────                  ──────
1. POST /api/leads
   { partner_slug, shop_token,
     rep_id, fields... }
                                 2. Zod validate
                                 3. Resolve partner by slug
                                    (cached 60s)
                                 4. Resolve shop by token,
                                    verify shop.partner_id
                                 5. Insert lead (service role)
                                                                   → returns { id, confirmation_id }
                                 6. Insert event 'form_submitted'
                                 7. Queue email via Resend
                                                                                            → accepted
                                 8. Respond 200
                                    { confirmation_id, deferred_token? }
   ← 200

                                                                                                                  Later:
                                                                                                                  - Daily digest cron
                                                                                                                  - Email retry queue
                                                                                                                  - (Phase 3: June sync)
```

**Latency budget:**
- Zod + resolves: <20ms (partners table cached in memory per instance, 60s TTL)
- Supabase insert: <80ms (same region)
- Resend enqueue (fire-and-forget, don't await delivery): <30ms
- **Total target P95: 300ms**

## 5. Infrastructure topology

```
┌────────────────────────┐        ┌─────────────────────────┐
│ Customer tablet        │        │ Partner admin browser   │
│ (PWA)                  │        │                         │
└───────────┬────────────┘        └────────────┬────────────┘
            │                                  │
            │     HTTPS                        │   HTTPS
            ▼                                  ▼
┌─────────────────────────────────────────────────────────────┐
│ Vercel (Next.js app)                                        │
│  ├─ public: /p/[slug]                                       │
│  ├─ cms:    /admin/*        (Supabase Auth cookie)          │
│  └─ api:    /api/leads, /api/deferred/[token], /api/events  │
└──────────┬──────────────────────────────┬───────────────────┘
           │                              │
           │ Service role key             │ Send transactional
           │ (server-side only)           │ email
           ▼                              ▼
┌─────────────────────┐           ┌────────────────────┐
│ Supabase (EU)       │           │ Resend (EU region) │
│  ├─ Postgres + RLS  │           │                    │
│  ├─ Auth            │           └────────────────────┘
│  └─ Storage (logos) │
└──────────┬──────────┘
           ▲
           │
           │ Read/write via service role
           │
┌──────────┴──────────────────────────────────────────────┐
│ Railway worker (Node, Docker)                           │
│  ├─ Cron: daily-digest (06:00 Europe/Brussels)          │
│  ├─ Cron: ip-pruner (daily)                             │
│  ├─ Queue: email-retry (every 5 min)                    │
│  └─ [Phase 3] Cron: june-sync                           │
└─────────────────────────────────────────────────────────┘
```

## 6. Security model

### 6.1 Key management

| Key | Where it lives | Scope |
|---|---|---|
| `SUPABASE_ANON_KEY` | Public (browser) | RLS-bound; browser only ever sees its own scoped data |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel env (server) + Railway env | Bypass RLS; used only in route handlers and worker |
| `RESEND_API_KEY` | Vercel env + Railway env | Email send |
| `JUNE_API_CLIENT_ID` / `SECRET` | Railway env (worker only, Phase 3) | June API auth |
| `SENTRY_DSN` | Both | Error reporting |

Vercel: use **Environment Variables** split by Production / Preview / Development. Supabase service role is Production + Preview only; Development uses local Supabase (via `supabase start`).

### 6.2 Public endpoint hardening

- `POST /api/leads` is rate-limited per IP and per shop token (Upstash Redis or Supabase edge fn + Postgres row).
- Basic bot signals: honeypot field, min-time-to-submit check (< 1.5s = rejected).
- Cloudflare Turnstile on the landing page if abuse appears (don't add up-front; adds friction).

### 6.3 GDPR posture

- All infra in EU (Supabase eu-central-1, Resend EU region, Vercel edge routing EU-first).
- `DELETE /api/admin/leads/:id` for CS-initiated erasure. Event rows anonymised (lead_id set to null, retain counts).
- Soft-delete not used — hard delete with audit log to a separate `deletion_log` table.
- DPA agreements: Supabase ✓, Resend ✓, Vercel ✓, Railway ✓ (confirm each at setup).

## 7. Key module designs

### 7.1 Flow preset definitions

`packages/shared/flow-presets.ts`:

```ts
export const FLOW_PRESETS = {
  simple: {
    id: 'simple',
    steps: ['identity_minimal', 'consent'],
    fields: ['firstName', 'lastName', 'email', 'tcAccepted'],
    ibanConfigurable: true,
  },
  standard: {
    id: 'standard',
    steps: ['identity', 'address', 'consent'],
    fields: ['firstName','lastName','email','phone','address','language','tcAccepted'],
    ibanConfigurable: true,
  },
  complete: {
    id: 'complete',
    // Collapses June's 9 API steps into 5 visible UI phases
    steps: ['identity', 'address', 'building', 'usage', 'connections', 'preferences', 'consent'],
    juneApiMapping: { /* maps each field to its PUT endpoint */ },
    ibanConfigurable: true,
    savingsSimOptional: true,
  },
} as const;
```

### 7.2 June API client (future-proofing)

`packages/june-api/` exists from day one, even though Phase 1 doesn't call it. Reason: the savings-estimator module needs `GET /supplier` and `GET /city`, which ARE callable. Having the wrapper ready also de-risks Phase 3.

**Design:**
- Typed endpoints matching the API reference.
- Token cache in memory with 50-minute TTL (tokens last ~1h).
- Automatic retry on 401 (one re-auth, then fail).
- Two-step OAuth dance implemented per the reference's "Implementation Notes" section (password grant returns a `code`, not a token).

### 7.3 Savings estimator (pure module)

`packages/shared/savings-estimator/`:
- Pure function `estimateYearlySavings(input) → { min, max, confidence }`
- Input: zip, current supplier id, current tariff type, rough usage flags (`heatingWithElectricity`, `warmWaterWithGas`, ...), residents count
- Uses a **cached tariff reference table** (refreshed weekly by the worker from June's `GET /supplier` + typical tariff rates — either scraped from June's public pricing or provided as a static JSON by June).
- Returns a **range**, not a point estimate, to manage expectation.
- Has a `confidence` field: `low` (just postal + residents), `medium` (+ current supplier), `high` (+ tariff type + usage).

### 7.4 i18n structure

`messages/nl.json`, `fr.json`, `en.json`. Namespace convention:
```json
{
  "public": {
    "landing": { ... },
    "form": { ... }
  },
  "cms": {
    "nav": { ... },
    "partners": { ... }
  }
}
```

Partner-controlled copy (slogans, email bodies, T&C URLs) is stored as JSONB on the `partners` row, keyed by locale. These are loaded from the database, not from the `messages/*.json` files.

## 8. Testing strategy

| Layer | Tools | Coverage target |
|---|---|---|
| **Unit** | Vitest | 70% on `packages/shared/*` (flow presets, savings calc, Zod schemas) |
| **Integration** | Vitest + Testcontainers (Postgres) | RLS policies, lead submit endpoint, digest job |
| **E2E** | Playwright | Critical paths: Simple flow submit, Standard flow submit, CMS login + create partner, QR scan → rep pick |
| **Visual regression** | Playwright screenshots on PR | Landing page per partner preset |
| **a11y** | axe-playwright | Landing + form on each preset |

GitHub Actions runs all of the above on every PR. Deployment gated on green.

**TDD approach:** For `packages/shared/*` modules (flow presets, savings calc, lead schema) we write tests first. For UI, visual regression + a11y serve as the safety net; we don't write unit tests against components beyond critical flow logic.

## 9. Monitoring & ops

- **Sentry** — Next.js SDK (auto-tunnels through `/monitoring` to avoid adblockers), worker SDK.
- **Vercel Analytics** — Web Vitals, traffic by route.
- **Supabase Dashboard** — Query performance, DB size, API call counts.
- **Railway logs** — Worker stdout + Sentry breadcrumbs.
- **Alerts** (PagerDuty-free for v1):
  - Sentry issue threshold → Slack webhook to `#june-alerts`
  - Daily digest failure → email to engineering lead
  - Lead submit 5xx rate > 1% over 10 min → Slack webhook

## 10. Performance budgets

Public landing page:
- **LCP** < 1.5s on throttled 4G (Vercel Edge helps; fonts preloaded; hero image optimised)
- **TBT** < 200ms
- **CLS** < 0.05
- **Initial JS** < 90KB gzipped on the `/p/[slug]` route (thanks to RSC; CMS can be heavier)

Form submission:
- **P50** < 200ms
- **P95** < 500ms
- **P99** < 1s

## 11. Phased rollout (see `04_DELIVERY_PLAN.md` for full timeline)

- **Phase 1 (MVP, pre-IHPO pilot):** Public flow (Simple + Standard + Complete), CMS June-admin-only, nightly digest, basic analytics. Partner self-service gated behind feature flag.
- **Phase 2 (post-pilot):** Partner self-service CMS enabled, savings simulator live, discount codes, per-partner digests.
- **Phase 3 (when June provides it):** Direct June API ingest, swap CSV digest for API sync, real-time status in leads table.
