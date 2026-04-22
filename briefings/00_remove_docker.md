# Briefing 00 — Remove Docker from the Plan

**Phase:** Pre-kickoff · **Est. effort:** 30 minutes · **Prereqs:** None · **Type:** Documentation revision

---

## Context for Claude Code

The planning package in `docs/` and `briefings/` was drafted with a Docker-based local development path — specifically, Supabase CLI runs Postgres/GoTrue/Storage as local containers via Docker Desktop, and the Railway worker ships with a Dockerfile.

The project owner wants to drop Docker entirely. Reasoning:
1. **Local Supabase** can be replaced by a free Supabase cloud project used as a "dev" environment. Same schema, same auth, same storage — just hosted. No Docker needed.
2. **Railway** auto-detects Node apps via Nixpacks and builds them without a Dockerfile. The Dockerfile is redundant.

The goal of this briefing is to update the planning documents to reflect a no-Docker workflow, without losing any capability the project actually depends on.

## Goal

All references to Docker, Docker Desktop, Dockerfiles, and local Supabase containers are removed or replaced across the docs and briefings. The `03_DEV_SETUP.md` guide works end-to-end on a machine that has never had Docker installed. The worker still deploys to Railway cleanly via Nixpacks.

## Tasks

### 1. Revise `docs/03_DEV_SETUP.md`

- In §0 Prerequisites: remove Docker Desktop from the tools table entirely.
- In §3 "Set up local Supabase": replace the whole section with a **"Set up a Supabase cloud dev project"** section:
  - Sign in at supabase.com, create a new project named `june-onboarding-dev` in an EU region (eu-central-1 or eu-west).
  - Copy the Project URL, anon key, and service role key from Project Settings → API.
  - Install the Supabase CLI (still needed — we use it for migrations and type generation, NOT for local containers).
  - `supabase login` + `supabase link --project-ref <ref>`.
  - Paste credentials into `apps/web/.env.local` as before.
  - Note that migrations are applied with `supabase db push` (pushes local migration files to the linked cloud project), NOT `supabase db reset` (which would reset the cloud DB — dangerous).
- Add a clear callout near the top of §3: **"Never run `supabase db reset` against a linked cloud project unless you want to wipe it. Use `supabase db push` to apply new migrations, and the Supabase Studio dashboard for ad-hoc inspection."**
- In §4 "Seed dev data": change the instructions to run the seed file once manually through Supabase Studio's SQL editor, OR via `psql` with the connection string from the dashboard. Do NOT rely on `supabase db reset` to auto-run the seed.
- In §5 "Wire up the worker": remove the Dockerfile creation step entirely. Replace it with a note: *"Railway will auto-detect the Node app via Nixpacks. No Dockerfile needed."*
- In §8.3 Railway section: remove any Docker-related language. The flow is just `railway init`, push, Railway handles the rest.
- In §12 Troubleshooting: remove the `supabase start` port conflict row (no longer applicable). Add a new row: *"`supabase db push` fails with 'project not linked' → run `supabase link --project-ref <ref>` first."*

### 2. Revise `docs/02_ARCHITECTURE.md`

- In §1 "Stack at a glance": no changes needed (never mentioned Docker).
- In §2 "Repo layout": remove the `Dockerfile` line from the `apps/worker/` tree. Add a comment beside `apps/worker/` noting: *"Deployed to Railway via Nixpacks auto-detect."*
- Search the whole file for "Docker" and "Dockerfile" — should be zero matches after edits.

### 3. Revise `briefings/01_setup.md`

- In the repo scaffolding tasks: ensure there's no instruction to create a `Dockerfile` in `apps/worker/`. Currently there isn't — just add an explicit note: *"Do NOT create a Dockerfile for the worker. Railway uses Nixpacks."*
- Add a `package.json` scripts section for the worker showing `"start": "node dist/index.js"` and `"build": "tsc"` — these are what Nixpacks will pick up.

### 4. Revise `briefings/02_schema_and_seed.md`

This briefing currently assumes a local Supabase stack. Rewrite the workflow to the cloud-dev approach:
- Change "run `supabase start`" → "ensure you've run `supabase login` and `supabase link --project-ref <ref>` per `03_DEV_SETUP.md` §3".
- Change "`supabase db reset` runs cleanly" acceptance criterion → "`supabase db push` applies all migrations cleanly to the linked dev project".
- Change the seed instruction to: *"After migrations are pushed, open Supabase Studio (the hosted dashboard) → SQL Editor → paste and run `supabase/seed.sql`. Alternatively, pipe it via `psql` using the connection string from Project Settings → Database."*
- RLS tests: these can still run, but they now need a real connection string from the cloud dev project. Document that the test file reads `SUPABASE_TEST_URL` + `SUPABASE_TEST_SERVICE_KEY` from a `.env.test` file (not committed). CI will use the same, with keys stored as GitHub Actions secrets.
- Add an explicit warning: *"The RLS tests INSERT and DELETE data. Only run them against a dev or ephemeral project, never staging or production."*

### 5. Revise `briefings/18_*` (when expanded) — note for later

Add a note at the top of the remaining-briefings file (`briefings/08-23_remaining.md`) under entry 18:
- The worker's Dockerfile is replaced by Nixpacks. `railway.json` (optional) can be used for custom build commands if needed, but the default Node detection should work. No Docker touch-points.

### 6. Revise the root `README.md`

- Under "Suggested next actions" → "This week" → "Kick off Week 1 infrastructure" is fine, but make sure nothing else references Docker.

### 7. Global sweep

- `grep -ri "docker" docs/ briefings/ README.md` should return zero matches (except possibly in historical notes if intentionally preserved — none should be).
- `grep -ri "supabase start" docs/ briefings/ README.md` should return zero matches; replace any found with the cloud-dev workflow.
- `grep -ri "supabase db reset" docs/ briefings/ README.md` — each occurrence should either be removed or reframed as "only for a local dev override (if you later choose to reintroduce local Supabase)."

## Acceptance criteria

- No file under `docs/` or `briefings/` mentions Docker, Docker Desktop, a Dockerfile, or local Supabase containers.
- `03_DEV_SETUP.md` has a coherent "Supabase cloud dev project" flow replacing what was there before. A new engineer can follow it on a machine without Docker.
- The Railway section of `03_DEV_SETUP.md` no longer mentions Docker; it describes Nixpacks auto-detection.
- `02_ARCHITECTURE.md`'s repo layout diagram does not show a `Dockerfile` entry.
- Briefing `01_setup.md` explicitly says "do NOT create a Dockerfile."
- Briefing `02_schema_and_seed.md` uses `supabase db push` + Supabase Studio SQL editor for seeds, not `supabase db reset`.
- `grep -ri "docker\|Dockerfile" docs/ briefings/ README.md` returns nothing.

## What NOT to do

- Do NOT remove the Supabase CLI from prerequisites. We still use it for migrations, type generation, and linking — just not for running containers.
- Do NOT remove any mention of the actual services (Postgres, Auth, Storage) — only the local-container delivery mechanism changes.
- Do NOT delete the `apps/worker/` directory or its structure — only the Dockerfile goes.
- Do NOT change the data model, RLS policies, or any feature scope. This is purely a documentation revision.
- Do NOT introduce a new local-dev alternative (like `pg-embedded` or a devcontainer). Cloud dev project is the chosen path.

## Optional follow-up (separate commit, same PR)

If time allows, add a brief subsection to `03_DEV_SETUP.md` §3 titled **"Why cloud dev instead of local Supabase?"** explaining the tradeoff in 3–4 sentences so future contributors understand the choice:
- Simpler laptop setup, no Docker.
- Environment matches prod exactly (same Postgres version, same RLS engine, same Auth).
- Downside: requires internet connection to develop; slower feedback loop on schema changes (push round-trip vs. local reset).
- Mitigation: keep migrations small and focused; use Supabase Studio's SQL editor for exploratory work.

## Deliverable

A single PR titled **"docs: remove Docker dependency, adopt Supabase cloud dev workflow"** touching only documentation files. No code changes.
