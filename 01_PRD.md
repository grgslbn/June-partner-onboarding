# PRD — June Partner Onboarding Platform

**Status:** Draft v1 · **Target pilot:** IHPO, Dec 2025 / Jan 2026 · **Owner:** June Energy

---

## 1. Summary

A white-labelable mobile web page that a retail salesperson hands to a customer on a tablet/phone during a sale. The customer onboards to June Energy in seconds. The partner shop and the individual sales rep each earn a share of June's referral commission. June customer service completes the backoffice switching work from captured lead data.

The product ships as a PWA (installable on tablets, no app store) plus a multi-tenant CMS where partner admins manage branding, flow configuration, shops, reps, QR codes, discount codes, T&C, and analytics.

## 2. Goals & non-goals

### Goals

- **Frictionless onboarding** — Simple flow completes in under 60 seconds, 3 fields maximum (name, email, T&C checkbox).
- **White-label per partner** — Each partner has their own branded landing page, logo, colors, copy, and confirmation email.
- **Configurable flow depth** — Partner admin picks one of three presets (Simple / Standard / Complete) to balance conversion vs. data completeness.
- **Attribution** — Every lead is tagged with `partner_id`, `shop_id`, and `sales_rep_id` so commission can be split downstream.
- **Self-service for partners** — Partner admins configure their own setup, generate QR codes, and see their own analytics without June internal intervention.
- **Operational simplicity for June** — Leads land in Supabase; a nightly digest goes to June CS who complete switches in the existing June backoffice.

### Non-goals (v1)

- Direct contract creation in the June API. This is **Phase 3**, blocked on June providing either a service account or a partner-lead endpoint.
- Real-time switch status feedback to the customer. Customer sees "We'll be in touch" — actual switch outcome is communicated by June CS.
- Commission payout automation. Tracking only; payout stays manual / finance-side.
- Full cohort/retention analytics. v1 is funnel + conversion rate + leads/day.
- Native iOS / Android apps from the store. PWA is sufficient for Phase 1.
- In-flow customer portal (account management post-onboarding). Customer uses June's existing portal.

## 3. Users & personas

| Persona | What they do | Primary surface |
|---|---|---|
| **Customer** (shop visitor) | Fills the onboarding form on the salesperson's tablet | Partner-branded landing page (PWA) |
| **Sales rep** | Opens the partner URL or scans the shop QR, picks their name, hands the device to the customer | Same landing page, with rep-select chip |
| **Partner admin** (IHPO ops) | Configures branding, flows, shops, reps, QR codes, T&C. Sees their analytics. | CMS dashboard |
| **June admin** | Onboards new partners, sets commission terms, can impersonate any partner, sees cross-partner analytics | CMS dashboard (elevated role) |
| **June CS agent** | Receives the nightly lead digest, completes switching in existing June backoffice | Email + existing June tools |

## 4. User flows

### 4.1 Customer / sales rep flow (Simple preset)

1. Sales rep scans shop QR (or opens bookmarked URL). Lands on `https://onboard.june.energy/p/{partner_slug}?shop={shop_id}`.
2. Landing screen: partner logo + June logo, slogan, CTA button, rep-picker chip ("Who's helping?" → dropdown of shop's reps).
3. Tap CTA → **Form**: name, email, T&C checkbox. (IBAN field hidden by partner config.)
4. Submit → success screen + "Check your email."
5. Customer receives Resend confirmation email within seconds. Email has (a) thank-you copy, (b) magic link to complete remaining fields if partner has deferred IBAN on, (c) June contact info.

**Target duration:** 30–45 seconds.

### 4.2 Customer / sales rep flow (Standard / Complete preset)

Same as Simple up through landing + rep pick. Then:

- **Standard**: name, email, phone, address (zip → street dropdown via `GET /city` + `GET /street`), T&C.
- **Complete**: all of Standard plus June's 9-step flow, optionally including Savings Simulation step (if partner enables it).

The Complete flow is a **progress-bar stepper** (like the "Version Complète" screenshot) with collapse-friendly groups: *1. Identité / 2. Logement / 3. Usage / 4. Domiciliation / 5. Confirmation*. Internally these group the 9 June API steps into 4–5 visible phases.

### 4.3 Partner admin flow (first-time setup)

1. June admin invites partner admin (email).
2. Partner admin sets password, lands in CMS scoped to their `partner_id`.
3. **Branding tab**: upload logo, pick primary/accent colors, write slogan (per locale).
4. **Flow tab**: pick preset, toggle IBAN in-flow/deferred, toggle savings sim.
5. **Shops tab**: add shops (name, address), generate QR per shop.
6. **Reps tab**: per shop, add reps (name, optional email).
7. **Content tab**: T&C (per locale), confirmation email subject + body (Markdown, with variables).
8. **Discounts tab**: create discount codes (code, amount/%, validity window).
9. Publish → partner goes live at `/p/{slug}`.

### 4.4 Nightly digest flow (June CS)

Every day at 06:00 Europe/Brussels, a Railway cron job:
1. Queries leads created in the last 24h, grouped by partner.
2. Generates a CSV attachment per partner.
3. Sends one digest email to June CS with all CSVs, and optionally one email per partner admin summarising their numbers (configurable per partner).

## 5. Feature specification

### 5.1 Partner configuration

| Field | Type | Scope | Notes |
|---|---|---|---|
| `name` | string | partner | Display name |
| `slug` | string | partner | URL slug, unique, used in `/p/{slug}` |
| `logo_url` | string | partner | Uploaded to Supabase Storage |
| `primary_color` | hex | partner | Main brand color |
| `accent_color` | hex | partner | Secondary brand color |
| `slogan_i18n` | jsonb | partner | `{ nl, fr, en }` |
| `locales_enabled` | string[] | partner | Subset of `['nl','fr','en']`, default all |
| `default_locale` | string | partner | One of the above |
| `flow_preset` | enum | partner | `simple` \| `standard` \| `complete` |
| `iban_behavior` | enum | partner | `in_flow` \| `deferred` \| `skip` |
| `savings_sim_enabled` | bool | partner | Only honored when `flow_preset = complete` |
| `product_sold` | enum | partner | `switch` \| `switch_plus` \| `premium` |
| `confirmation_email_subject_i18n` | jsonb | partner | Per locale |
| `confirmation_email_body_i18n` | jsonb | partner | Markdown per locale, supports `{{firstName}}`, `{{magicLink}}`, `{{partnerName}}`, `{{repName}}` |
| `tc_url_i18n` | jsonb | partner | External T&C URL per locale (simpler than hosting) |
| `digest_partner_email` | string \| null | partner | If set, partner gets daily digest too |
| `active` | bool | partner | Soft disable |

### 5.2 Shops & reps

```
partner 1---* shop 1---* sales_rep
```

**Shop:** `id`, `partner_id`, `name`, `address`, `city`, `zip`, `qr_token` (unique, 12-char random), `active`.

**Sales rep:** `id`, `shop_id`, `display_name`, `email` (optional, not used for login), `active`.

QR code encodes: `https://onboard.june.energy/p/{partner_slug}?shop={qr_token}`.

Landing page reads `shop` query param, looks up the shop, shows only that shop's reps in the picker.

### 5.3 Discount codes

| Field | Type | Notes |
|---|---|---|
| `code` | string | Uppercase, unique per partner |
| `type` | enum | `fixed_eur` \| `percent` |
| `amount` | number | In EUR or % |
| `valid_from` | timestamp | |
| `valid_to` | timestamp | |
| `max_uses` | int \| null | Global cap |
| `used_count` | int | Incremented on successful lead |
| `active` | bool | |

Codes are applied as metadata on the lead; actual fulfilment is June CS's job (tracked manually in v1).

### 5.4 Lead capture (Simple preset)

Required fields:
- `first_name` (string)
- `last_name` (string)
- `email` (validated)
- `tc_accepted_at` (timestamp, server-side)
- `locale` (from UI)
- `partner_id`, `shop_id`, `sales_rep_id` (from URL + rep picker)

Optional fields (per partner config):
- `iban` (if `iban_behavior = in_flow`)
- `phone`
- `discount_code`

### 5.5 Lead capture (Standard preset)

Simple + `phone`, `address` (street, house_number, zip, city, box), `language` (nl/fr, maps to June API enum), `date_of_birth`, `gender` (optional).

### 5.6 Lead capture (Complete preset)

Standard + June's 9-step data model (building type, construction, features, usage, residents, connection points, preferences). See API reference for the full schema. Stored in a structured `complete_flow_data` JSONB column.

**Optional savings simulation step** (only if `savings_sim_enabled = true`):
- Input: postal code, current supplier (from `GET /supplier` cached), current tariff type, rough usage (or derived from usage picks)
- Output: estimated yearly savings in EUR
- Purpose: motivate the customer before asking for IBAN / SEPA
- Service: `savings-estimator` module, June-tariff-reference-data backed

### 5.7 Confirmation email

Template variables available:
- `{{firstName}}`, `{{lastName}}`, `{{email}}`
- `{{partnerName}}`, `{{repName}}`, `{{shopName}}`
- `{{magicLink}}` — only generated if IBAN is deferred; links to `/complete/{token}` for remaining fields
- `{{confirmationId}}` — short human-readable ref (e.g. `JUN-AB1234`)

Sent via Resend immediately on lead submit. Retries 3× with exponential backoff if Resend returns an error.

### 5.8 Analytics (v1 MVP)

Partner admin dashboard shows:
- **Leads / day** — last 30 days, line chart
- **Conversion rate** — `completed_leads / landings` over the last 30 days, rolling 7-day line
- **Funnel** — landings → form-started → form-submitted → confirmed (email opened, optional), bar chart
- **Top reps** — simple table, top 5 reps by leads in period (only if partner has >1 rep)

Data source: Postgres views. Rendered with Recharts. No PostHog in v1 (evaluate for v2).

June admin dashboard adds cross-partner comparison (same metrics, stacked by partner).

### 5.9 T&C handling

Decision: partners host T&C externally (link to their own hosted PDF/page per locale). Much simpler than building a rich editor, and it shifts legal maintenance to the partner where it belongs. The CMS stores only the URL per locale. A version hash can be captured in the lead record if we later need to prove "user accepted T&C version X at time Y."

## 6. Permissions & multi-tenancy

Three roles (Supabase auth with a `profiles` table that maps user → role + partner):

| Role | Access |
|---|---|
| `june_admin` | All partners, read+write. Can impersonate. Sees cross-partner analytics. |
| `partner_admin` | Only their own `partner_id`. Read+write on config, leads, shops, reps, analytics. |
| `sales_rep` | *Not a CMS user in v1.* Reps are just records, not accounts. (Could become a login role in v2.) |

Row-Level Security (RLS) enforces `partner_id` scoping on every partner-scoped table. Every SQL query from the CMS flows through RLS, not application-layer checks.

## 7. Non-functional requirements

| Area | Requirement |
|---|---|
| **Performance** | Landing page LCP < 1.5s on 4G, mid-range Android. Form submit round-trip < 500ms (P95). |
| **Availability** | 99.5% monthly (Vercel + Supabase managed; no custom SLOs beyond that). |
| **Accessibility** | WCAG 2.1 AA on public-facing pages (landing + form). CMS is AA-best-effort. |
| **Privacy / GDPR** | Leads stored in EU region (Supabase eu-central-1 or eu-west). DPA with Supabase & Resend on file. Lead deletion endpoint for right-to-be-forgotten requests. T&C accept timestamp logged. IP logged for fraud only, pruned after 90 days. |
| **Security** | All CMS traffic HTTPS. RLS on all tables. Service role key never exposed client-side. OWASP top-10 baseline. |
| **Internationalization** | NL / FR / EN at launch. Locale detection by URL path or browser `Accept-Language` fallback. `next-intl` for routing + translations. |
| **Mobile** | PWA: installable, offline landing shell (form requires network to submit; offline submit queueing deferred to v2). |
| **Observability** | Sentry for errors on both frontend and Railway worker. Supabase logs for DB. Vercel analytics for traffic. |

## 8. Success metrics

For the IHPO pilot, we measure:

1. **Primary: completion rate** (leads submitted / QR scans) — target >40% for Simple, >25% for Complete.
2. Leads per shop per week — target baseline set after week 2.
3. Email delivery rate — target >99%.
4. Time-to-complete (Simple) — target median <60s.
5. Support tickets / leads — target <5% of leads trigger a CS question.

## 9. Open questions (to confirm with June)

1. **Service account for Phase 3.** Does June have (or will provide) a service-account credential that can provision contracts via `POST /user` + `POST /contract` from our Railway worker? Without this, Phase 3 (direct API ingest) stays blocked.
2. **Tariff reference data for savings sim.** Can we use `GET /supplier` + `GET /city` anonymously, or does this also require auth? If auth, we need a read-only service account.
3. **Commission model.** What % to shop, what % to rep, how is it paid? (Not needed for v1 build, but needed before go-live for the digest to carry the right info.)
4. **Lead format for June CS.** Does June CS want a specific CSV schema, or do we design it? Target format + delivery channel (email attachment vs. SFTP vs. something else)?
5. **Domain.** Staging uses `june-energy.app` (Cloudflare, June Energy owned). Production domain is still open — likely `onboard.june.energy` but pending confirmation from June.
6. **Dev credentials.** We have the dev `client_id` / `client_secret` from the API reference. Confirm these are safe to use from our backend during dev, and we need prod credentials from June before launch.

## 10. Out of scope for v1 (tracked for v2+)

- Direct June API ingest (Phase 3)
- Sales rep login accounts (for self-attribution + personal leaderboards)
- A/B testing framework per partner
- PostHog / cohort analytics
- In-flow SMS verification
- White-label confirmation email domains (`noreply@{partner_domain}`)
- Full-featured rich-text T&C editor
- Commission payout automation
- Offline form queueing
- Native app wrappers (Expo)
