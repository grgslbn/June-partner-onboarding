# Dev Setup — June Partner Onboarding

From zero to running locally in ~30 minutes. Follow in order.

---

## 0. Prerequisites

Install these first (macOS / Linux; Windows via WSL2):

| Tool | Version | Install |
|---|---|---|
| Node.js | 20 LTS or later | [nodejs.org](https://nodejs.org) or `nvm install 20` |
| pnpm | 9+ | `npm i -g pnpm` |
| Supabase CLI | 1.x+ | `brew install supabase/tap/supabase` (used for migrations + type generation only — no local containers) |
| Git | 2.40+ | `brew install git` |
| Claude Code | latest | See [product-self-knowledge installation](https://docs.claude.com) |
| Railway CLI (optional local) | latest | `brew install railway` |
| GitHub CLI (optional) | latest | `brew install gh` |

Accounts you'll need:
- GitHub (org or personal)
- Vercel (free tier fine for dev)
- Supabase (free tier fine for dev)
- Railway (free trial → Hobby plan $5/mo for production)
- Resend (free tier 100 emails/day — plenty for dev)
- Sentry (free tier)
- Cloudflare (optional, for custom domain + Turnstile later)

---

## 1. Create the repo

```bash
# Create a new directory and init
mkdir june-partner-onboarding && cd june-partner-onboarding
git init
gh repo create june-partner-onboarding --private --source=. --push  # or do this later

# Scaffold via pnpm
pnpm init
```

Set up the Turborepo monorepo:

```bash
# Install Turbo
pnpm add -D turbo -w

# Create workspace structure
mkdir -p apps/web apps/worker packages/shared packages/db packages/june-api supabase docs briefings
```

Create `pnpm-workspace.yaml`:
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

Create `turbo.json`:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": [".next/**", "dist/**"] },
    "dev": { "cache": false, "persistent": true },
    "lint": {},
    "test": {},
    "typecheck": { "dependsOn": ["^build"] }
  }
}
```

---

## 2. Scaffold the Next.js app

```bash
cd apps
pnpm create next-app@latest web --typescript --tailwind --app --src-dir=false --import-alias="@/*"
cd web

# Add core libs
pnpm add @supabase/ssr @supabase/supabase-js
pnpm add react-hook-form zod @hookform/resolvers
pnpm add next-intl
pnpm add @sentry/nextjs
pnpm add lucide-react recharts
pnpm add resend react-email @react-email/components

# Add shadcn/ui
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button input label card form toast dialog select checkbox

# Dev deps
pnpm add -D @types/node vitest @vitest/ui @playwright/test @axe-core/playwright
```

**Install the shadcn skill so Claude Code can manage components cleanly:**
```bash
# From https://ui.shadcn.com/docs/skills
# Follow the project's own instructions at that URL
```

---

## 3. Set up a Supabase cloud dev project

> **⚠️ Never run `supabase db reset` against a linked cloud project** — it wipes the project. Use `supabase db push` to apply new migrations, and the Supabase Studio dashboard for ad-hoc inspection.

### 3.1 Create the project

1. Sign in at [supabase.com](https://supabase.com).
2. Create a new project named `june-onboarding-dev` in an EU region (`eu-central-1` or `eu-west`).
3. Wait for provisioning (~1–2 min).
4. From **Project Settings → API**, copy:
   - Project URL
   - `anon` public key
   - `service_role` secret key
5. From **Project Settings → General**, note the project's **Reference ID** (short string like `abcxyz123`).

### 3.2 Install and link the Supabase CLI

The CLI is still required — for applying migrations and generating TypeScript types. It does **not** run a local stack.

```bash
supabase login
supabase init                         # from repo root — scaffolds supabase/ directory
supabase link --project-ref <ref>     # ref from step 3.1.5
```

### 3.3 Save credentials to `.env.local`

Paste the values from step 3.1.4 into `apps/web/.env.local`:

```ini
NEXT_PUBLIC_SUPABASE_URL=<project URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>

RESEND_API_KEY=re_dev_xxx  # use a test key from resend.com
RESEND_FROM_EMAIL=onboarding@onboard.june.energy  # unverified at first, use resend.dev domain for dev

SENTRY_DSN=<your dev sentry dsn or blank>

NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3.4 Apply the initial migration

```bash
supabase migration new initial_schema
```

Paste the schema from `docs/02_ARCHITECTURE.md` section 3.1 into `supabase/migrations/<timestamp>_initial_schema.sql`, then push it to the linked cloud project:

```bash
supabase db push
```

### 3.5 Generate TypeScript types

Types come from the linked cloud project:

```bash
mkdir -p packages/db/src
supabase gen types typescript --linked > packages/db/src/types.ts
```

### 3.6 Why cloud dev instead of a local Supabase stack?

- Simpler laptop setup — no Docker, no local containers.
- The dev environment matches production exactly: same Postgres version, same RLS engine, same Auth behaviour.
- Downside: you need an internet connection to develop, and schema changes take a cloud round-trip instead of an instant local reset.
- Mitigation: keep migrations small and focused; use Supabase Studio's SQL editor for exploratory queries rather than re-pushing schema churn.

---

## 4. Seed dev data

Create `supabase/seed.sql`:

```sql
-- Demo partner: IHPO
insert into partners (id, slug, name, primary_color, accent_color, flow_preset, iban_behavior, locales_enabled, default_locale)
values (
  '00000000-0000-0000-0000-000000000001',
  'ihpo',
  'IHPO',
  '#E53935',
  '#FFFFFF',
  'simple',
  'deferred',
  array['nl','fr'],
  'fr'
);

-- Demo shop
insert into shops (id, partner_id, name, address, city, zip, qr_token)
values (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  'IHPO Brussels Central',
  'Rue Royale 1',
  'Brussels',
  '1000',
  'demo-shop-qr'
);

-- Demo rep
insert into sales_reps (shop_id, display_name, email)
values (
  '00000000-0000-0000-0000-000000000010',
  'Marie Dupont',
  'marie@ihpo.example'
);
```

Apply the seed once, manually:

- **Option A (easiest):** Open Supabase Studio for your `june-onboarding-dev` project → **SQL Editor** → paste the contents of `supabase/seed.sql` → **Run**.
- **Option B (CLI):** Copy the connection string from **Project Settings → Database** and pipe the seed through `psql`:
  ```bash
  psql "postgres://postgres:<password>@<project-host>:5432/postgres" -f supabase/seed.sql
  ```

Do **not** rely on `supabase db reset` — that would wipe the cloud project.

---

## 5. Wire up the worker

```bash
cd apps/worker
pnpm init
pnpm add @supabase/supabase-js resend croner pino
pnpm add -D typescript tsx @types/node
```

> **No Dockerfile.** Railway auto-detects the Node app via Nixpacks and builds it from `package.json`. Make sure the worker's `package.json` has:
>
> ```json
> "scripts": {
>   "build": "tsc",
>   "start": "node dist/index.js"
> }
> ```

Create `apps/worker/src/index.ts`:

```ts
import { Cron } from 'croner';
import { runDailyDigest } from './jobs/daily-digest';
import { runEmailRetry } from './jobs/email-retry';

// Daily digest at 06:00 Brussels
new Cron('0 6 * * *', { timezone: 'Europe/Brussels' }, async () => {
  await runDailyDigest();
});

// Email retry every 5 min
new Cron('*/5 * * * *', async () => {
  await runEmailRetry();
});

console.log('Worker started');
```

---

## 6. Sentry setup

```bash
cd apps/web
pnpm dlx @sentry/wizard@latest -i nextjs
```

Follow the wizard. It creates `sentry.client.config.ts`, `sentry.server.config.ts`, and updates `next.config.ts`.

---

## 7. Install the skills for Claude Code

| Skill | Source |
|---|---|
| `shadcn/ui` | https://ui.shadcn.com/docs/skills |
| `subagent-driven-development` | Wherever your team stores it |
| `test-driven-development` | Same |
| `Expo` (for Phase 4 native) | https://docs.expo.dev/skills/ |

Verify Claude Code sees them:

```bash
claude code --list-skills
```

### 7.1 Design skills

Design skills live under `~/.claude/skills/`, grouped into packs. Each pack has a `skills/` directory with child skills plus a `commands/` directory with slash commands. When a briefing says "consult design skills", it refers to the child skills below — not to a single monolithic `frontend-design` skill (that one does not exist on this machine).

**Packs and child skills:**

| Pack | Child skills |
|---|---|
| `ui-design/` | `color-system`, `dark-mode-design`, `data-visualization`, `illustration-style`, `layout-grid`, `responsive-design`, `spacing-system`, `typography-scale`, `visual-hierarchy` |
| `design-systems/` | `accessibility-audit`, `component-spec`, `design-token`, `documentation-template`, `icon-system`, `naming-convention`, `pattern-library`, `theming-system` |
| `interaction-design/` | `animation-principles`, `error-handling-ux`, `feedback-patterns`, `gesture-patterns`, `loading-states`, `micro-interaction-spec`, `state-machine` |
| `designer-toolkit/` | `case-study`, `design-rationale`, `design-system-adoption`, `design-token-audit`, `presentation-deck`, `ux-writing` |

**Slash commands** live under each pack's `commands/` directory — e.g. `/design-screen`, `/responsive-audit`, `/color-palette`, `/type-system` (ui-design); `/create-component`, `/tokenize`, `/audit-system` (design-systems); `/design-interaction`, `/error-flow`, `/map-states` (interaction-design); `/build-presentation`, `/write-case-study`, `/write-rationale` (designer-toolkit).

**Per-briefing consumers** — which briefing pulls which skills:

| Briefing | Skills | Command |
|---|---|---|
| 04 Public landing | `ui-design/{layout-grid, visual-hierarchy, spacing-system, typography-scale, color-system}`, `design-systems/theming-system` | `/design-screen` |
| 05 Simple form | `ui-design/responsive-design`, `interaction-design/{error-handling-ux, feedback-patterns, loading-states}`, `designer-toolkit/ux-writing` | `/error-flow` |
| 07 Confirmation email | `designer-toolkit/ux-writing` | — |
| 08 Standard form | `interaction-design/{state-machine, micro-interaction-spec}` | — |
| 09 Complete stepper | `interaction-design/{state-machine, micro-interaction-spec, loading-states}` | — |
| 11 Partner theming | `design-systems/{theming-system, design-token, component-spec}` | `/tokenize` |
| 13–16 CMS CRUD | `design-systems/{component-spec, pattern-library, naming-convention, icon-system}` | `/create-component` |
| 17 Analytics | `ui-design/data-visualization` | — |
| 20 A11y pass | `design-systems/accessibility-audit` (framework) + `axe-playwright` (CI automation) | — |

---

## 8. Cloud deployments (staging)

### 8.1 Supabase cloud project

```bash
# From repo root, link to a Supabase cloud project you created in the dashboard
supabase link --project-ref <your-project-ref>

# Push your schema
supabase db push
```

### 8.2 Vercel

Connect the GitHub repo:

```bash
cd apps/web
npx vercel link
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
npx vercel env add NEXT_PUBLIC_SUPABASE_URL preview
# repeat for each env var in .env.local
```

Set the **Root Directory** in Vercel project settings to `apps/web`. Set the **Framework Preset** to Next.js.

### 8.3 Railway

```bash
cd apps/worker
railway login
railway init
railway link
# Railway auto-detects the Node app via Nixpacks (uses package.json build + start scripts). Set env vars via the dashboard.
railway up
```

Set env vars in the Railway dashboard: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `SENTRY_DSN`, `TZ=Europe/Brussels`.

### 8.4 Resend

1. Create Resend account, switch to EU region.
2. Add and verify your domain (DKIM records via Cloudflare or your DNS).
3. Create API keys: one for dev (restricted), one for prod.
4. Add dev key to `apps/web/.env.local`, prod key to Vercel + Railway.

---

## 9. First run

From repo root:

```bash
pnpm install
pnpm dev --filter=web
```

Visit `http://localhost:3000/p/ihpo?shop=demo-shop-qr`. You should see the IHPO landing page.

Visit `http://localhost:3000/admin` — the CMS. Create a first admin user via `supabase` CLI or by SQL insert into `profiles`.

---

## 10. Running tests

```bash
# Unit
pnpm test --filter=@june/shared

# E2E (requires dev server running)
pnpm --filter=web exec playwright test

# Install browsers first time
pnpm --filter=web exec playwright install
```

---

## 11. Optional: Antigravity + Claude Code workflow

Your brief mentions Antigravity. Workflow:

1. Open the repo in Antigravity.
2. Keep this `docs/` folder as the shared context.
3. Feed one briefing at a time from `briefings/` into Claude Code's session (`/init` or as the first user message).
4. Use `subagent-driven-development` to spin up parallel subagents for independent modules (e.g. landing page + CMS auth can go in parallel).
5. Commit per briefing. PR per briefing for review.

---

## 12. Troubleshooting

| Symptom | Fix |
|---|---|
| `supabase db push` fails with "project not linked" | Run `supabase link --project-ref <ref>` first. The ref is in your Supabase dashboard under Project Settings → General. |
| Next.js can't find `@/components/ui/*` | shadcn wasn't initialised. Run `pnpm dlx shadcn@latest init` |
| Resend emails bounce | Using unverified domain in prod. Add DKIM records and verify in Resend dashboard. |
| RLS blocks everything in dev | You're querying as anon, not a logged-in admin. Either log in or use service role client server-side. |
| Sentry not capturing | Check `SENTRY_DSN` is set in both client env (NEXT_PUBLIC_) and server env. |
| Vercel build fails on monorepo | Root Directory must be `apps/web`; Install Command `cd ../.. && pnpm install`; Build Command `cd ../.. && pnpm --filter=web build` |

---

## 13. What's next

Once this setup runs, open `04_DELIVERY_PLAN.md` and start on **Briefing 01**. The briefings assume this setup is complete.
