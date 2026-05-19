# Deployment guide — Vercel

This document explains how to deploy the Career Fair Tracker app to Vercel and what environment variables are required. It assumes you already pushed the `deploy/vercel` branch (there's a branch ready in the repo).

Summary (quick):

- Connect the repository to Vercel (https://vercel.com) and select the `deploy/vercel` branch.
- Add the required environment variables (see below) in the Vercel dashboard for both Preview and Production as appropriate.
- Deploy. Fix any runtime errors seen in the Vercel deployment logs.

Required environment variables

Development (.env.local):

  - DATABASE_URL — PostgreSQL connection string (used by Prisma). Example: `postgresql://user:pass@host:5432/dbname`
  - DIRECT_URL — optional direct database URL used by Prisma migrations (sometimes the same as DATABASE_URL)
  - NEXTAUTH_SECRET — secret for NextAuth (random string)
  - NEXTAUTH_URL — e.g. `http://localhost:3000` (for local dev)
  - NEXT_PUBLIC_ALLOW_AUTH — set to `false` to disable signup/login (maintenance mode) or `true` to enable
  - RESEND_API_KEY — (optional) API key for Resend email service used for verification emails

Production (Vercel environment variables):

  - DATABASE_URL — production database connection string (Add to both Preview and Production scopes as needed)
  - DIRECT_URL — (if required by your DB provider)
  - NEXTAUTH_SECRET — production secret
  - NEXTAUTH_URL — `https://<your-vercel-app>.vercel.app`
  - NEXT_PUBLIC_ALLOW_AUTH — `false` (recommended during initial deploy), flip to `true` when ready
  - RESEND_API_KEY — add when enabling signup/email verification

Notes about the database

- Prisma is configured with `provider = "postgresql"` in `prisma/schema.prisma`.
- On Vercel you'll need a hosted Postgres database (Supabase, Neon, Heroku Postgres, or AWS RDS). Set `DATABASE_URL` accordingly.
- After setting `DATABASE_URL`, run Prisma migrations or `npx prisma db push` locally to initialize schema. In production, you may run migrations from CI or manually via a secure job.

Recommended Vercel settings

- Framework Preset: Next.js
- Build Command: `npm run build` (this runs `prisma generate && next build`)
- Output Directory: leave empty (Vercel will detect Next.js)
- Install Command: `npm install`

Quick deploy steps

1. On vercel.com, import the GitHub repo and pick the `deploy/vercel` branch.
2. In Project Settings → Environment Variables, add the variables above. For initial deploy you can set `NEXT_PUBLIC_ALLOW_AUTH=false`.
3. Deploy. Watch logs for `prisma generate` and `next build` steps. If Prisma fails because `DATABASE_URL` is missing, add it and redeploy.
4. Visit the Preview URL. If you see the maintenance message on `/login` and `/signup` that's expected when `NEXT_PUBLIC_ALLOW_AUTH=false`.

Supabase-specific instructions

1. Create a new project on https://app.supabase.com and note the project region and name.
2. In the Supabase project, go to Settings → Database → Connection string and copy the primary `Connection string (DATABASE_URL)`.
3. (Optional) Copy the `Direct URL` if Supabase provides it — this may be used as `DIRECT_URL` in `prisma/schema.prisma` to optimize certain operations.
4. In your GitHub repository (required for CI migrations): create a repository secret named `DATABASE_URL` with the Supabase connection string. Also add `DIRECT_URL` if you copied it.
5. In Vercel Project → Settings → Environment Variables: add `DATABASE_URL`, `DIRECT_URL` (if present), `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (`https://<your-app>.vercel.app`), and `NEXT_PUBLIC_ALLOW_AUTH=false` for initial deploy. Add `RESEND_API_KEY` when enabling signup verification.
6. Run the GitHub Actions workflow `Prisma Migrations` manually (Actions → Prisma Migrations → Run workflow) or merge to `main` (it requires environment approval). This will run migrations (if present) or `prisma db push` to create the schema.
7. After migrations finish, do a Preview deploy via Vercel (PR) and smoke-test the UI.

Notes about Supabase

- Supabase provides a hosted Postgres database. The connection string usually looks like `postgresql://postgres:password@db.<project>.supabase.co:5432/postgres`.
- Ensure you copy the full connection string from the Supabase dashboard (not the REST URL).
- If you need to restrict access, configure the DB network settings and rotate credentials as needed.

Verifying authentication and email delivery

- To enable signup and email verification, set `RESEND_API_KEY` in Vercel and switch `NEXT_PUBLIC_ALLOW_AUTH=true`.
- Test signup → check logs and the received verification email. Adjust Resend settings as needed.

Opening a PR

- With Vercel's Git integration, each PR creates a Preview deployment. Use that to validate changes before merging `deploy/vercel` back to `main`.

Troubleshooting

- Build fails at `prisma generate`: ensure `@prisma/client` is installed (it is) and that `prisma` binary can run. Make sure Node version on Vercel is compatible with this project.
- Runtime error `Missing env var NEXTAUTH_SECRET`: add the env var in the Vercel dashboard and redeploy.

What I changed in this branch

- Added `vercel.json` (simple Next.js build config)
- Added this `DEPLOYMENT.md` describing steps and env vars
 - Added a lightweight health-check endpoint at `app/api/health` (responds with JSON `{status: 'ok'}`)
 - Added a GitHub Actions workflow at `.github/workflows/ci.yml` that installs, generates Prisma client, and builds the app on PRs and pushes to `deploy/vercel` and `main`.

Next steps we can take for you (optional):

  - Add a GitHub Action to run Prisma migrations against the production DB on merge to `main`.
  - Add a small health-check endpoint and a status page for the deployment.
  - Add automatic backups or migration safety checks for the DB.
