# Briefing 06 — Lead Submit API + Events Pipeline

**Phase:** 1 · **Est. effort:** 4 hours · **Prereqs:** Briefings 01–05

---

## Context

This is the server-side half of the Simple flow. Public endpoint that accepts leads, validates, inserts, fires confirmation email (next briefing), and records events. Latency-sensitive — target P95 < 500ms.

See `02_ARCHITECTURE.md` §4 for the exact request flow and latency budget.

## Goal

`POST /api/leads` accepts a Simple-preset lead and returns `{ confirmationId, deferredToken? }`. `POST /api/events` accepts event pings from the public pages. Both are rate-limited and hardened.

## Tasks

1. **`POST /api/leads`** in `app/api/leads/route.ts`:
   - Accepts JSON body: `{ ...simpleLeadSchema fields, partnerSlug, shopToken, salesRepId?, locale, honeypot? }`.
   - Immediately reject if `honeypot` is non-empty.
   - Validate with Zod (server-side re-validation of `simpleLeadSchema` + the metadata fields).
   - Resolve partner by slug (cached in-memory, 60s TTL). If not found or not active → 404.
   - Resolve shop by `qr_token`. If shop.partner_id ≠ partner.id → 404 (attribution integrity).
   - If `salesRepId` present, verify it belongs to that shop. If not, log a warning event but don't reject (graceful degradation — the rep might have been deleted mid-session).
   - Insert into `leads` with status = `submitted`, `tc_accepted_at = now()`, `ip_address` from `X-Forwarded-For`, `user_agent` from headers.
   - If `partner.iban_behavior = 'deferred'`, generate a `deferred_token` (32 chars, URL-safe) and store on the lead.
   - Insert a `form_submitted` event.
   - Fire confirmation email async (Briefing 07 implements this — for now call a stub `await sendConfirmationEmail(lead, partner)`).
   - Return `{ confirmationId: lead.confirmation_id, deferredToken: lead.deferred_token || null }`.

2. **`POST /api/events`** in `app/api/events/route.ts`:
   - Accepts `{ eventType, partnerSlug, shopToken?, leadId?, sessionId?, meta? }`.
   - Whitelist `eventType` against the DB check constraint values.
   - Resolve partner_id + shop_id.
   - Insert into `events`.
   - Always returns 204, even on errors (don't block page flow for analytics).
   - Fire-and-forget from the client.

3. **Rate limiting:**
   - Use a Postgres-backed counter table (simpler than Upstash for v1, we have the DB already):
     ```sql
     create table rate_limits (
       key text primary key,
       count int not null default 0,
       window_start timestamptz not null default now()
     );
     ```
   - Helper `async function rateLimit(key: string, max: number, windowSeconds: number): Promise<boolean>`.
   - On `/api/leads`: limit per IP (max 5/min) and per shop_token (max 20/min).
   - On `/api/events`: limit per IP (max 120/min) — chatty, higher limit.

4. **Partner caching:**
   - `lib/partner-cache.ts` with a Map<slug, { partner, fetchedAt }>.
   - TTL 60s. Refresh on miss or stale.
   - Keep the hot path synchronous after first request.

5. **Tests** (in `apps/web/__tests__/api/`):
   - Happy path Simple lead → 200 + lead row + event row.
   - Honeypot filled → 400.
   - Bad partner slug → 404.
   - Shop token from different partner → 404 (attribution forgery test).
   - Rate limit exceeded → 429.
   - Invalid email → 400 with specific error.

## Acceptance criteria

- `curl` submit of a valid Simple lead returns 200 with `{ confirmationId, deferredToken }`.
- Row appears in `leads` with all fields populated correctly.
- Matching `form_submitted` event exists.
- Under `k6` or `autocannon` load (100 req/s for 30s), P95 < 500ms.
- All tests in the new test file pass.
- Trying to forge attribution (shop_token from partner A with partner_slug B) returns 404.

## What NOT to do

- Do NOT implement real email sending — Briefing 07. Stub it.
- Do NOT implement Standard / Complete preset handling — just Simple for now. Reject unknown presets with 400.
- Do NOT implement the `/complete/[token]` deferred IBAN flow — Briefing 10.

## Deliverable

PR titled "feat(api): lead submit + events endpoints with rate limiting."
