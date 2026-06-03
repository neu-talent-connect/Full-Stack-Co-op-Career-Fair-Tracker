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
Supabase Auth handles signup, login, email verification, and session management. The key files:

- `lib/supabase/client.ts` — browser Supabase client (use in `"use client"` components)
- `lib/supabase/server.ts` — server Supabase client (use in API routes and Server Components)
- `middleware.ts` — refreshes session cookie on every request so users stay logged in
- `app/auth/callback/route.ts` — handles the email confirmation link, exchanges a one-time code for a session

> **Branch note:** These files exist on `feature/backend-auth`, not yet merged to `main`. The current `main` branch still uses NextAuth v4 + bcryptjs. The merge is blocked — see "Blocked" task below.

### API routes
REST-ish handlers under `app/api/`. Every route calls `supabase.auth.getUser()` server-side to get the current user and scopes all queries to `userId` — no user can read or write another user's data.

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

**Required `.env` variables:**
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
DATABASE_URL=
```

Get these from your Supabase project → Settings → Data API (URL + anon key) and Connect → Session pooler (DATABASE_URL). Secrets stay in `.env` only — never committed.

**Supabase dashboard config required:**
- Authentication → Providers → Email → enable Confirm email
- Authentication → URL Configuration → add your local and Vercel callback URLs (`/auth/callback`)

## Conventions

- TypeScript `strict` — avoid `any`
- Components: `PascalCase.tsx` — folders: `kebab-case` — other files: `camelCase`
- Before marking a task done: `npx tsc --noEmit` then `npm run dev`

## Open Tasks

### Blocked

- **feature/backend-auth** — Supabase auth migration is complete in code. Blocked on two things before it can merge:
  1. `prisma db push` failing with P1001 (can't reach DB). Most likely fix: use the **direct connection string** (port 5432), not the pooler (port 6543). Supabase dashboard → Project Settings → Database → Connection string → URI.
  2. Supabase dashboard config: Authentication → Providers → Email → enable **Confirm email**; Authentication → URL Configuration → add `http://localhost:3000/auth/callback` as a redirect URL.

### In progress (collaborator)

- **fix/companies-api** — Companies only save to localStorage right now; data is lost on logout. Need `app/api/companies/route.ts`, `app/api/companies/[id]/route.ts`, and AppDataProvider updated to call the API when authenticated. No schema change needed — Company table already exists.
- **feat/custom-templates** — Resources page has hardcoded templates only. Add `Template` model to schema, full CRUD API, wire into AppDataProvider, add "My Templates" UI in `app/resources/page.tsx`. **Schema change required — do not run `npx prisma db push` without coordinating first.**

### Owner to do

- **feat/openapi-spec** — Create `docs/openapi.yaml` as an OpenAPI 3.1 spec for all existing API routes. Used as a shared contract for parallel frontend/backend development. Routes are in `app/api/`; use `prisma/schema.prisma` for request/response shapes. New file only — safe to run in parallel with any other task.
- **Resend** — Wire up custom SMTP for confirmation emails. Supabase's built-in email service has a 2 emails/hour rate limit, not suitable for production. Use Resend: add `RESEND_API_KEY` to `.env` and Vercel, configure in Supabase → Authentication → SMTP Settings.
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
