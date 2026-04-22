# Briefing 01 — Repo Setup & Monorepo Scaffolding

**Phase:** 0 · **Est. effort:** 2–3 hours · **Prereqs:** None

---

## Context for Claude Code

You are setting up the foundational repository for the June Partner Onboarding Platform. This is a Turborepo monorepo with pnpm workspaces, hosting a Next.js 15 web app (public landing + CMS), a Railway worker, and shared packages.

Read `docs/01_PRD.md` sections 1 and 2 for product context, and `docs/02_ARCHITECTURE.md` section 2 for the canonical repo layout you're creating.

## Goal

A working monorepo where `pnpm dev --filter=web` renders a Next.js page at `http://localhost:3000`.

## Tasks

1. Initialise Turborepo + pnpm workspaces following the exact layout in `02_ARCHITECTURE.md` §2.
2. Create `apps/web` with Next.js 15, App Router, TypeScript, Tailwind v4, import alias `@/*`.
3. Create `apps/worker` stub with `package.json` and a `src/index.ts` that just logs "Worker started."
4. Create `packages/shared`, `packages/db`, `packages/june-api` as empty packages with `package.json` and `src/index.ts` exporting nothing.
5. Install root dev deps: `turbo`, `typescript`, `prettier`, `eslint`.
6. Create a root `README.md` pointing at `docs/01_PRD.md` and `docs/03_DEV_SETUP.md`.
7. Create `.gitignore` covering `node_modules`, `.next`, `.turbo`, `.env*`, `dist`, `.vercel`, `.sentry`.
8. Create `.env.example` in `apps/web` with all env var keys from `03_DEV_SETUP.md` §3 (values blank).

## Acceptance criteria

- `pnpm install` completes clean from root.
- `pnpm dev --filter=web` starts Next.js and renders default page at `localhost:3000`.
- `pnpm --filter=worker exec tsx src/index.ts` prints "Worker started."
- `pnpm typecheck` passes across the monorepo.
- Directory layout matches `02_ARCHITECTURE.md` §2 exactly.

## What NOT to do

- Do NOT set up Supabase, Vercel, or Railway yet — that's Briefing 02 and later.
- Do NOT install shadcn yet — that's Briefing 04 (when the first component is needed).
- Do NOT add auth, email, or Sentry SDKs — later briefings.

## Deliverable

A single PR titled "chore: initial monorepo scaffold" containing the structure above.
