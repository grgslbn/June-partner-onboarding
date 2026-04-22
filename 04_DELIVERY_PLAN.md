# Delivery Plan — June Partner Onboarding

**Target:** IHPO production pilot, Dec 2025 / Jan 2026 · **Build window:** ~6–8 weeks

---

## Assumptions

- One developer (you) working with Claude Code, ~20–30 productive hours/week.
- Design decisions in this doc set are locked; changes mid-build cost time.
- June provides: dev API credentials (already in hand), a list of suppliers for the savings estimator, and a decision on Phase 3 service account within 2 weeks of kickoff.
- IHPO provides: logo assets, brand colors, T&C URLs per locale, list of shop addresses, list of sales reps, confirmation email copy.

---

## Phase overview

| Phase | Scope | Window | Gate |
|---|---|---|---|
| **Phase 0 — Setup** | Repo, infra, first deploy | Week 1 | `ihpo` demo partner loads at staging URL |
| **Phase 1 — MVP** | Simple + Standard + Complete flows, CMS (June-admin only), nightly digest | Weeks 2–5 | Internal e2e test passes; IHPO signs off on staging |
| **Phase 2 — Pilot polish** | Partner self-service CMS, savings simulator, discount codes, analytics polish | Week 6 | IHPO pilot go-live |
| **Phase 3 — Direct API ingest** | Replace CSV digest with live June API sync | Post-pilot, when June service account ready | Flipped via feature flag, CSV stays as fallback |

---

## Week-by-week

### Week 1 — Foundations (Phase 0)

**Goal:** Repo scaffolded, local dev works, staging deploys.

- Day 1–2: Run `03_DEV_SETUP.md` end-to-end. Repo, monorepo structure, local Supabase, first commit.
- Day 3: Schema migration applied locally and on Supabase cloud. Seed data runs. Types generated.
- Day 4: Next.js app renders base routes. Tailwind + shadcn installed. i18n scaffold with NL/FR/EN stubs.
- Day 5: Vercel + Railway deploy from `main`. First public URL up. Sentry capturing errors.

**Deliverable:** Blank partner landing page at `https://<staging>.vercel.app/p/ihpo` that shows partner name and "Coming soon."

**Claude Code briefings:** `01_setup`, `02_schema_and_seed`, `03_i18n_scaffold`.

---

### Week 2 — Public flow: Simple preset

**Goal:** A customer can complete the Simple flow and land in Supabase.

- Landing page component with partner-themed hero (logo, colors from DB).
- Rep picker chip component.
- Simple form component (name, email, T&C).
- `POST /api/leads` route handler with Zod validation, partner/shop resolve, insert.
- `events` tracking (landing_view, form_started, form_submitted).
- Resend integration — confirmation email via React Email template.
- Success screen.
- e2e test: visit landing → pick rep → fill form → submit → verify lead row + email sent (using Resend's test mode).

**Deliverable:** IHPO Simple flow works end-to-end on staging.

**Claude Code briefings:** `04_public_landing`, `05_simple_form`, `06_lead_api`, `07_confirmation_email`.

---

### Week 3 — Public flow: Standard + Complete presets

**Goal:** All three presets work; partner config switches them at runtime.

- Standard preset: add phone, address (with zip → street/city lookup via a local cache of Belgian postcodes, NOT June's API yet, to avoid blocking).
- Complete preset: multi-step stepper, progress bar, grouped June-API-mapped fields.
- `complete_flow_data` JSONB populated on submit.
- Deferred IBAN: magic link token generated, email includes link, `/complete/[token]` page collects IBAN.
- Flow preset selection logic in landing: reads `partner.flow_preset` + overrides.
- Partner theming fully applied (primary, accent, slogan, logo).

**Deliverable:** Can switch IHPO between Simple/Standard/Complete by changing a DB column; all three work.

**Claude Code briefings:** `08_standard_preset`, `09_complete_preset_stepper`, `10_deferred_iban`, `11_partner_theming`.

---

### Week 4 — CMS: June-admin only

**Goal:** A June admin can manage partners, shops, reps, without touching the DB.

- Supabase Auth (email + magic link) for CMS.
- `profiles` table + middleware that enforces role + partner scoping on every route.
- CMS layout: nav, header with partner switcher (for june_admin).
- **Partners CRUD** — list, create, edit. Logo upload to Supabase Storage.
- **Shops CRUD** — per partner, with QR code generator (SVG + downloadable PNG).
- **Reps CRUD** — per shop.
- **Discount codes CRUD** — per partner.
- RLS policies tested (automated: insert as one partner, verify can't read another).

**Deliverable:** Non-dev can manage IHPO's setup via the CMS.

**Claude Code briefings:** `12_cms_auth`, `13_partners_crud`, `14_shops_qr`, `15_reps_crud`, `16_discount_codes`.

---

### Week 5 — Analytics, digest, polish

**Goal:** Pilot-ready.

- Analytics views: leads/day, conversion rate, funnel — rendered with Recharts.
- Railway worker: daily digest job with CSV generation per partner.
- Email templates for: confirmation (existing), daily digest to CS, daily summary to partner admin.
- PWA manifest + icons; installable on tablet.
- Performance pass: LCP, initial JS budget checks.
- a11y pass on public flow (axe).
- Visual regression baseline captured.
- Load test: 50 concurrent lead submits, verify no dropped emails.

**Deliverable:** Ready for IHPO sign-off on staging.

**Claude Code briefings:** `17_analytics_views`, `18_daily_digest_worker`, `19_pwa_setup`, `20_perf_and_a11y`.

---

### Week 6 — Phase 2 features + IHPO go-live

**Goal:** Pilot goes live with real customers.

- Partner self-service CMS access (feature flag flipped for IHPO).
- Savings simulator module + optional step in Complete flow.
- Final copy review with IHPO.
- Production domain setup (`onboard.june.energy`).
- DNS cutover, SSL, Resend domain verification on production.
- Monitoring + alerting smoke test.
- **Go-live checklist** (below).

**Deliverable:** IHPO pilot live.

**Claude Code briefings:** `21_partner_self_service`, `22_savings_simulator`, `23_go_live_prep`.

---

### Weeks 7–8 — Pilot support + Phase 3 prep

**Goal:** Stable pilot + preparation for direct June ingest.

- Daily monitoring + bugfix cycles.
- Weekly review with IHPO on funnel numbers.
- Meanwhile: `packages/june-api/` gets completed with all Phase-3-relevant endpoints.
- `apps/worker/src/jobs/phase3-june-sync.ts` built and tested against June's dev environment.
- Feature-flagged: once June provides a service account, flip for selected partners.

**Deliverable:** Stable pilot + Phase 3 ready to flip on.

---

## Go-live checklist (end of Week 6)

- [ ] All env vars set correctly on Vercel Production and Railway Production.
- [ ] Supabase production project backed up and has point-in-time recovery enabled.
- [ ] Resend domain verified, SPF/DKIM/DMARC green.
- [ ] DNS for `onboard.june.energy` pointing to Vercel, SSL cert issued.
- [ ] Sentry release tracking active; source maps uploaded.
- [ ] Rate limiting live on `/api/leads`.
- [ ] Privacy policy + T&C URLs confirmed by IHPO per locale.
- [ ] Daily digest cron runs on schedule; test email received by CS.
- [ ] Lead deletion endpoint works (GDPR right-to-be-forgotten).
- [ ] At least one end-to-end test on a real device (iPad + Android tablet).
- [ ] At least one successful lead from a test QR scan in a real IHPO shop.
- [ ] Rollback plan documented: revert Vercel deploy + DB migration rollback SQL on hand.

---

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **June doesn't provide service account in time** | Medium | Low (Phase 3 only) | Ship Phases 1–2 with CSV digest; Phase 3 is additive |
| **Resend deliverability issues in Belgium** | Low | Medium | EU region + warmed-up domain; Postmark as fallback |
| **IHPO brand assets delayed** | Medium | Medium | Ship with placeholder; swap via CMS post-deploy |
| **Sales reps don't adopt rep picker** | Medium | High (breaks attribution) | Simple 1-tap UX; fallback "I'll pick later" option that flags for manual attribution |
| **PWA install friction on iPad Safari** | Medium | Low | Document "Add to Home Screen" flow; iOS tablets don't fire `beforeinstallprompt` |
| **Zip→street lookup data out of date** | Low | Low | Use bpost dataset; refresh quarterly via worker |
| **Bot / abuse on public endpoint** | Medium | Medium | Rate limit + honeypot at launch; Turnstile if needed |
| **RLS misconfiguration leaks data** | Low | Critical | RLS tests in CI; manual audit before go-live |

---

## Deferred to v2+

Explicit no-gos for this build:

- Native mobile apps (Expo wrapper)
- Sales rep login / leaderboards
- A/B testing framework per partner
- Rich T&C editor (stays as external URL)
- Cohort / retention analytics
- In-flow SMS verification
- Commission payout automation
- White-label confirmation-email domains per partner
- Offline form queue
- Real-time switch status display to customer

---

## Cost envelope (monthly, production)

Rough ballpark for the IHPO pilot scale (up to ~500 leads/month):

| Service | Plan | Est. cost |
|---|---|---|
| Vercel | Pro | ~€20 |
| Supabase | Pro | ~€25 |
| Railway | Hobby | ~€5 |
| Resend | Pro | ~€20 |
| Sentry | Developer | Free (5K events) |
| Domain + Cloudflare | | ~€1 |
| **Total** | | **~€70/mo** |

Scales comfortably to several thousand leads/month without plan upgrades.
