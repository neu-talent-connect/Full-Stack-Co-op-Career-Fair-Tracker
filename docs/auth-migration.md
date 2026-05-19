# Auth Migration: NextAuth → Supabase

## The Old System (NextAuth)

The original auth was built with [NextAuth v4](https://next-auth.js.org/) using a `CredentialsProvider` — meaning we handled email/password login ourselves, end-to-end.

### How it worked

**Signup** (`app/api/auth/signup/route.ts`):
1. User submits email + password
2. Our route validated the input (regex, length checks)
3. Normalized the email (`.toLowerCase().trim()`)
4. Hashed the password with `bcryptjs` at cost factor 12
5. Stored the user row in our own Postgres `User` table (email, hashed password, name)
6. Set `emailVerified: new Date()` — emails were **auto-verified, no confirmation email sent**

**Login** (`lib/auth.ts` → `app/api/auth/[...nextauth]/route.ts`):
1. User submits email + password
2. NextAuth's `authorize()` callback looked up the user in Prisma
3. Compared the submitted password against the stored hash with `bcrypt.compare()`
4. On success, NextAuth issued a **JWT** (a signed token stored in a cookie)
5. The JWT carried `user.id` via a custom `jwt` callback

**Session access** (`components/SessionProvider.tsx`):
- The app was wrapped in `<SessionProvider>` so any client component could call `useSession()` to get the current user
- `types/next-auth.d.ts` extended NextAuth's default types to include `user.id`, since NextAuth doesn't include it by default

### What the database looked like

The `User` table was part of our own Prisma schema — we owned the password column. Every other table (`Job`, `Contact`, etc.) had a `userId` foreign key pointing to it.

---

## Why We Moved to Supabase

**1. No email verification.**
The old system set `emailVerified: new Date()` on every signup, skipping confirmation entirely. Anyone could register with a fake email and immediately access the app. Supabase sends a real confirmation email out of the box.

**2. We were managing passwords ourselves.**
`bcrypt` is industry-standard, but rolling your own password pipeline means you're responsible for every edge case: timing attacks, reset flows, account lockouts. Supabase handles all of that, battle-tested at scale.

**3. Too much boilerplate for what it did.**
The old system required: a custom signup route, an auth config file, a SessionProvider wrapper, type augmentation, and manual email normalization. Supabase replaces all of it with `supabase.auth.signUp()` and `supabase.auth.signInWithPassword()`.

**4. Password reset was unimplemented.**
There was no "forgot password" flow. Building it with NextAuth + custom DB would have required a reset-token table, an email sender (Resend was installed but unused), and more custom routes. Supabase provides it for free.

**5. Supabase also gives us the database.**
We were already using Supabase Postgres for storage. Having auth live in the same platform means user identity is consistent — `supabase.auth.getUser()` returns the same `user.id` that owns rows in all other tables.

---

## The New System (Supabase Auth)

| Concern | Old (NextAuth) | New (Supabase) |
|---|---|---|
| Password storage | Our `User` table, bcrypt | Supabase internal (never exposed) |
| Session token | JWT in cookie, managed by NextAuth | JWT in cookie, managed by Supabase |
| Email verification | None (auto-verified) | Confirmation email, link to `/auth/callback` |
| Session refresh | Manual NextAuth config | `middleware.ts` calls `getUser()` on every request |
| Client access | `useSession()` from next-auth/react | `createClient()` from `lib/supabase/client.ts` |
| Server access | `getServerSession()` | `createClient()` from `lib/supabase/server.ts` |
| Password reset | Not implemented | Built into Supabase dashboard |

The key files in the new system:
- `lib/supabase/client.ts` — browser client (use in `"use client"` components)
- `lib/supabase/server.ts` — server client (use in API routes and Server Components)
- `middleware.ts` — refreshes the session cookie on every request so users stay logged in
- `app/auth/callback/route.ts` — handles the link from the confirmation email, exchanges a one-time code for a real session
