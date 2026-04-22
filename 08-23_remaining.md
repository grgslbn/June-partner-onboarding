# Briefings 08–23 — Compact Specifications

Briefings 01–07 are full-length in their own files. The remaining briefings follow the same format (Context → Goal → Tasks → Acceptance → NOT-to-do → Deliverable) but are specified more compactly here. Expand each into its own file when you're about to start it — by then you'll have working code to reference and can be more precise.

Format for each: when you expand it, copy the scaffold from Briefing 05 and fill in from the bullets below.

---

## 08 — Standard Preset Form (Week 3)

**Prereq:** 05, 06, 07 · **Effort:** 4h

**Design skills** (see `docs/03_DEV_SETUP.md` §7.1): `interaction-design/state-machine`, `interaction-design/micro-interaction-spec`.

**Goal:** Standard flow (name, email, phone, address with zip→street lookup, language, DOB, gender) works end-to-end.

**Key tasks:**
- Extend `lead-schema.ts` with `standardLeadSchema` (superset of simple + address + phone + language).
- Belgian zip code → city/street autocomplete. **Do not call June's API yet** — use a static dataset (the bpost postal codes CSV, imported as a static JSON in `packages/shared/src/data/belgian-postcodes.json`). Refresh quarterly.
- Multi-step stepper (2 steps: "Identité" + "Adresse"). Same visual language as the Version Complète screenshot.
- Route `/form?preset=standard` served when `partner.flow_preset = standard`.
- `POST /api/leads` extended to accept the Standard schema discriminated on `flowPreset` field.
- IBAN field appears only if `partner.iban_behavior = 'in_flow'`.

**Acceptance:** Setting `partners.flow_preset = 'standard'` for IHPO shows the Standard form end-to-end, lead row has all fields populated.

---

## 09 — Complete Preset Stepper (Week 3)

**Prereq:** 08 · **Effort:** 6h

**Design skills** (see `docs/03_DEV_SETUP.md` §7.1): `interaction-design/state-machine`, `interaction-design/micro-interaction-spec`, `interaction-design/loading-states`.

**Goal:** Complete flow — collapses June's 9 API steps into 5 visible UI phases.

**Key tasks:**
- Define step groups in `packages/shared/src/flow-presets.ts`:
  - Phase 1: Identité (firstName, lastName, email, phone, DOB, language, gender)
  - Phase 2: Logement (address, buildingType, squareMeters, construction)
  - Phase 3: Usage (features multi-select, electricity/gas usage multi-select, residents)
  - Phase 4: Connexions (EANs, meter type, digital meter — with "I don't know, I'll check" escape hatches that skip those fields)
  - Phase 5: Confirmation (preferences, IBAN if in_flow, T&C)
- `<StepperLayout>` component with progress bar, "Continuer"/"Retour" buttons, step indicator like the Version Complète screenshot.
- Field-level validation per phase; can't continue until current phase is valid.
- `complete_flow_data` JSONB populated with the full June-API-shaped payload on submit.
- Save draft in `sessionStorage` between step transitions so a refresh doesn't lose work.

**Acceptance:** Setting `partners.flow_preset = 'complete'` shows the 5-phase stepper; on submit, `leads.complete_flow_data` contains a valid June-API-ready object.

---

## 10 — Deferred IBAN Flow (Week 3)

**Prereq:** 07, 09 · **Effort:** 3h

**Goal:** When IBAN is deferred, customer completes it via email magic link.

**Key tasks:**
- `/[locale]/complete/[token]` route: looks up lead by `deferred_token`, shows minimal form (IBAN + SEPA checkbox).
- On submit: validates IBAN (BE-format; use `ibantools` lib), updates lead, sets `deferred_completed_at`, changes status to `complete`.
- If token invalid or already used: friendly "This link has expired" page.
- Token expires after 30 days (cron prunes; covered in Briefing 18).
- Event: `deferred_completed`.

**Acceptance:** Submit Simple with `iban_behavior = 'deferred'` → receive email with link → click link → complete form → lead.status becomes `complete`.

---

## 11 — Partner Theming Polish (Week 3)

**Prereq:** 04 · **Effort:** 2h

**Design skills** (see `docs/03_DEV_SETUP.md` §7.1): `design-systems/theming-system`, `design-systems/design-token`, `design-systems/component-spec`. Run `/tokenize` to formalise the partner token set.

**Goal:** Full design-system-level theming — partners can fully brand the experience.

**Key tasks:**
- CSS variables: `--partner-primary`, `--partner-accent`, `--partner-primary-fg` (auto-computed contrast foreground).
- Ensure buttons, progress bars, checkboxes, step indicators all use these variables.
- Logo upload in CMS (Briefing 13) stores to Supabase Storage; public pages read the public URL.
- Favicon: dynamically set to `partner.logo_url` on the public page (via `<link rel="icon">`).
- Email templates also respect partner primary color.
- Visual regression tests: capture baseline per-partner per-preset.

**Acceptance:** Change `partners.primary_color` to `#0055AA` → entire public flow + email reflects that color within one page refresh.

---

## 12 — CMS Auth + Profiles (Week 4)

**Prereq:** 02 · **Effort:** 3h

**Key tasks:**
- Supabase Auth with magic-link email flow.
- `profiles` table trigger: on `auth.users` insert, create a profile stub (role, partner_id nullable).
- Middleware: routes under `/admin/*` require a logged-in user with a profile row. Redirects to `/admin/login` if not.
- Server-side helper `getCurrentProfile()` returns `{ user, profile }` or throws.
- First-run UX: June admin manually inserts profiles for now (seed covers one demo `june_admin`).
- Logout clears cookies, redirects to `/admin/login`.

**Acceptance:** Log in as seeded june_admin → land at `/admin`. Log in as partner_admin → same route, but scoped UI.

---

## 13 — Partners CRUD (Week 4)

**Prereq:** 12 · **Effort:** 5h

**Design skills** (see `docs/03_DEV_SETUP.md` §7.1): `design-systems/component-spec`, `design-systems/pattern-library`, `design-systems/naming-convention`, `design-systems/icon-system`. Run `/create-component` per new form pattern.

**Key tasks:**
- List view at `/admin/partners`: table with slug, name, preset, active toggle. (June admin sees all; partner admin redirected to their own.)
- Detail view at `/admin/partners/[id]`: tabbed — Branding, Flow, Content, Advanced.
- Branding tab: logo upload (to Supabase Storage), primary/accent color pickers (use a shadcn-compatible color picker), slogan per locale.
- Flow tab: preset dropdown (simple/standard/complete), IBAN behavior radio, savings sim toggle, product sold.
- Content tab: confirmation email subject + body per locale (Markdown textarea + live React Email preview on the right).
- Advanced tab: digest email, active toggle, default locale, enabled locales multi-select.
- All CRUD through Supabase client with RLS enforcing scoping.

**Acceptance:** June admin can create a new partner + manage all fields. Partner admin can edit their own fields but can't see other partners (403 if they try).

---

## 14 — Shops + QR Generation (Week 4)

**Prereq:** 13 · **Effort:** 4h

**Design skills** (see `docs/03_DEV_SETUP.md` §7.1): `design-systems/component-spec`, `design-systems/pattern-library`, `design-systems/naming-convention`, `design-systems/icon-system`.

**Key tasks:**
- `/admin/partners/[id]/shops` — list + create + edit.
- Each shop has a "View QR" action that opens a modal with:
  - The full URL: `https://onboard.june.energy/{default_locale}/p/{slug}?shop={qr_token}`
  - A generated QR (via `qrcode` lib, SVG).
  - Download as PNG + SVG.
  - "Print-ready" leaflet preview (a simple PDF with the QR + partner logo + instruction text, generated via `@react-pdf/renderer` or puppeteer).
- QR token regeneration (with confirmation; old QRs become invalid).

**Acceptance:** A partner admin can create a shop, download a QR, print it, scan it with their phone, and land on a valid partner page.

---

## 15 — Reps CRUD (Week 4)

**Prereq:** 14 · **Effort:** 2h

**Design skills** (see `docs/03_DEV_SETUP.md` §7.1): `design-systems/component-spec`, `design-systems/pattern-library`, `design-systems/naming-convention`, `design-systems/icon-system`.

**Key tasks:**
- Nested under shops: `/admin/partners/[id]/shops/[shopId]/reps`.
- List + create + edit + soft-disable.
- Bulk import: paste CSV with `name,email`, parse and insert.

**Acceptance:** Can manage reps per shop. Disabling a rep removes them from the landing-page picker (but keeps past attribution intact).

---

## 16 — Discount Codes (Week 4)

**Prereq:** 13 · **Effort:** 2h

**Design skills** (see `docs/03_DEV_SETUP.md` §7.1): `design-systems/component-spec`, `design-systems/pattern-library`, `design-systems/naming-convention`, `design-systems/icon-system`.

**Key tasks:**
- `/admin/partners/[id]/discounts` — CRUD.
- Form: code (auto-uppercase), type (fixed_eur/percent), amount, valid window, max uses.
- Validation endpoint `POST /api/discounts/validate` — used by the public form if the partner opts in (Simple preset doesn't show this; Standard + Complete have an optional "Have a code?" expandable).
- Increments `used_count` on successful lead submit if the code was valid.

**Acceptance:** Create code `BLACK50`, apply in a lead, code.used_count becomes 1.

---

## 17 — Analytics Views (Week 5)

**Prereq:** 13 · **Effort:** 4h

**Design skills** (see `docs/03_DEV_SETUP.md` §7.1): `ui-design/data-visualization`.

**Key tasks:**
- `/admin/partners/[id]/analytics` dashboard:
  - Card: Leads today / Leads this week / Leads this month.
  - Line chart: leads per day last 30 days (Recharts).
  - Line chart: conversion rate (7-day rolling) — `(form_submitted events / landing_view events)` per day.
  - Funnel bar chart: landing_view → form_started → form_submitted → email_opened.
  - Table: top 5 reps by leads (if partner has >1 rep).
- Date range picker: 7d / 30d / 90d / custom.
- Server-side data fetching via Postgres views; no client-side DB access.
- June admin has a global version at `/admin/analytics` aggregating all partners with partner legend.

**Acceptance:** Submit 10 test leads across 3 reps over 3 days → dashboard shows correct counts, correct top reps, correct funnel.

---

## 18 — Daily Digest Worker (Week 5)

> **Deployment note:** No Dockerfile for the worker. Railway auto-detects the Node app via Nixpacks (uses `package.json` `build` + `start` scripts). Use `railway.json` only if you need custom build steps; the defaults should work.

**Prereq:** 07 (retry queue), 17 (analytics) · **Effort:** 4h

**Key tasks:**
- Railway worker at `apps/worker` (scaffolded in Briefing 01).
- Cron: every day 06:00 Europe/Brussels.
- Job `daily-digest`:
  - Query all `leads` created in the last 24h (excluding deleted).
  - Group by partner.
  - For each partner: generate a CSV (columns: confirmation_id, created_at, shop name, rep name, first_name, last_name, email, phone, iban, status, flow_preset).
  - Send one email to `JUNE_CS_EMAIL` env var with all CSVs attached.
  - If `partner.digest_partner_email` set: send a per-partner summary email (counts, top rep, link to dashboard — NOT PII-containing CSV).
- Cron: every 5 min, `email-retry` job processes `email_retry_queue`:
  - Pick rows where `next_attempt_at <= now()` and `attempt < 5`.
  - Re-send; on success, delete row; on failure, increment attempt, next_attempt_at = now + 2^attempt minutes.
- Cron: every day 03:00 Europe/Brussels, `ip-pruner`: `UPDATE leads SET ip_address = NULL WHERE created_at < now() - interval '90 days' AND ip_address IS NOT NULL`.
- Cron: every day 04:00, `deferred-token-expiry`: mark tokens older than 30 days as null.

**Acceptance:** Deploy worker to Railway. Wait 24h (or manually trigger). CS email arrives with correctly-formatted CSVs per partner. Retry queue empties.

---

## 19 — PWA Setup (Week 5)

**Prereq:** 04, 08, 09 · **Effort:** 2h

**Key tasks:**
- Add `next-pwa` (or Serwist) to `apps/web`.
- `manifest.webmanifest`: partner-aware dynamically (generated per partner slug, name + icons from `partner.logo_url`).
- Service worker: cache static assets (fonts, CSS, JS chunks); network-only for API routes + HTML.
- "Install to home screen" prompt: on Android, use `beforeinstallprompt`; on iOS, show a manual tutorial step after a lead submit (iOS doesn't support programmatic install).
- Offline page: graceful "No connection" state for the landing route.
- **Do not** enable offline form queueing (deferred to v2).

**Acceptance:** Visit the IHPO landing page on an Android tablet → browser shows "Install" option → installed app launches to IHPO landing, offline-ready shell.

---

## 20 — Performance + a11y Pass (Week 5)

**Prereq:** all above · **Effort:** 3h

**Design skills** (see `docs/03_DEV_SETUP.md` §7.1): `design-systems/accessibility-audit` is the primary audit framework; `axe-playwright` is the CI automation that enforces it.

**Key tasks:**
- Run Lighthouse CI on public pages; document results.
- Measure Core Web Vitals with Vercel Analytics in production.
- Fix LCP offenders: preload fonts, inline critical CSS, optimise hero image.
- Follow `design-systems/accessibility-audit` as the audit framework; automate it with `axe-playwright` on landing + each form preset; fix all violations. Target: zero violations + Lighthouse Accessibility = 100 on every public page.
- Test with VoiceOver (iOS) and TalkBack (Android) on a real device for the Simple flow.
- Keyboard-only navigation test: full flow completable without a mouse.

**Acceptance:** Lighthouse mobile: Performance >90, Accessibility 100, Best Practices >90, SEO >90. Zero axe violations on any public page.

---

## 21 — Partner Self-Service (Week 6)

**Prereq:** 12, 13 · **Effort:** 3h

**Key tasks:**
- Feature flag `PARTNER_SELF_SERVICE_ENABLED` per partner (add `self_service_enabled` bool column to partners).
- When enabled, partner admin sees full CMS; when disabled, partner admin sees a read-only "Your config" page.
- Audit log: every CMS write by a partner admin captured in an `audit_log` table (who, what, when, before, after).
- Email notification to June admin on certain sensitive changes (primary_color swap mid-campaign, T&C URL change).

**Acceptance:** Flip flag for IHPO → IHPO admin can edit their own branding + flow preset. Every edit appears in `audit_log`.

---

## 22 — Savings Simulator (Week 6)

**Prereq:** 09 · **Effort:** 5h

**Key tasks:**
- `packages/shared/src/savings-estimator/` — pure calc module:
  - `estimate({ zip, currentSupplierId?, currentTariffType?, usage, residents, hasSolar }) → { minYearly, maxYearly, confidence }`
  - Backed by a static `tariff-reference.json` (to be provided by June or derived from their public tariffs page).
  - Unit tests cover the 3 confidence tiers.
- Optional step in Complete flow (between Phase 3 Usage and Phase 4 Connexions): "Voyons vos économies…" → renders the estimate with a "€X – €Y / an" range.
- Controlled by `partner.savings_sim_enabled`.
- Event: `savings_shown` with the estimated range in meta.

**Acceptance:** IHPO with `savings_sim_enabled = true` shows the estimate step in Complete flow. Unit test coverage >80% on the estimator module.

---

## 23 — Go-Live Prep (Week 6)

**Prereq:** all above · **Effort:** 3h

**Key tasks:**
- Domain `onboard.june.energy` pointed to Vercel; SSL active.
- Resend domain verified on prod.
- Production Supabase project: schema migrated, RLS re-verified against prod config.
- Point-in-time recovery enabled on Supabase.
- Sentry release tracking + source map upload in CI.
- Final copy review with IHPO (Markdown content).
- Load test with k6: 100 concurrent users for 5 minutes.
- Rollback runbook: `docs/RUNBOOK.md` with step-by-step for `vercel rollback`, DB migration rollback, DNS failover.
- Test device matrix: iPad, iPhone 13+, Samsung Galaxy Tab, mid-range Android phone. Full flow works on each.

**Acceptance:** All items in `04_DELIVERY_PLAN.md` §"Go-live checklist" are checked off.
