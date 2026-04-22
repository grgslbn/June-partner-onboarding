# Briefing 03 — i18n Scaffold (NL/FR/EN)

**Phase:** 0 · **Est. effort:** 2 hours · **Prereqs:** Briefings 01–02

---

## Context

Belgium v1 requires Dutch, French, and English. Partner-controlled copy (slogans, email bodies, T&C URLs) lives in the DB as JSONB, keyed by locale. UI chrome (button labels, validation messages, error states) lives in `next-intl` message files.

See `02_ARCHITECTURE.md` §7.4.

## Goal

`next-intl` is wired into `apps/web`. The routes `/nl/p/ihpo`, `/fr/p/ihpo`, `/en/p/ihpo` all render, each pulling the right locale messages. Partner-controlled copy (slogan) reads from the DB's JSONB column.

## Tasks

1. Install `next-intl`, configure middleware to handle locale prefix.
2. Create `apps/web/messages/nl.json`, `fr.json`, `en.json` with the following namespaces:
   - `public.landing` — `welcome`, `selectRep`, `startButton`
   - `public.form` — `firstName`, `lastName`, `email`, `phone`, `tcAccept`, `submitButton`, `validation.required`, `validation.email`
   - `public.success` — `title`, `message`, `checkEmail`
   - `cms.nav` — stubs for `partners`, `shops`, `reps`, `leads`, `analytics`, `settings`
   - Only the public namespaces need real content now; CMS can be placeholder.
3. Write authentic-sounding copy in all three languages. Translations must be native quality — if you're unsure, leave a `// TODO: review` comment, don't guess.
4. Build a helper `getPartnerCopy(partner, locale, field)` in `packages/shared/src/i18n.ts` that:
   - Reads `partner[field]` (which is JSONB like `{ nl, fr, en }`)
   - Returns the value for the requested locale, falling back to `partner.default_locale`, falling back to empty string.
   - Fully typed with a generic.
5. Create a test route `/[locale]/p/[slug]` that renders:
   - `t('public.landing.welcome')` (from messages)
   - `getPartnerCopy(partner, locale, 'slogan_i18n')` (from DB)
   - Side by side, so you can verify both paths work.
6. Locale negotiation: if browser accepts `nl-BE`, route to `/nl`. Default to `partner.default_locale` if no prefix. If prefix not in `partner.locales_enabled`, 404.

## Acceptance criteria

- `http://localhost:3000/nl/p/ihpo` renders with Dutch UI copy and Dutch slogan (if set).
- `http://localhost:3000/fr/p/ihpo` renders French.
- `http://localhost:3000/en/p/ihpo` — if `en` NOT in `partner.locales_enabled`, returns 404.
- `http://localhost:3000/p/ihpo` (no locale) redirects to `/fr/p/ihpo` (partner default).
- Unit test for `getPartnerCopy` covers: present value, missing locale fallback, missing all values → empty string.

## What NOT to do

- Do NOT build the actual landing UI yet — Briefing 04 does that.
- Do NOT use a locale-picker UI for the customer. Partner's QR URL always has the locale pinned.

## Deliverable

PR titled "feat(web): i18n scaffold with next-intl."
