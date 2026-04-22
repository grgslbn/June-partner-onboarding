# June Partner Onboarding — Planning Deliverables

This folder contains the complete planning package for building the June Partner Onboarding Platform — a white-labelable mobile onboarding flow for retail partners like IHPO.

---

## Read in this order

| # | Document | When to read | Audience |
|---|---|---|---|
| 1 | [`docs/01_PRD.md`](docs/01_PRD.md) | First. Product spec, what we're building and why. | Everyone |
| 2 | [`docs/02_ARCHITECTURE.md`](docs/02_ARCHITECTURE.md) | Second. Tech stack, data model, request flows, RLS. | Engineering |
| 3 | [`docs/03_DEV_SETUP.md`](docs/03_DEV_SETUP.md) | Before writing any code. Zero-to-running-locally. | Engineering |
| 4 | [`docs/04_DELIVERY_PLAN.md`](docs/04_DELIVERY_PLAN.md) | Before estimating timeline. Week-by-week scope. | Everyone |
| 5 | [`briefings/`](briefings/) | As you build. One per PR. Paste into Claude Code. | Engineering |

---

## Project at a glance

- **What:** Partner-branded mobile onboarding PWA + CMS. Retail salesperson hands the tablet to a customer who completes an in-store signup for June Energy.
- **Who's first:** IHPO (appliance retailer), production pilot Dec 2025 / Jan 2026.
- **Stack:** Next.js 15 + Supabase + Vercel + Railway + Resend. TypeScript everywhere.
- **Scope:** 3 flow presets (Simple / Standard / Complete), multi-tenant CMS with June + partner roles, nightly digest to June CS, per-partner analytics.
- **Not in v1:** Direct June API ingest (Phase 3), native apps, commission automation.

---

## Build phases

```
Phase 0 — Setup        (Week 1)         Briefings 01–03
Phase 1 — MVP          (Weeks 2–5)      Briefings 04–20
Phase 2 — Pilot polish (Week 6)         Briefings 21–23
Phase 3 — Direct API   (Post-pilot)     Future briefings, blocked on June
```

---

## Open questions for June (from PRD §9)

Before Phase 3:
1. Service account for direct contract creation?
2. Tariff reference data for savings simulator — API access or static provision?
3. Commission model (shop % / rep % / payout mechanism)?
4. CSV schema preference for the daily digest?
5. Production domain confirmation?
6. Production API credentials handover timing?

---

## How to use the briefings with Claude Code

1. Read `docs/01_PRD.md` through `docs/04_DELIVERY_PLAN.md` to build full context.
2. Start a new Claude Code session per briefing (don't combine — each is scoped intentionally).
3. Paste the briefing as the first user message. Claude Code should read the referenced doc sections before touching code.
4. One briefing = one PR = one feature. Don't batch them.
5. Briefings 01–07 are full length; 08–23 are in a combined compact file. Expand any of those to full length before you start it — by then you'll have working code to reference.
6. Use the skills listed in your original brief: `frontend-design`, `shadcn/ui`, `subagent-driven-development`, `test-driven-development`.

---

## Suggested next actions

1. **Today:** Read the PRD + Architecture. Push back on anything you disagree with before we start building.
2. **This week:** Send the "Open questions" list to your June contact. Kick off Week 1 infrastructure.
3. **Before Week 2 starts:** Have IHPO deliver brand assets (logo SVG, colors, T&C URLs, confirmation email copy).
