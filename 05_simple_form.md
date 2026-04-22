# Briefing 05 — Simple Preset Form

**Phase:** 1 · **Est. effort:** 4 hours · **Prereqs:** Briefings 01–04

---

## Context

The Simple preset is the flagship "30-second" flow. Three fields: first+last name, email, T&C checkbox. This briefing builds the form UI + client-side validation. The `POST /api/leads` endpoint is Briefing 06.

See `01_PRD.md` §5.4 for the field spec.

**Design skills** (in `~/.claude/skills/`, see `docs/03_DEV_SETUP.md` §7.1): `ui-design/responsive-design`, `interaction-design/error-handling-ux`, `interaction-design/feedback-patterns`, `interaction-design/loading-states`, `designer-toolkit/ux-writing`. Run `/error-flow` to map validation and submit states.

## Goal

`/[locale]/p/[slug]/form` (with `?shop=...&rep=...`) renders a mobile-first form matching the Version Simple screenshot. Client-side validation via Zod + React Hook Form. Submit button disabled until form is valid + T&C checked.

## Tasks

1. Define the Simple lead schema in `packages/shared/src/lead-schema.ts`:
   ```ts
   export const simpleLeadSchema = z.object({
     firstName: z.string().min(1).max(80),
     lastName: z.string().min(1).max(80),
     email: z.string().email().max(200),
     tcAccepted: z.literal(true),
     // injected server-side: partner_id, shop_id, sales_rep_id, locale
   });
   ```
   Export from `@june/shared`, used by both client (validation) and server (re-validation at the route handler).

2. Create `components/public/SimpleForm.tsx`:
   - React Hook Form + `zodResolver(simpleLeadSchema)`.
   - Two inputs ("Prénom & Nom" as a single field that splits on first space, OR two separate inputs — pick the two-input pattern, the screenshot shows one combined, but splitting is error-prone, two fields are cleaner).
   - Email input with inline validation on blur.
   - T&C row: checkbox + text with link to `partner.tc_url_i18n[locale]`. Links open in new tab.
   - Submit button: disabled until form is valid + checkbox checked. When loading, show spinner.
   - Error states: inline under each field, red text, a11y via `aria-describedby`.

3. Create `app/[locale]/p/[slug]/form/page.tsx`:
   - Server component. Fetches partner + shop + rep (like the landing page).
   - Reads `partner.flow_preset` — if not `simple`, this briefing's route still renders Simple; other presets handled in Briefings 08–09.
   - Fires `form_started` event on first render (client side, in a `useEffect` with sessionStorage guard so it only fires once per session).
   - Passes partner + shop + rep to `<SimpleForm>`.

4. Honeypot + timing:
   - Add a hidden field `<input name="_hp" tabIndex={-1} autoComplete="off" style={{ display: 'none' }} />`.
   - Store form mount time in state; on submit, if `Date.now() - mountedAt < 1500`, block and show generic error.
   - Both signals get stripped before sending to the API (handled in Briefing 06).

5. On successful submit (Briefing 06 will make this real; for now stub it):
   - POST to `/api/leads` with `{ schema fields, partner_slug, shop_token, rep_id, locale }`.
   - On 200: route to `/[locale]/p/[slug]/done?ref={confirmation_id}`.
   - On 4xx: show toast with error message.
   - On 5xx: show toast "Something went wrong. Please try again."

6. Success page `/[locale]/p/[slug]/done?ref=...`:
   - Big confirmation icon.
   - "Merci !" / "Bedankt!" / "Thanks!"
   - "Your reference: JUN-AB1234" (from `?ref`).
   - "Check your email — we've sent a confirmation."
   - Partner-themed (same CSS vars).

## Acceptance criteria

- Form renders exactly matching the Version Simple screenshot aesthetic.
- Validation errors appear inline, in the right language.
- Submit is disabled until valid.
- Honeypot + timing checks work (try submitting immediately with a script — should fail).
- All copy comes from next-intl, not hardcoded.
- Works on mobile (test on 375px + 768px viewports).
- Lighthouse Accessibility score: 100.

## What NOT to do

- Do NOT implement the real API yet — Briefing 06.
- Do NOT implement IBAN collection — even if `iban_behavior = in_flow`, that's Standard/Complete preset territory; Simple is always name+email+T&C.
- Do NOT implement the Standard or Complete presets — separate briefings.

## Deliverable

PR titled "feat(public): Simple preset form + success page."
