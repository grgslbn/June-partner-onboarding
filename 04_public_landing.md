# Briefing 04 — Public Landing Page

**Phase:** 1 · **Est. effort:** 4–5 hours · **Prereqs:** Briefings 01–03

---

## Context

This is the first thing a customer sees after scanning a shop QR. The reference design is the "Version Simple" screenshot in the project brief — partner logo + June logo, red hero, slogan, CTA button. Here it also gets a rep-picker chip.

**Design skills** (in `~/.claude/skills/`, see `docs/03_DEV_SETUP.md` §7.1): `ui-design/layout-grid`, `ui-design/visual-hierarchy`, `ui-design/spacing-system`, `ui-design/typography-scale`, `ui-design/color-system`, `design-systems/theming-system`. Run `/design-screen` for the initial pass.

## Goal

A partner-themed, mobile-first, responsive landing page at `/[locale]/p/[slug]`. Reads partner from DB. Applies partner colors as CSS variables. Renders rep picker from `shop` query param. "Start" button routes to the form (which doesn't exist yet — stub it).

## Tasks

1. Install shadcn/ui if not already (`pnpm dlx shadcn@latest init`, then add `button`, `card`, `select`).
2. Create a **server component** `app/[locale]/p/[slug]/page.tsx`:
   - Fetch partner by slug via `createServiceClient()` (or a scoped RLS-respecting anon client — think through which is safer here).
   - If not found or `!partner.active`, 404.
   - Read `?shop=<qr_token>` — fetch shop + its reps.
   - If shop token doesn't match this partner, 404.
   - Pass all data to a client component `<LandingScreen>`.
3. Create `components/public/LandingScreen.tsx`:
   - Hero: partner logo (top) + June logo (next to it), slogan from `getPartnerCopy`.
   - Rep picker chip: `<Select>` showing "Qui vous aide ?" / "Wie helpt u?" / "Who's helping?" → options are the shop's active reps.
   - Primary CTA button: "Commencer" / "Beginnen" / "Get started" — disabled until rep is picked (unless shop has zero active reps, in which case show "Anonymous lead" mode).
   - On CTA click: navigate to `/[locale]/p/[slug]/form?shop=...&rep=...`.
4. **Partner theming:**
   - In the server component, compute a style object `{ '--primary': partner.primary_color, '--accent': partner.accent_color }` and apply to the root wrapper.
   - All custom colours in the landing use `var(--primary)` / `var(--accent)`.
   - Text color logic: if primary is dark, text is white; if light, text is dark. Compute luminance server-side.
5. Fire a `landing_view` event (via `/api/events` — stub the endpoint for now, real impl in Briefing 06).
6. Add the "Sans engagement · Résiliable à tout moment" footer line per locale.
7. **Mobile-first:** single column, max-width 420px, centered. Test on iPhone SE width (375px).

## Design references

- Screenshot 1 ("Version Simple") from the brief is your north star for the hero.
- Apply `ui-design/layout-grid`, `ui-design/spacing-system`, `ui-design/typography-scale` for card, spacing, and typography; `design-systems/theming-system` for the partner-primary CSS-variable pattern.
- June red `#E53935` is the IHPO primary (from seed data). Don't hardcode — always `var(--primary)`.
- The June wordmark logo is at `https://raw.githubusercontent.com/grgslbn/June-brand-assets/main/logo/June_logo_white.svg`.

## Acceptance criteria

- `/fr/p/ihpo?shop=demo-shop-qr` renders a beautiful, IHPO-themed landing page on a 375px-wide viewport.
- Lighthouse mobile score: Performance >90, Accessibility 100, Best Practices >90.
- Changing `partners.primary_color` in DB + refresh shows new color without code changes.
- Changing `partners.slug` breaks the URL (returns 404) — proves slug is the only lookup.
- Rep picker shows exactly the reps for the shop in the URL.
- No hardcoded copy — everything is either next-intl or DB.
- Works on iPad and mid-range Android in responsive-mode testing.

## What NOT to do

- Do NOT build the form yet — just route to a stub page saying "Form coming in Briefing 05."
- Do NOT wire up real event tracking — stub the endpoint.
- Do NOT add a locale switcher — the QR URL locks the locale.
- Do NOT add analytics/cookie banner — deferred to pre-launch.

## Deliverable

PR titled "feat(public): partner-themed landing page with rep picker."
