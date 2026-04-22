# Briefing 02 — Supabase Schema, RLS & Seed Data

**Phase:** 0 · **Est. effort:** 3–4 hours · **Prereqs:** Briefing 01 complete

---

## Context for Claude Code

You are adding the database layer. All data-model, RLS, and seed decisions are specified in `docs/02_ARCHITECTURE.md` §3. Follow that spec literally — do not invent columns or constraints. If something seems missing, stop and ask before adding.

This project uses a **Supabase cloud dev project** (`june-onboarding-dev`) — there is no local Supabase stack. See `docs/03_DEV_SETUP.md` §3 for how it's provisioned and linked.

## Goal

Running `supabase db push` applies all migrations (tables, RLS policies, analytics views) to the linked cloud dev project. The seed is applied once through Supabase Studio's SQL editor. Generated TypeScript types live in `packages/db/src/types.ts` and are imported by `apps/web`.

> **⚠️ Never run `supabase db reset` against the linked cloud project** — it wipes the project. Use `supabase db push` for migrations.

## Tasks

1. `supabase init` at repo root (creates `supabase/` directory).
2. Create migration `<timestamp>_initial_schema.sql` with:
   - All 6 tables from `02_ARCHITECTURE.md` §3.1 (`profiles`, `partners`, `shops`, `sales_reps`, `discount_codes`, `leads`, `events`). Use the DDL exactly as specified — preserve checks, defaults, unique constraints, indexes.
   - All RLS policies from §3.2 (june_admin sees all, partner_admin sees own). Apply the same two-policy pattern to every partner-scoped table.
   - An explicit `grant` for the anon role: only `insert into leads` and `insert into events` (for the public lead endpoint). Nothing else.
3. Create migration `<timestamp>_analytics_views.sql` with:
   - `lead_daily_counts` materialised view from §3.3
   - `funnel_30d` view from §3.3
4. Create `supabase/seed.sql` with IHPO demo data from `docs/03_DEV_SETUP.md` §4. Add at least 2 more demo shops and 3 demo reps total so the CMS has something to render. Apply the seed **once, manually**: open Supabase Studio for the `june-onboarding-dev` project → **SQL Editor** → paste and run `supabase/seed.sql`. Alternatively pipe it through `psql` using the connection string from **Project Settings → Database**. Do NOT rely on `supabase db reset` — that would wipe the cloud project.
5. Ensure you've run `supabase login` and `supabase link --project-ref <ref>` per `docs/03_DEV_SETUP.md` §3.2, then run `supabase db push` — verify all migrations apply cleanly to the linked dev project.
6. Generate types: `supabase gen types typescript --linked > packages/db/src/types.ts`.
7. In `packages/db/src/index.ts`, export the types + two client factories:
   - `createBrowserClient()` — anon key, for use in client components
   - `createServiceClient()` — service role key, for use in route handlers and the worker
   Use `@supabase/ssr` for the browser client, `@supabase/supabase-js` for the service client.
8. Add automated RLS tests in `packages/db/src/__tests__/rls.test.ts`:
   - Given two partners P1 and P2, verify a P1 admin cannot select P2's leads.
   - Verify anon cannot select from `leads` at all.
   - Verify anon CAN insert into `leads` when payload is well-formed.

   The tests connect to a real Supabase project (there is no local stack). They read `SUPABASE_TEST_URL` and `SUPABASE_TEST_SERVICE_KEY` from a `.env.test` file (git-ignored). In CI, the same values live in GitHub Actions secrets.

   ⚠️ **These tests INSERT and DELETE data. Only run them against a dev or ephemeral project — never against staging or production.**

## Acceptance criteria

- `supabase db push` applies all migrations cleanly to the linked dev project.
- All tables visible in Supabase Studio for the `june-onboarding-dev` project.
- IHPO partner + shops + reps visible after the seed is applied.
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
