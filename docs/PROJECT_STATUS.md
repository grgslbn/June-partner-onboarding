# Project Status — June × IHPO Partner POS Onboarding

Last updated: 2026-04-29

Written April 28, 2026, end of working day. Project lead: Georges Lieben. Built in collaboration with Claude (planning + review) and Claude Code (implementation, two parallel sessions).

---

## 1. What has been built — the actual product

### 1.1 Customer-facing flow (public)

A white-label, mobile-first onboarding page that lives at `https://pos.june-energy.app/{locale}/p/{partner-slug}?shop={qr-token}`.

What a customer experiences end-to-end today:

1. Sales rep in a partner shop shows them a QR code (taped to the counter, on a leaflet, etc.)
2. Customer scans with their phone, lands on the partner-branded landing page in their language (FR/NL/EN auto-detect with override)
3. Page shows: partner logo + June logo, partner colors, slogan, trust badge, then the form
4. Rep picker pill ("Avec [Marie Dupont] ▾") shows the active reps for that shop — customer picks one (or skips)
5. Customer fills the form: first name, last name, email, T&C checkbox — plus any optional fields the partner has enabled (mobile, address, business details, housing type, birth date, billing frequency, product choice, inline IBAN/SEPA). Form is single-step if no extra fields are configured, multi-step otherwise.
6. Submit → success page with a JUN-XXXXXX confirmation reference
7. Confirmation email arrives within seconds (FR/NL/EN partner-branded, with a "Finaliser votre dossier (IBAN)" button if IBAN was not collected inline)
8. Customer clicks the button → lands on the deferred IBAN completion page (also partner-branded)
9. Validates Belgian IBAN (mod-97 check), accepts SEPA mandate, submits
10. Success page in-place. The lead's status is now `complete` and June CS can take over.

Partner content per locale: slogan, trust badge, confirmation email subject + body (Markdown), T&C URL, privacy URL — all editable per partner via the CMS.

### 1.2 CMS — partner self-service back office

Lives at `https://pos.june-energy.app/admin`. Built for two roles:

- **june_admin** — sees all partners, can edit everything, has a cross-partner analytics view
- **partner_admin** — sees only their own partner (RLS enforced)

Six distinct surfaces:

- **Partners list + edit** — branding (6 color slots, logo upload), content (slogan, trust badge, email copy, T&C URLs in 3 locales), settings (flow preset, IBAN behavior, locale config), status (draft / review / live)
- **Shops + QR generation** — CRUD for shops per partner, inline QR code rendering, three downloads per shop (SVG / PNG 1024px / A6 partner-branded printable PDF leaflet), regenerate-token flow with confirmation modal
- **Sales reps** — CRUD per shop, single-rep create or bulk-paste import (CSV-format text, one-column or two-column auto-detect), disable-not-delete to preserve attribution history
- **Discount codes** — CRUD per partner, public validation endpoint, atomic increment-on-use with race protection, type `fixed_eur` or `percent`
- **Form fields** — per-field visible/required/step toggles for 9 optional field groups (mobile, address, business, housing_type, birth_date, billing_frequency, product_choice, iban, sepa_accepted); live schematic preview of step layout; product choices JSON editor. Autosaves via partner PATCH endpoint.
- **Analytics** — top stat cards (today/week/month + deltas), date range toggle (7d/30d/90d), leads-over-time line chart, conversion funnel, top reps leaderboard, auto-refresh every 60s. Cross-partner aggregate view at `/admin/analytics` for june_admin only.

Authentication: magic-link email via Supabase Auth, but currently bypassed via `DEV_AUTH_BYPASS=true` env var on staging — auto-logs in as georgeslieben@gmail.com (june_admin role) for fast iteration. Yellow banner at the top of every CMS page indicates this. **Must be disabled before production cutover.**

Live preview: the partner branding tab has a card-component preview pane that mirrors form-state changes in real-time. Changes propagate to the public page within 60 seconds (cache TTL).

### 1.3 Operational pipeline (worker)

A separate Node.js worker app on Railway, runs on cron schedule (07:00 Brussels time, weekdays):

- Queries leads created during yesterday's Brussels-local window
- Generates one CSV per partner + one combined CSV for June CS
- Writes email rows to `email_send_queue` table (structured: to_address, subject, body_html, attachments JSONB, max_failures)
- Separate retry job (every 5 min) is the sole Resend caller — sends queued emails, exponential backoff, marks `permanent_failure` after max retries

This closes the manual handoff loop between our DB and June CS until Phase 3 (direct API ingest) ships.

### 1.4 Email infrastructure

- Confirmation emails: React Email templates, FR/NL/EN, partner-themed, sent via Resend on lead submit
- Domain `pos.june-energy.app` verified in Resend (DKIM + SPF + DMARC + MX all green)
- Two senders: `noreply@pos.june-energy.app` (transactional), `digests@pos.june-energy.app` (operational)
- Deliverability fixes: From-name set, Reply-To set, plain-text alternative for every HTML email, List-Unsubscribe header

### 1.5 Database schema

PostgreSQL (Supabase, Frankfurt eu-central-1), with full RLS:

| Table | Purpose |
|---|---|
| `partners` | branding, content, flow config, `content_status` flag, `form_schema jsonb` (field group config), `product_choices jsonb` |
| `shops` | per partner, with stable `qr_token` (URL-safe base64) |
| `sales_reps` | per shop, soft-disable via `active` flag |
| `discount_codes` | per partner, atomic-increment safe |
| `leads` | with `deferred_token` for IBAN completion, attribution to shop + rep; 9 optional extra-field columns (`mobile`, `is_business`, `business_name`, `business_vat`, `sepa_accepted`, `housing_type`, `birth_date`, `billing_frequency`, `product_choice`) + existing `address jsonb` / `iban` |
| `events` | analytics-grade, tracks `landing_view` → `form_started` → `form_submitted` → `email_opened` → `deferred_completed` |
| `profiles` | auth user roles (`june_admin` / `partner_admin`), `partner_id` scoping |
| `email_send_queue` | unified email queue with `email_type` discriminator (`confirmation` / `digest_partner` / `digest_summary`) |

RLS uses `SECURITY DEFINER` helper functions to avoid recursion (`is_june_admin()`, `is_partner_admin_for(partner_id)`).

---

## 2. What we've been building — the journey

**Phase 1 — Foundation (Briefings 01–04)**
Repo scaffolded as a Turborepo monorepo with `apps/web` (Next.js 15/16), `apps/worker` (Node.js cron), shared packages. Supabase project created, schema migrated, RLS applied. i18n infrastructure (next-intl). Partner landing page hero with placeholder content.

**Phase 2 — Customer flow (Briefings 05–07)**
Simple form built (name + email + T&C). API endpoint for lead capture with Zod validation, rate limiting, anti-spam. Confirmation email rendered via React Email and sent via Resend.

**Phase 3 — CMS pulled forward (Briefings 12–17)**
Originally planned for later, pulled forward to run parallel with public-flow track. Auth + profiles. Partners CRUD with autosave + live preview. Shops + QR generation with three download formats. Reps CRUD with bulk import. Discount codes with public validation endpoint. Analytics dashboard with Recharts + SWR polling.

**Phase 4 — Critical fixes (Briefing 10 + chain)**
Multi-round bug fix on the Simple form rep-picker (3 PRs: form mode, rep Select control, salesRepId serialization). Then the seed UUIDs (turned out hand-crafted "fake" UUIDs failed Zod's strict validation while passing Postgres's permissive one). Then Briefing 10 — the deferred IBAN page that was specced but never built, returning 404 to real customers clicking the email button.

**Phase 5 — Operational glue (Briefing 18)**
Worker for daily digest. Generalized the email retry queue into a unified `email_send_queue` to support multiple email types cleanly.

**Phase 6 — Configurable form schema (Briefing 37)**
`DynamicForm` replaces `SimpleForm` (shim re-export keeps all existing tests passing). Partners configure up to 9 optional field groups via `form_schema` JSONB; empty schema is byte-for-byte identical to the old form. Multi-step rendering with "X / N" counter, partner-colored "Suivant" button. CMS Form fields tab with per-field toggles + live step preview. CSV digest extended to 30 columns. Belgian postcodes auto-fill with 300 ms debounce.

**Pulled forward, parallel, or descoped**

- Pulled forward: CMS track (Briefings 12–17), to demo-readiness sooner
- Pulled forward: configurable form schema (Briefing 37), to support IHPO-specific field requirements before pilot
- Parallel: customer-flow + CMS tracks ran in two Claude Code sessions with file-scope coordination rules
- Descoped to "after pilot": PWA (Briefing 19), Audit log (Briefing 21), Phase 3 direct API ingest

**Open work**

- Briefing 20 — Performance & accessibility pass (required for launch)
- Briefing 23 — Pre-launch polish (error pages, monitoring, Sentry)
- Pre-launch checklist execution (disable dev bypass, set up Resend SMTP for Supabase Auth, etc.)

---

## 3. Setups elsewhere — infrastructure & accounts

### 3.1 GitHub

- Repo: `grgslbn/June-partner-onboarding`
- Branch model: feature branches → PR → merge to main
- All PRs merged in this build: #13–#35 (with some gaps in numbering for chained dependent PRs)
- Branch protection: not configured (worth adding before launch)

### 3.2 Vercel

- Project: `june-partner-onboarding-web`
- Domain: `pos.june-energy.app` (custom, verified, SSL auto-provisioned)
- Deploys: auto from main branch
- Env vars set on staging (and "All Environments"):
  - `NEXT_PUBLIC_SITE_URL=https://pos.june-energy.app`
  - `SUPABASE_URL` + `SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY`
  - `RESEND_API_KEY`
  - `DEV_AUTH_BYPASS=true` **(must be unset before prod)**

### 3.3 Cloudflare

- Domain `june-energy.app` registered, DNS hosted
- `pos.june-energy.app` CNAME → Vercel
- DKIM, SPF, MX, DMARC TXT records for Resend deliverability
- `_supabase` records for Supabase Auth callback URLs

### 3.4 Supabase

- Project: `june-onboarding-dev` (Frankfurt, eu-central-1)
- All migrations applied, all RLS policies live
- Storage bucket `partner-logos` created (public read, 2MB limit, image MIME types)
- Authentication → URL Configuration → redirect URLs include `https://pos.june-energy.app/admin/auth/callback`
- Auth rate limit: 2 emails/hour from Supabase's built-in SMTP — bypassed by `DEV_AUTH_BYPASS`. Pre-launch needs custom Resend SMTP set up here for partner_admin logins.

### 3.5 Railway

- Project linked to GitHub repo
- `worker` service configured, `web` service deleted (Vercel handles web)
- Build command: `pnpm --filter=worker build`
- Start command: `pnpm --filter=worker start`
- Watch paths: `/apps/worker/**` and `/packages/**`
- Env vars set: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `JUNE_CS_DIGEST_EMAIL`, `NODE_ENV`
- Auto-deploys from main

### 3.6 Resend

- Domain `pos.june-energy.app` verified (DKIM/SPF green)
- Two verified senders: `noreply@pos.june-energy.app`, `digests@pos.june-energy.app`
- API key generated, used by both Vercel app + Railway worker

### 3.7 External communications sent

- **Email to Cédric Chapelle (IHPO)** — drafted in French, vous, professional, sent today. Asks for: brand colors confirmation, slogan sign-off, trust badge approval, confirmation email copy review, T&C/privacy URL confirmation, gentle reminder about shops + reps spreadsheet.
- **Email to Tom Vandeputte (June)** — drafted in French, vous, professional, sent today. Asks for: API service account, tariff data for savings simulator, commission model, CSV digest format preference, production domain decision, prod API credentials handover.
- Both are 1-week deadlines (soft).

### 3.8 Local dev environment

- Repo cloned at `~/Documents/June Claude Code/June-POS-onboarding/` (iCloud-synced — known low-grade friction, deferred move)
- Two Claude Code sessions in use: one for public-flow, one for CMS, with file-scope coordination
- `pnpm` for package management, `tsx` for ad-hoc script runs

---

## 4. Quality assurance — high-level checklist

These are the things to systematically verify before any real customer or partner uses the system. Use this as a re-check at any point during build or before launch.

### 4.1 Customer-facing flow

- [ ] Form submission with rep selected → 200, lead in DB with correct attribution
- [ ] Form submission without rep → 200, lead in DB with `sales_rep_id = null`
- [ ] Form submission with discount code → 200, code's `used_count` incremented atomically
- [ ] Confirmation email arrives within 30 seconds of submission, lands in inbox not spam (modulo domain reputation warmup)
- [ ] IBAN completion link in email → loads the deferred completion page
- [ ] Invalid IBAN rejected client + server side
- [ ] Already-completed link → graceful "already complete" page
- [ ] Expired link (30+ days old) → graceful "expired" page
- [ ] Invalid token → graceful "invalid" page (not raw 404)
- [ ] All three locales (FR/NL/EN) render with correct content and email
- [ ] Unsubscribe link in email body works

### 4.2 CMS

- [ ] Magic-link login works (when `DEV_AUTH_BYPASS=false`)
- [ ] Magic-link redirects to correct URL per environment
- [ ] All four CRUD tabs autosave correctly with visible save indicator
- [ ] Logo upload to Supabase Storage works, replaces previous logo
- [ ] QR codes scan reliably from paper (≥50mm, indoor lighting, both iPhone and Android)
- [ ] QR regeneration invalidates old token, new token works immediately
- [ ] Disabling a rep removes them from public picker, preserves past lead attribution
- [ ] Discount code uniqueness enforced per-partner, error surfaced inline
- [ ] Public discount validation endpoint doesn't leak cross-partner info
- [ ] Analytics page renders with realistic curves on fake data, auto-refreshes
- [ ] `partner_admin` users see only their own partner data (RLS verified)

### 4.3 Email & deliverability

- [ ] All emails authenticate with DKIM + SPF + DMARC
- [ ] From-name, Reply-To, plain-text alt, List-Unsubscribe headers all present
- [ ] Email bounce / complaint handling via Resend webhook
- [ ] Test emails marked "Not spam" in Gmail to build domain reputation
- [ ] Both `noreply@` and `digests@` senders verified independently

### 4.4 Operational pipeline

- [ ] Daily digest cron fires at 07:00 Brussels time, weekdays
- [ ] Digest email arrives at `JUNE_CS_DIGEST_EMAIL` with combined CSV
- [ ] Per-partner digest arrives if `digest_partner_email` set on partner
- [ ] CSV opens cleanly in Excel (UTF-8 BOM, French/Dutch characters render)
- [ ] Email send queue retries on failure with exponential backoff
- [ ] Failed sends after 5 attempts marked `permanent_failure` and visible
- [ ] Manual digest trigger works: `pnpm --filter=worker run daily-digest`

### 4.5 Schema & data integrity

- [ ] Migrations are additive only (no destructive operations without explicit pre-flight check)
- [ ] All UUIDs are real RFC 4122 (never hand-crafted hex strings)
- [ ] All foreign keys have appropriate ON DELETE behavior
- [ ] RLS policies tested for both roles and edge cases
- [ ] Storage bucket policies verified (anonymous upload blocked, public read works)

### 4.6 Security & secrets

- [ ] All env vars correctly scoped per environment (dev / preview / staging / prod)
- [ ] Service role key never exposed to client (only server components + worker)
- [ ] Magic-link redirect URLs allowlisted in Supabase Auth settings
- [ ] `DEV_AUTH_BYPASS` flagged with visible banner; impossible to enable accidentally in production
- [ ] Discount code validation endpoint rate-limited (30/5min per IP)
- [ ] IBAN completion endpoint rate-limited (10/5min per IP)

### 4.7 Pre-launch blockers

These must all be resolved before any real customer sees the system:

- [ ] `DEV_AUTH_BYPASS=false` in production
- [ ] Custom Resend SMTP configured in Supabase Auth (replaces 2/hour built-in limit)
- [ ] Real IHPO logo uploaded via CMS (not the SVG fallback initial)
- [ ] Partner `content_status = live` (not draft or review) for all active partners
- [ ] Real Belgian phone number / address fields if partner needs Standard preset (out of v1 scope for IHPO)
- [ ] Production domain decided with June (`onboard.june.energy`?)
- [ ] Production API credentials for June (Phase 3 only — not v1 blocker)
- [ ] Sentry / error monitoring configured
- [ ] 404, 500, generic error pages branded
- [ ] Lighthouse green (perf, a11y, SEO, best practices) on at least the customer-facing pages

### 4.8 Resilience & fall-backs

- Email send failure → row in `email_send_queue` with `pending` status, retry job picks up
- Resend API outage → queue accumulates, sends when Resend recovers, no data loss
- Supabase outage → public form returns 503 (Vercel returns its own error page)
- Worker crash → Railway auto-restarts, missed cron tick can be replayed manually
- Rate limit hit → user sees friendly error, can retry after window
- Invalid input on any form → Zod validation, both client (instant feedback) and server (defense in depth)
- Concurrent edit on same partner row → last-write-wins (acceptable for single-admin-per-partner pattern)
- Concurrent rep-attribution race → atomic UPDATE with WHERE clause guards
- Concurrent discount-code-use race → atomic increment with `WHERE used_count < max_uses` returning 0 rows on exhaustion → silently drops discount, lead still succeeds
- iCloud sync conflict → known issue, mostly invisible, no production impact

### 4.9 Observability

- Worker logs structured JSON to stdout, Railway captures
- Supabase logs all DB queries, retainable per plan
- Vercel function logs accessible per-deployment
- No Sentry yet (deferred until pre-launch)
- No PostHog / analytics tooling yet (custom analytics dashboard covers v1 needs)

### 4.10 What's not tested

For honesty's sake, these gaps remain:

- No end-to-end test in CI (tests exist but only run locally; no GitHub Actions)
- Real device QR scanning with paper QR — recommended but never explicitly verified
- `partner_admin` login flow end-to-end (only `june_admin` tested via dev bypass)
- Magic-link flow at scale (Supabase 2/hour limit prevents heavy testing without custom SMTP)
- Multi-partner concurrent CMS edits (single-user testing only)
- High-volume daily digest (fake data is 80 leads, real production may eventually be thousands)
- Production migration from staging schema (staging seed has placeholder content; production will need real)

---

## Where you actually are

You started with a PRD and a handful of placeholder components. You've built, in the span of perhaps 12 hours of focused effort:

- A working customer-facing flow that captures real leads and sends real email
- A complete back-office for partner self-service with live preview and analytics
- An operational pipeline that closes the data loop with June CS
- Three rounds of bug fixes that taught real lessons about Postgres ↔ TypeScript boundaries
- Infrastructure across five vendors all configured and integrated
- Two real outbound emails to your real partners
