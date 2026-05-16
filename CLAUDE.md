# Career Fair Tracker — Project Context for Claude Code

## Overall Goal

A co-op / internship management tool built for **Northeastern University students** — first-time job seekers and new graduates. Positioned as a thoughtful alternative to spreadsheets: the product should make students more *deliberate* about how they apply, not just faster at applying.

Design priorities, in order:

1. **Beginner-friendly** — usable without a tutorial.
2. **Customizable** — students decide what fields and flows matter to them.
3. **Thoughtful by default** — nudge users to research the company and build a contact list *before* they apply, not after.
4. **Spreadsheet replacement** — match spreadsheet flexibility, add light structure that prompts smarter behavior.

## Product Surface

- **Job tracking** — quick-add a job, inline-edit spreadsheet view, dashboard statistics by status.
- **Networking** — alumni and other contacts logged per company, each rated High / Med / Low target by interest. Per-company mental model: "I have 3 contacts at Google — here's my relationship with each."
- **Alumni reverse-search** *(planned)* — pivot from an alum to every company they've worked at, surfacing places the student hadn't considered.
- **Career fair planner** — which companies are attending, per-company prep notes.
- **Follow-ups + interviews** — scheduled tasks tied to jobs and contacts.
- **Outreach resources** — saved templates for cold emails, follow-ups, thank-yous.

## Architecture

- **Framework:** Next.js 15 (App Router) + React 18 + TypeScript (`strict: true`).
- **Styling:** Tailwind CSS, dark mode supported.
- **Data:** Prisma 5 + PostgreSQL (Supabase in production). Schema: `prisma/schema.prisma`.
- **Auth:** Supabase Auth (`@supabase/ssr` + `@supabase/supabase-js`). Email/password with built-in email verification. Browser client in `lib/supabase/client.ts`, server client in `lib/supabase/server.ts`, session refresh in `middleware.ts`, email callback in `app/auth/callback/route.ts`.
- **Dual-storage pattern:** the same UI works in two modes. Guests use `localStorage` (no account, no server). Authenticated users use Postgres via API routes. `components/AppDataProvider.tsx` is the single React context that swaps between them.
- **API style:** REST-ish Next.js route handlers under `app/api/`. Per-user data isolation enforced server-side via `user.id` from `supabase.auth.getUser()`.

### Folder map

- `app/` — routes + API handlers
- `components/` — React components (`components/ui/` for primitives)
- `hooks/` — custom hooks
- `lib/` — helpers; `lib/supabase/client.ts` (browser) + `lib/supabase/server.ts` (server)
- `prisma/` — schema
- `types/` — shared TypeScript types
- `legacy/` — old vanilla-JS prototype, **scheduled for deletion**

## Conventions

- TypeScript `strict` — avoid `any`.
- Naming: components `PascalCase.tsx`; folders `kebab-case`; other files `camelCase` or `kebab-case` by context.
- **Secrets live only in `.env.local`** — never in `.gitignore`, never in `.env.example`, never in any tracked file. Read via `process.env.*` server-side only.
- Before declaring a change done: `npm run lint && npx tsc --noEmit`.

## Open Tasks

> Trim items as they complete. Update this list — it's the working memory for future Claude sessions.

### 🔴 Finish Supabase setup (blocking everything else)

Auth migration to Supabase is complete in code. These steps still need to happen:

1. **Run npm install** (requires Node.js — `brew install node` first if needed):
   ```bash
   npm uninstall next-auth bcryptjs resend @types/bcryptjs
   npm install @supabase/supabase-js @supabase/ssr
   ```
2. **Add to `.env.local`:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DATABASE_URL` (Supabase → Connect button → connection string URI, replace `[your-password]` with your DB password)
3. **`npx prisma db push`** — syncs schema (drops old User table, removes FK constraints). Currently failing with P1001 — check Supabase Project Settings → Network for IP restrictions, or wait for project to fully provision.
4. **Supabase dashboard config:**
   - Authentication → Sign In / Providers → Email → enable **Confirm email**
   - Authentication → URL Configuration → add `http://localhost:3000/auth/callback` (and Vercel URL when deployed)
5. **Verify:** `npm run lint && npx tsc --noEmit` then `npm run dev`

### 🟢 Parallel-safe — touch disjoint files

Safe to run concurrently via `git worktree` + multiple Claude sessions. Each is its own branch.

- **P1.** Delete `legacy/` folder.
- **P2.** Add tooling configs: `.eslintrc.json`, `.prettierrc`, `.github/workflows/ci.yml`, `.pre-commit-config.yaml` (with gitleaks for secret scanning).
- **P3.** Strip `console.*` statements: `components/AppDataProvider.tsx`, `app/api/jobs/route.ts`, `app/api/jobs/[id]/route.ts`. Replace user-facing ones with toast / UI state.
- **P5.** Resolve the `// TODO: Implement interactive tour` in `app/spreadsheet/page.tsx` — implement or delete.
- **P6.** Move `README-TESTING.md` → `docs/testing.md`, `TESTING-GUIDE.md` → `docs/testing-guide.md`.
- **P7.** Add `docs/screenshots/` with 2–3 product screenshots for the README.
- **P8.** Add `docs/ARCHITECTURE.md` explaining the dual-storage (localStorage + Postgres) design.

### 🟡 Sequential — all touch `package.json`

Run one at a time, or batch them on one branch. Don't put two of these on parallel branches — they'll conflict.

- **S1.** Move `check-database.mjs` and `test-backend.mjs` to `scripts/`; update `db:check` and `test:backend` npm scripts.
- **S3.** Add `lint:fix` and `typecheck` npm scripts wired into CI.

### 🟣 Depends on auth being fully settled

- **R1.** Rewrite `README.md`: one-line tagline, screenshot/GIF, feature list, tech stack, run-locally steps, live demo link, brief reflection on what was built and what was hard. Do this last — the README should describe the final state, not a moving target.

### Stretch

- **X1.** Split `components/AppDataProvider.tsx` (1,030 lines) into per-entity hooks (`useJobs`, `useContacts`, `useFollowUps`, `useInterviews`, `useCompanies`). The provider then just composes them.
- **X2.** Add tests — at minimum a Vitest test for signup validation logic and an RTL test for one entity form.
- **X3.** Build the **alumni reverse-search** feature.

---

## How to use this file with parallel Claude Code sessions

Only pick tasks from the **🟢 parallel-safe** bucket when running multiple sessions concurrently. Set them up with `git worktree`:

```bash
git worktree add ../tracker-tooling   tooling-setup
git worktree add ../tracker-legacy    delete-legacy
```

Then open a Claude Code window in each folder. Two tasks that both edit `package.json` (🟡) must be sequential or batched on a single branch.
