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

### Remaining cleanup

- **S1.** Move `check-database.mjs` and `test-backend.mjs` to `scripts/`; update the `db:check` and `test:backend` npm scripts to match.
- **S3.** Add `lint:fix` and `typecheck` npm scripts; wire `typecheck` into the CI workflow.

### After auth is stable

- **R1.** Rewrite `README.md` — tagline, screenshot, feature list, tech stack, run-locally steps, live demo link. Write this last so it describes the final state.

### Stretch goals

- **X1.** Split `components/AppDataProvider.tsx` into per-entity hooks (`useJobs`, `useContacts`, etc.). The provider then just composes them.
- **X2.** Add tests — Vitest unit test for signup validation, RTL test for one entity form.
- **X3.** Build the alumni reverse-search feature: pivot from an alum to every company they've worked at.
