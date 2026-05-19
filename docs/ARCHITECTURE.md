# Architecture

## Dual-Storage Pattern

The app serves two user types from a single React component tree:

| User type | Storage | Data path |
|-----------|---------|-----------|
| Guest (no account) | `localStorage` | Browser only — data lives in `careerFairData` key |
| Authenticated | PostgreSQL (Supabase) | Server-side via REST API routes under `app/api/` |

### How it works

`components/AppDataProvider.tsx` is the single React context that owns all app state. On mount it checks the NextAuth session status:

```
session.status === 'authenticated'
  → fetch from /api/jobs, /api/contacts, …  (Postgres)
  → all mutations call fetch() API routes

session.status !== 'authenticated'
  → read/write localStorage via useLocalStorage hook
  → all mutations are synchronous, client-only
```

The critical lines that wire this together:

```ts
const data    = isAuthenticated ? apiData    : localData;
const setData = isAuthenticated ? setApiData : setLocalData;
```

Every CRUD function (addJob, updateJob, deleteJob, …) branches on `isAuthenticated` and either hits the API or mutates local state directly.

### Auth state

Auth is currently **disabled** (`NEXT_PUBLIC_ALLOW_AUTH=false`). The login/signup pages render a maintenance screen and the app runs entirely in guest mode. The NextAuth setup (credentials provider + bcrypt) is present but dormant — see [CLAUDE.md](../CLAUDE.md) for the decision to re-enable or remove it.

### API routes

All routes live under `app/api/` and follow a consistent pattern:

1. Verify the session with `getServerSession(authOptions)` — return 401 if missing.
2. Scope every Prisma query to `session.user.id` — no cross-user data leakage.
3. Return JSON with appropriate HTTP status codes.

### Data migration

`components/MigrateDataModal.tsx` lets a guest copy their localStorage data to the server after creating an account. It iterates the local store and POSTs each record to the relevant API endpoint.

### Key files

| File | Role |
|------|------|
| `components/AppDataProvider.tsx` | Single source of truth; swaps storage backend |
| `hooks/useLocalStorage.ts` | Typed localStorage read/write with SSR guard |
| `hooks/useUndo.ts` | In-memory undo stack (client-only) |
| `lib/auth.ts` | NextAuth config (credentials provider) |
| `lib/prisma.ts` | Singleton Prisma client |
| `lib/api-client.ts` | Typed fetch wrappers for API routes |
| `prisma/schema.prisma` | Database schema |
| `types/index.ts` | Shared TypeScript types for Job, Contact, etc. |
