# Briefing 02 — Supabase Schema, RLS & Seed Data

**Phase:** 0 · **Est. effort:** 3–4 hours · **Prereqs:** Briefing 01 complete

---

## Context for Claude Code

You are adding the database layer. All data-model, RLS, and seed decisions are specified in `docs/02_ARCHITECTURE.md` §3. Follow that spec literally — do not invent columns or constraints. If something seems missing, stop and ask before adding.

## Goal

Running `supabase db reset` locally creates a clean database with all tables, RLS policies, analytics views, and seed data. Generated TypeScript types live in `packages/db/src/types.ts` and are imported by `apps/web`.

## Tasks

1. `supabase init` at repo root (creates `supabase/` directory).
2. Create migration `<timestamp>_initial_schema.sql` with:
   - All 6 tables from `02_ARCHITECTURE.md` §3.1 (`profiles`, `partners`, `shops`, `sales_reps`, `discount_codes`, `leads`, `events`). Use the DDL exactly as specified — preserve checks, defaults, unique constraints, indexes.
   - All RLS policies from §3.2 (june_admin sees all, partner_admin sees own). Apply the same two-policy pattern to every partner-scoped table.
   - An explicit `grant` for the anon role: only `insert into leads` and `insert into events` (for the public lead endpoint). Nothing else.
3. Create migration `<timestamp>_analytics_views.sql` with:
   - `lead_daily_counts` materialised view from §3.3
   - `funnel_30d` view from §3.3
4. Create `supabase/seed.sql` with IHPO demo data from `docs/03_DEV_SETUP.md` §4. Add at least 2 more demo shops and 3 demo reps total so the CMS has something to render.
5. Run `supabase start` + `supabase db reset` — verify everything applies without errors.
6. Generate types: `supabase gen types typescript --local > packages/db/src/types.ts`.
7. In `packages/db/src/index.ts`, export the types + two client factories:
   - `createBrowserClient()` — anon key, for use in client components
   - `createServiceClient()` — service role key, for use in route handlers and the worker
   Use `@supabase/ssr` for the browser client, `@supabase/supabase-js` for the service client.
8. Add automated RLS tests in `packages/db/src/__tests__/rls.test.ts`:
   - Given two partners P1 and P2, verify a P1 admin cannot select P2's leads.
   - Verify anon cannot select from `leads` at all.
   - Verify anon CAN insert into `leads` when payload is well-formed.

## Acceptance criteria

- `supabase db reset` runs cleanly.
- All tables visible in `supabase studio` at `localhost:54323`.
- IHPO partner + shops + reps visible after reset.
- `pnpm --filter=@june/db test` passes — RLS tests are green.
- `packages/db/src/types.ts` is populated.
- From `apps/web`, `import { createBrowserClient } from '@june/db'` works with full type inference.

## What NOT to do

- Do NOT write application code that uses these clients yet — that's Briefing 04+.
- Do NOT build a migration runner; use Supabase CLI.
- Do NOT skip RLS on any partner-scoped table. Every single one must have RLS enabled + policies.

## Notes

- The `confirmation_id` default uses `md5(random())` — keep it simple, we can replace with nanoid later.
- `leads.ip_address` uses Postgres `inet` type; the worker will null these out after 90 days via a separate cron job (covered in Briefing 18).
- If any columns from the PRD feel missing, stop and ask — do not silently add new ones.

## Deliverable

A single PR titled "feat(db): initial schema, RLS, and seed data."
