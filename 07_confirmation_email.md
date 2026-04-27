# Briefing 07 — Confirmation Email (Resend + React Email)

**Phase:** 1 · **Est. effort:** 3 hours · **Prereqs:** Briefings 01–06

---

## Context

After a lead submits, we send a branded confirmation email within seconds. Partner-controlled subject + body (Markdown), with standard variables. Rendered via React Email, sent via Resend.

See `01_PRD.md` §5.7 for template variable list and `02_ARCHITECTURE.md` §5 for the request flow.

**Design skills** (in `~/.claude/skills/`, see `docs/03_DEV_SETUP.md` §7.1): `designer-toolkit/ux-writing` for subject and body tone across locales.

## Goal

Real Resend-backed confirmation email that renders per-partner Markdown copy with substituted variables. If partner has `iban_behavior = 'deferred'`, email includes the magic link. Failed sends are logged and retried by the worker (retry queue; real worker impl in Briefing 18).

## Tasks

1. **React Email template** `apps/web/emails/ConfirmationEmail.tsx`:
   - Props: `{ partner, lead, magicLink?, locale }`.
   - Layout: partner logo header (from `partner.logo_url`), partner primary color accent bar, body with rendered Markdown copy, footer with `{{confirmationId}}` + June contact info.
   - Render `partner.confirmation_email_body_i18n[locale]` (Markdown) with a Markdown→React component (use `@react-email/components` where possible, `react-markdown` for the body).
   - Substitute variables: `{{firstName}}`, `{{lastName}}`, `{{email}}`, `{{partnerName}}`, `{{repName}}`, `{{shopName}}`, `{{magicLink}}`, `{{confirmationId}}`.
   - If `magicLink` is missing, strip any paragraph containing `{{magicLink}}` entirely (don't leave broken links).

2. **Sender helper** `lib/emails/send-confirmation.ts`:
   ```ts
   export async function sendConfirmationEmail(leadId: string): Promise<void>
   ```
   - Fetches lead + partner + shop + rep from DB.
   - Builds magicLink if `deferredToken` exists: `${SITE_URL}/${locale}/complete/${deferredToken}`.
   - Renders the template via `@react-email/render`.
   - Subject: substituted `partner.confirmation_email_subject_i18n[locale]`, fallback to "Bienvenue chez June" / "Welkom bij June" / "Welcome to June".
   - Sends via Resend, from `onboarding@pos.june-energy.app` (configurable via `RESEND_FROM_EMAIL` env; will switch to `onboarding@onboard.june.energy` when production domain confirmed).
   - On Resend error: mark `confirmation_email_sent_at` as null and write to a `email_retry_queue` table (create in this briefing's migration):
     ```sql
     create table email_retry_queue (
       id uuid primary key default gen_random_uuid(),
       lead_id uuid not null references leads,
       attempt int not null default 0,
       next_attempt_at timestamptz not null default now(),
       last_error text,
       created_at timestamptz default now()
     );
     ```
   - On Resend success: set `leads.confirmation_email_sent_at = now()`.

3. **Webhook for email opens** `app/api/resend-webhook/route.ts`:
   - Validates Resend webhook signature.
   - On `email.opened` event: set `leads.confirmation_email_opened_at = now()` if lead found by email subject or custom tag.
   - Tag emails with `leadId` via Resend's `tags` feature so webhooks can match.

4. **Dev mode:**
   - If `process.env.NODE_ENV !== 'production'`: log the rendered HTML to console and skip the actual send, unless `RESEND_DEV_SEND=true` is set.
   - Seed the IHPO partner with realistic NL + FR confirmation templates so dev emails look real.

5. **Template variable safety:**
   - All substitutions HTML-escape first.
   - If a required variable is missing (e.g. `{{repName}}` but no rep selected), substitute with a neutral fallback ("our team") — don't leave `{{repName}}` in the output.

## Acceptance criteria

- Submit a Simple lead in dev → console shows a rendered HTML email.
- Set `RESEND_DEV_SEND=true` + a real Resend API key → real email arrives in your inbox.
- Webhook receives an open event → `confirmation_email_opened_at` gets populated.
- Triggering a Resend error (invalid API key) → lead is NOT inserted-with-sent-flag; retry queue row exists.
- Magic link renders only when `deferred_token` is present.

## What NOT to do

- Do NOT build the worker's retry loop yet — Briefing 18.
- Do NOT build the `/complete/[token]` flow — Briefing 10.
- Do NOT SMTP-send directly — go through Resend.

## Deliverable

PR titled "feat(email): confirmation email via Resend + React Email."
