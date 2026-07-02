# Career Fair Tracker — Project Guide

## What This Is

A co-op / internship management tool built for Northeastern University students. The goal is to replace the spreadsheet most students use to track applications with something more structured — nudging users to research companies and build a contact list *before* they apply, not after.

Design priorities:
1. **Beginner-friendly** — usable without a tutorial
2. **Customizable** — students decide what fields matter to them
3. **Thoughtful by default** — prompts smarter behavior, not just faster applying
4. **Spreadsheet replacement** — matches spreadsheet flexibility, adds light structure

## Features Built

- **Job tracking** — quick-add a job, inline-edit spreadsheet view, dashboard stats by status
- **Networking** — contacts logged per company, each rated by relationship strength
- **Career fair planner** — which companies are attending, per-company prep notes
- **Follow-ups + interviews** — scheduled tasks tied to jobs and contacts
- **Outreach resources** — saved templates for cold emails and follow-ups
- **Guest mode** — full app works without an account via localStorage; data migrates to your account when you sign up

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) + React 18 + TypeScript (`strict: true`) |
| Styling | Tailwind CSS, dark mode supported |
| Database | PostgreSQL via Supabase, managed with Prisma 5 |
| Auth | Supabase Auth — email/password with email verification |
| Deployment | Vercel (frontend + API routes) + Supabase (database + auth) |

## Architecture

### Dual-storage pattern
The app works in two modes depending on whether a user is logged in:

- **Guest** → data lives in `localStorage`. No account required, works offline.
- **Authenticated** → data lives in Postgres via REST API routes. Synced across devices.

`components/AppDataProvider.tsx` is the single React context that manages both modes and exposes the same interface to the rest of the app. When a guest signs up, a migration modal offers to move their local data to their account.

### Auth flow
Supabase Auth handles signup, login, email verification, Google OAuth, and session management. The key files:

- `lib/supabase/client.ts` — browser Supabase client (use in `"use client"` components)
- `lib/supabase/server.ts` — server Supabase client (use in API routes and Server Components)
- `middleware.ts` — refreshes session cookie on every request so users stay logged in
- `app/auth/callback/route.ts` — exchanges a one-time code for a session; handles BOTH the email-confirmation link and the Google OAuth redirect (same code-exchange path)
- `components/GoogleSignInButton.tsx` — "Continue with Google" button (`signInWithOAuth`, `redirectTo: <origin>/auth/callback`); rendered on both login and signup

> **Auth status:** Supabase Auth is **live on `main`** (NextAuth/bcryptjs are gone). **Google OAuth is live** — Google Cloud project "jobtracker" (Supabase ref `qokuowykfbgbrkzuzxzg`), consent screen **published to production** (only `email`+`profile` scopes → no Google verification review needed). Email/password signup + guest→account migration also work.

### API routes
REST-ish handlers under `app/api/`. Every route calls `supabase.auth.getUser()` server-side to get the current user and scopes all queries to `userId` — no user can read or write another user's data. Request bodies are validated with zod (`lib/validation.ts`): each entity has a create/update schema that whitelists known columns, coerces int fields, and returns `400` with per-field messages on bad input (Prisma is no longer the only gatekeeper). All route `catch` blocks `console.error` the underlying error for prod log visibility.

### Folder map

```
app/              → routes and API handlers
components/       → React components (components/ui/ for primitives)
hooks/            → custom hooks
lib/              → helpers; lib/supabase/ for Supabase clients
prisma/           → schema.prisma
types/            → shared TypeScript types
docs/             → architecture notes, testing guides, screenshots
```

## Development

```bash
npm install
npm run dev          # start dev server at localhost:3000
npm run db:push      # push schema changes to Supabase
npm run db:studio    # open Prisma Studio to browse data
npx tsc --noEmit     # type check
```

**Required env variables (set in BOTH local `.env` AND Vercel → Settings → Environment Variables):**
```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon/publishable key>
# Transaction pooler (port 6543) — runtime queries. Append ?pgbouncer=true.
DATABASE_URL=postgresql://postgres.<ref>:<password>@aws-1-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true
# Session pooler (port 5432) — used by Prisma ONLY for migrations / db push.
DIRECT_URL=postgresql://postgres.<ref>:<password>@aws-1-<region>.pooler.supabase.com:5432/postgres
```

Get the URL + anon key from Supabase → Settings → Data API; get the two connection strings from the **Connect** button (top of dashboard) → ORMs tab. `schema.prisma` declares both: `url = DATABASE_URL` (pooled, app runtime) and `directUrl = DIRECT_URL` (direct, migrations). `.env` is gitignored — never committed; Vercel stores its own copy.

**Gotchas (these have bitten us — read before debugging connection issues):**
- **Password special characters must be URL-encoded** in the connection string (`!` → `%21`, `@` → `%40`, `#` → `%23`). A literal `!` can cause silent auth failures. Easiest to set a DB password with no URL-special chars.
- **Wrong password / stale pooler host = P1001 "can't reach" or "authentication failed".** Symptom: every create/update/delete shows "Failed to…". Verify the exact connection string against Supabase → Connect → ORMs. The pooler host changed from `aws-0` to `aws-1` for us.
- **Use the POOLER host (`...pooler.supabase.com`), not the direct host (`db.<ref>.supabase.co`).** The direct host is IPv6-only; Vercel is IPv4, so the direct host fails in production.
- **Local dev needs DB ports 5432/6543 open.** University/campus networks (e.g. Northeastern) commonly block outbound Postgres ports → local connections fail with P1001 even when everything is correct. Use a VPN locally. This does NOT affect Vercel or end users (Vercel reaches Supabase from AWS directly).
- Quick connectivity check: `node -e "..."` with `prisma.$queryRaw\`SELECT 1\`` — distinguishes "can't reach" (network/host) from "authentication failed" (password).
- **Schema drift = `P2022` "column X does not exist" → route 500s.** If a model in `schema.prisma` has columns the actual DB table lacks (someone edited the schema but never ran `db push`), any `findMany`/`create` that touches the missing column throws P2022 and the route 500s. It bit us on `Company` (DB was missing `website`/`location`/`status`). Gotcha within the gotcha: **`count()` and a health check pass anyway** because they don't select those columns — so the DB looks healthy while reads fail. Fix: `npm run db:push` (on VPN if on campus). Diagnose fast by running `prisma.<model>.findMany({ take: 1 })` per model in a `node --env-file=.env` script — a clean way to catch drift across every table. **Rule: after ANY `schema.prisma` edit, run `db:push` before relying on it.**

**Supabase dashboard config required:**
- Authentication → Providers → Email → enable Confirm email
- Authentication → URL Configuration → Site URL + Redirect URLs must include local and Vercel (`http://localhost:3000/**`, `https://career--tracker.vercel.app/**`) — a `redirectTo` not on this allowlist is rejected
- Authentication → Providers → **Google** → enabled, with Client ID/Secret from Google Cloud (project "jobtracker"). Google's authorized redirect URI = the Supabase callback shown in that panel (`https://<ref>.supabase.co/auth/v1/callback`). In Google's new "Google Auth Platform" UI: **Branding** = app info, **Audience** = user type (External) + test users + Publish, **Clients** = the OAuth client. Consent screen is **published** (public); with only `email`+`profile` scopes no verification review is needed.

**Deploying to Vercel (and the "works locally, fails in prod" trap):**
- **No `vercel.json`.** Modern Next.js (App Router) deploys zero-config — Vercel auto-detects it. We had a stale `vercel.json` with a legacy `builds: @vercel/next` entry and a catch-all `routes` rewrite (`"/(.*)" → "/"`) that broke API route handlers (dynamic `[id]` routes, PUT/DELETE) **on Vercel only** — `npm run dev` ignores `vercel.json`, so local worked fine and hid the bug. Removed it. Do not re-add one without good reason.
- **Env vars: name + value only, no quotes, no trailing slash/space.** Paste the raw value (e.g. `https://<ref>.supabase.co`, not `"...co/"`). Set for **Production** (and Preview). "Sensitive" is fine — values are still injected at runtime.
- **Changing an env var does NOT update the running site.** Vercel bakes env vars in at build time. After editing them you MUST **Redeploy** (Deployments → ⋯ → Redeploy).
- **`?pgbouncer=true` is required on `DATABASE_URL`.** Raw queries (e.g. `SELECT 1`) work without it, but Prisma model ops (create/update/delete) use prepared statements that collide on the transaction pooler without it → writes fail while a health check passes.

**Debugging connection issues: `GET /api/health`** ([app/api/health/route.ts](app/api/health/route.ts)) — open it on any environment (localhost or `<app>.vercel.app/api/health`). Reports which env vars are set, the `DATABASE_URL` host + params (no secrets), a raw DB check, a real model query (`prisma.job.count` — catches the pgbouncer/prepared-statement issue), and auth/session status. Compare localhost (known-good) vs Vercel to pinpoint env drift. The API route `catch` blocks `console.error` the real Prisma error → visible in Vercel → deployment → Runtime Logs.

## Conventions

- TypeScript `strict` — avoid `any`
- Components: `PascalCase.tsx` — folders: `kebab-case` — other files: `camelCase`
- Before marking a task done: `npx tsc --noEmit` then `npm run dev`

## Open Tasks

### Recently done (2026-07-02, backend integrity pass)

- **fix/companies-api** — ✅ DONE. Companies now persist for authenticated users. Added `app/api/companies/route.ts` + `[id]/route.ts` and wired `AppDataProvider` (fetch on load, API-backed add/update/delete with undo). Migration now includes companies. **NB:** required a `db push` — the live `Company` table was missing `website`/`location`/`status` (see schema-drift gotcha above).
- **Backend hardening** — ✅ zod validation on every POST/PUT (`lib/validation.ts`), `console.error` in all route catches, un-scoped `findUnique`-after-update replaced with user-scoped `findFirst`, `followups/[id]` PUT now returns 401 (was 404) when unauthenticated. Provider surfaces per-entity fetch failures instead of rendering empty, and resets in-memory data + the `migrationDismissed` flag on sign-out. Migration is now per-record and idempotent (keeps only unmigrated records on partial failure; two-step confirm on Discard).
- **Google OAuth** — ✅ DONE & live. `components/GoogleSignInButton.tsx` on login + signup; Google Cloud + Supabase configured, consent screen published. See Auth flow section.
- **UX/a11y pass** — ✅ form primitives (`Input`/`Select`/`Textarea`) now associate labels via `useId` (`htmlFor`/`id`); password-toggle a11y; dismissible guest-mode banner (`components/GuestModeBanner.tsx`); add-job labels unified to "Add Application".

### In progress (collaborator)

- **feat/custom-templates** — Resources page has hardcoded templates only. Add `Template` model to schema, full CRUD API, wire into AppDataProvider, add "My Templates" UI in `app/resources/page.tsx`. **Schema change required — do not run `npx prisma db push` without coordinating first.**

### Owner to do

- **feat/openapi-spec** — Create `docs/openapi.yaml` as an OpenAPI 3.1 spec for all existing API routes. Used as a shared contract for parallel frontend/backend development. Routes are in `app/api/`; use `prisma/schema.prisma` for request/response shapes. New file only — safe to run in parallel with any other task.
- **Password reset + email provider** — Not built yet. Add forgot-password (`resetPasswordForEmail`) + update-password pages, and a "resend confirmation" affordance. Needs real email: Supabase's built-in sender is capped ~2/hour. **Use Brevo, not Resend** — the owner has no domain, and Brevo's free tier (300/day, no credit card) sends to arbitrary Gmail/Outlook via SMTP *without* domain verification; Resend requires a DNS-verified domain before it will email real users. Configure in Supabase → Authentication → SMTP Settings. (OAuth users skip email entirely, so this only matters for the password path.)
- **R1** — Rewrite `README.md` — tagline, screenshot, feature list, tech stack, run-locally steps, live demo link. Do this last.

### Cleanup

- **S1.** Move `check-database.mjs` and `test-backend.mjs` to `scripts/`; update the `db:check` and `test:backend` npm scripts to match.
- **S3.** Add `lint:fix` and `typecheck` npm scripts; wire `typecheck` into the CI workflow.

### Stretch goals

- **X1.** Split `components/AppDataProvider.tsx` into per-entity hooks (`useJobs`, `useContacts`, etc.). The provider then just composes them.
- **X2.** Add tests — Vitest unit test for signup validation, RTL test for one entity form.
- **X3.** Build the alumni reverse-search feature: pivot from an alum to every company they've worked at.

---

## Running parallel Claude Code sessions

Use `git worktree` to run multiple agents simultaneously without branch conflicts. Each worktree is a separate folder checked out to its own branch — agents work independently.

```bash
# Create a worktree for a new task (run from project root)
git worktree add ../tracker-<task-name> feat/<task-name>

# Open Claude Code in that folder
cd /Users/apple/Desktop/tracker-<task-name>
claude

# Clean up after merging
git worktree remove ../tracker-<task-name>
```

**Rules for briefing agents:**
- State which files are **in scope** and which are **off limits** — this prevents merge conflicts
- Only pick from tasks that touch disjoint files (Cleanup tasks, OpenAPI spec, docs are all safe to parallelize)
- Tasks that touch `package.json`, `AppDataProvider.tsx`, or API routes should not run simultaneously
- Update this file after each merge so the next agent has accurate context
