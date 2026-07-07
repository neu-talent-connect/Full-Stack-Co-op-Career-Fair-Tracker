# Full-Stack Audit Report — Career Fair Tracker

**Date:** 2026-07-07 · **Scope:** every route in `app/api/`, `lib/validation.ts`, `prisma/schema.prisma`, `middleware.ts`, auth flow, `components/AppDataProvider.tsx` + migration, all pages/components (code review), plus live browser testing (guest mode, desktop + 375px mobile, light + dark themes). **No code was changed.**

**Method:** three parallel code-audit passes (backend/API, dual-storage/migration, frontend/UX) cross-checked against live testing in the running app.

**Headline:** the backend is in good shape — every API route is auth-scoped, zod-validated, and error-logged; **no cross-user read/write path was found**. The real risk is concentrated in three places: the **guest→account migration** (two crash/duplication bugs), the **undo system** (leaks across accounts, can duplicate or destroy records), and **silent failure paths in authenticated mode** (optimistic UI that lies when the API errors). None of the P0s require a schema change to fix.

Severity: **P0** = data loss / security / breaks · **P1** = real problem · **P2** = polish.

---

## P0 — Fix before anyone signs in with real data

### P0-1. Migration is not crash-safe: closing the tab mid-migration duplicates records
- **File:** [MigrateDataModal.tsx:97-129](components/MigrateDataModal.tsx:97)
- **Repro:** guest with 20 records signs in → starts migration → closes tab after 10 POSTs succeed. `localStorage` is only rewritten *after* the whole loop, so it still holds all 20; next login re-offers migration → 10 duplicates.
- **Fix:** persist progress per record — after each successful POST, rewrite `careerFairData` with that record removed (or tag records `migratedAt`) so a re-run only sends survivors.

### P0-2. Migration/Discard writes localStorage behind the provider's back — discarded or migrated data gets resurrected and re-duplicated
- **File:** [MigrateDataModal.tsx:129](components/MigrateDataModal.tsx:129) (partial path) and [:160](components/MigrateDataModal.tsx:160) (Discard), vs [useLocalStorage.ts:26](hooks/useLocalStorage.ts:26) and soft sign-out at [Navigation.tsx:161-165](components/Navigation.tsx:161)
- **Repro:** the modal calls `localStorage.setItem`/`removeItem` directly, but `useLocalStorage` reads the key once at mount and keeps a full in-memory snapshot. Sign-out is a soft navigation (`router.push`, no reload), so the stale snapshot survives — the first guest-mode edit writes the **entire pre-migration dataset back** over what the modal wrote. "Discard Guest Data" is silently undone; partially-migrated data re-migrates as duplicates. Only the full-success path is safe because it happens to `window.location.reload()`.
- **Fix:** reload (or route the writes through the provider) on the partial-failure and Discard paths too; longer-term, make `useLocalStorage` listen for `storage` changes or expose a `refresh()`.

### P0-3. "Load Sample Data" silently and permanently erases guest follow-ups, interviews, and research contacts
- **File:** guard at [app/page.tsx:39](app/page.tsx:39) and [app/spreadsheet/page.tsx:104](app/spreadsheet/page.tsx:104); guest branch at [AppDataProvider.tsx:1269](components/AppDataProvider.tsx:1269)
- **Repro:** the confirm dialog only fires if `jobs/companies/contacts` exist, but the guest branch does `setLocalData(sampleData)` — a wholesale replace of all six arrays. A guest who followed the app's own "research first" flow (only research contacts + follow-ups) clicks the prominently-offered button and loses everything, no confirm, no undo. Bonus inconsistency: in authenticated mode the same button *appends*, so the "REPLACE all your data" warning lies there.
- **Fix:** include all six entity arrays in the guard, and make the guest branch append like the auth branch.

### P0-4. Global Ctrl/Cmd+Z hijack breaks typing undo app-wide and can re-POST a deleted record mid-keystroke
- **File:** [Navigation.tsx:56-66](components/Navigation.tsx:56)
- **Repro:** the listener calls `preventDefault()` + `undo()` unconditionally — even with focus in an input. Typing a note, hitting Ctrl+Z to fix a typo, silently re-inserts the last deleted record (the undo stack persists in localStorage across sessions — see P1-3), and native text undo never works anywhere.
- **Fix:** bail out when `e.target` is an INPUT/TEXTAREA/contentEditable (the check already exists in [useKeyboardShortcuts.ts:22-33](hooks/useKeyboardShortcuts.ts:22) — mirror it).

---

## P1 — Real problems

### Data integrity / backend

**P1-1. `Interview.jobId` has no foreign key and is never remapped on migration — permanent dangling references.**
[schema.prisma:125](prisma/schema.prisma:125), [app/api/jobs/[id]/route.ts:94](app/api/jobs/[id]/route.ts:94), [MigrateDataModal.tsx:101-117](components/MigrateDataModal.tsx:101), [lib/validation.ts:88](lib/validation.ts:88). Three compounding gaps: (a) deleting a job leaves its interviews orphaned (no cascade, no cleanup); (b) migration POSTs guest interviews with their old local-storage jobIds while jobs get new server cuids — the reference is corrupted at rest and unrepairable once local ids are gone; (c) the API never verifies a submitted `jobId` references a job the user owns. Latent today only because no UI reads `interview.jobId` (see P1-9). **Fix:** add a real `@relation` with `onDelete: Cascade` (coordinate the `db push` with the collaborator's schema freeze), migrate jobs first and remap ids, and validate `jobId` ownership in the interviews routes.

**P1-2. `/api/health` is public and leaks the global row count plus DB host details.**
[app/api/health/route.ts:59](app/api/health/route.ts:59) runs an unscoped `prisma.job.count()` and returns the total across **all users** to anyone, alongside DB host/region/pooler params (lines 41-43) and up to 3 lines of raw Prisma error text on failure (lines 79-82). **Fix:** return `{ ok: true }` for the model probe without the count; map errors to coarse categories; keep host detail behind an env flag.

**P1-3. Undo state leaks across the auth boundary — records cross between guest and account.**
[useUndo.ts:11,17-40](hooks/useUndo.ts:11) persists `lastDeleted` in localStorage and nothing clears it on auth change (sign-out cleanup at [AppDataProvider.tsx:76-83](components/AppDataProvider.tsx:76) clears only `migrationDismissed`). Guest deletes → signs in → undo POSTs the guest record into the account bypassing migration; or an authenticated delete → sign out → the next guest's undo inserts the server record into guest storage, which later duplicates on migration. **Fix:** call `clearUndoStack()` in the `SIGNED_IN`/`SIGNED_OUT` listener, or namespace the key by user id.

**P1-4. `undo()` destroys the undo record before the restore succeeds.**
[AppDataProvider.tsx:1054](components/AppDataProvider.tsx:1054) pops the stack (clearing its localStorage entry, [useUndo.ts:47-53](hooks/useUndo.ts:47)) *before* the POST; if the restore fails the catch only toasts and the deleted record is gone for good. **Fix:** peek first, pop only on success (or re-push in the catch).

**P1-5. Toast UNDO doesn't consume the undo stack → pressing undo later duplicates the record.**
Toast restore at [AppDataProvider.tsx:272-292](components/AppDataProvider.tsx:272) restores via its own closure and never pops; a subsequent global undo re-inserts the same record. Guaranteed DB duplicate in auth mode (server assigns a new cuid); guest mode has an exists-by-id guard for jobs only ([:317-321](components/AppDataProvider.tsx:317)) — companies/contacts/follow-ups/interviews have none. **Fix:** pop the stack when the toast UNDO succeeds, and add the id-guard to every guest restore path.

**P1-6. Zod schemas accept unbounded and unvalidated input.**
[lib/validation.ts](lib/validation.ts): no `.max()` on any string (multi-MB notes accepted on every entity, and no rate limiting anywhere — trivial storage abuse); required fields pass `""` (line 21-23 etc.); status/type/priority/strength accept any string, so garbage corrupts dashboard stats; `interest`/`ranking` have no bounds (beyond-Int32 values make Prisma throw a 500 instead of a 400); and `researchCreateSchema.companies` is `z.array(z.any())` (line 107) — arbitrary unbounded JSON written straight to a Json column. **Fix:** `.trim().min(1).max(200)` for scalars, `.max(10_000)` for text, `z.enum([...])` for closed sets, `.min(1).max(5)` for ratings, and a typed element schema + `.max(N)` for `companies`.

### Silent failures / trust (authenticated mode)

**P1-7. No page has a loading state — authenticated users see lying empty states while data fetches.**
`isApiLoading` exists at [AppDataProvider.tsx:96](components/AppDataProvider.tsx:96) but is never exposed. Until the six GETs settle, users see "No applications yet", the getting-started banner, and the Load Sample Data button ([SpreadsheetTable.tsx:342-350](components/dashboard/SpreadsheetTable.tsx:342), [app/page.tsx:100-112](app/page.tsx:100)). Clicking sample-data during that window POSTs samples into an account that already has data, then the settling fetch hides them until refresh ([AppDataProvider.tsx:134,147](components/AppDataProvider.tsx:134)) — that same wholesale `setApiData(next)` also clobbers any record the user added while the load was in flight. **Fix:** expose `isLoading`, render skeletons, gate sample-data/mutations on it, and merge fetched data per-entity instead of replacing state.

**P1-8. Form submits don't await the API — on failure the form is wiped and the user is redirected as if it saved.**
[app/applications/page.tsx:27-41](app/applications/page.tsx:27) (same pattern in [companies/page.tsx:23-34](app/companies/page.tsx:23), [networking/page.tsx:89-99](app/networking/page.tsx:89), [FloatingAddButton.tsx:24-34](components/FloatingAddButton.tsx:24)): handlers call `addJob(...)` without awaiting, reset the form, and (on applications) redirect to `/`. In auth mode `add*` throws on failure ([AppDataProvider.tsx:186](components/AppDataProvider.tsx:186)) → unhandled rejection, typed data gone, only signal a toast possibly on another page. A failed per-entity fetch has the same shape: a 5-second toast, then a permanent misleading empty view that accepts re-adds (→ duplicates after refresh) ([AppDataProvider.tsx:149-154](components/AppDataProvider.tsx:149)). **Fix:** await in try/catch, keep the form populated on failure, navigate only on success; expose per-entity load errors with an inline Retry.

**P1-9. Interviews are a ghost feature — full CRUD in the provider, no UI anywhere.**
[AppDataProvider.tsx:27-49](components/AppDataProvider.tsx:27); no page under `app/` creates or displays interviews, yet the migration modal counts them ("We found: 2 interviews") and the dashboard advertises an Interviews stat. **Fix:** build the minimal interviews UI or remove interviews from the migration summary/stats until it exists.

### Guest-mode correctness

**P1-10. `useLocalStorage` setter resolves functional updates against a stale render-time snapshot.**
[useLocalStorage.ts:26](hooks/useLocalStorage.ts:26): two provider mutations batched in one tick (e.g. `addJob` then `addFollowUp` in a submit handler) — the second computes from the pre-first-write snapshot and the first write is silently lost. **Fix:** move the localStorage write inside `setStoredValue(prev => ...)`.

**P1-11. Two guest tabs silently clobber each other.**
No `storage` event listener anywhere ([useLocalStorage.ts](hooks/useLocalStorage.ts)); each tab serializes its whole in-memory snapshot, so tab B's add erases tab A's. **Fix:** listen for `storage` and merge/refresh.

**P1-12. Inline interest edit saves a string, breaking the dashboard filter.**
[SpreadsheetTable.tsx:86-92](components/dashboard/SpreadsheetTable.tsx:86) passes `interest: "4"`; the filter compares with `Number(filters.interest)` strictly ([app/page.tsx:57](app/page.tsx:57)), so inline-edited jobs vanish from filtered views. **Fix:** coerce to `Number` when `field === 'interest'`.

### Accessibility (blocking, not polish)

**P1-13. The flagship spreadsheet can't be edited by keyboard.** Editable cells are plain `<td onClick>` with no `tabIndex`/`role`/key handler ([SpreadsheetTable.tsx:415-486](components/dashboard/SpreadsheetTable.tsx:415)). **Fix:** `tabIndex={0}`, `role="button"`, Enter/Space handling.

**P1-14. Toasts — the app's only feedback channel — are invisible to screen readers.** No `role="status"`/`aria-live` on the container ([Toast.tsx:58-62](components/Toast.tsx:58)). **Fix:** `role="status" aria-live="polite"`; `role="alert"` for errors.

**P1-15. No modal implements dialog semantics or Escape.** [AddJobPanel.tsx:76-95](components/AddJobPanel.tsx:76), [WelcomeModal.tsx:143-161](components/onboarding/WelcomeModal.tsx:143), [MigrateDataModal.tsx:175-192](components/MigrateDataModal.tsx:175), [KeyboardShortcutsModal.tsx:35-58](components/KeyboardShortcutsModal.tsx:35) — no `role="dialog"`, `aria-modal`, focus trap; the shortcuts modal even advertises "Escape — Close modal" while its action is an empty function ([useKeyboardShortcuts.ts:123-130](hooks/useKeyboardShortcuts.ts:123)). **Fix:** one shared modal wrapper.

**P1-16. Ctrl+N fires two competing actions.** Registered by both [useKeyboardShortcuts.ts:76-88](hooks/useKeyboardShortcuts.ts:76) (navigate to `/applications`) and [FloatingAddButton.tsx:14-22](components/FloatingAddButton.tsx:14) (open panel) — one keypress does both. **Fix:** register once.

**P1-17. Deleting a research contact is the only delete with no undo and no toast.** [AppDataProvider.tsx:565-589](components/AppDataProvider.tsx:565); only a bare `confirm()` guards it ([networking/page.tsx:211-213](app/networking/page.tsx:211)). **Fix:** mirror the deleteContact undo pattern (requires adding `research` to the undo type union, [useUndo.ts:6](hooks/useUndo.ts:6)).

---

## P2 — Polish and consistency

**Backend**
- No rate limiting on any write route ([app/api/jobs/route.ts:29](app/api/jobs/route.ts:29) et al.) — pairs badly with unbounded strings (P1-6). Add a lightweight limiter.
- Dates are free-text strings; `followups` orders by `dueDate asc` as a string ([app/api/followups/route.ts:18](app/api/followups/route.ts:18)) — non-ISO input sorts wrong. Enforce ISO via zod.
- PUT handlers do `updateMany` then `findFirst` non-atomically — a concurrent delete yields `200` with body `null` ([app/api/jobs/[id]/route.ts:56-71](app/api/jobs/[id]/route.ts:56), same in all six). Return 404 when the re-read is null.
- `followups/[id]` and `interviews/[id]` lack GET (405 instead of parity) — document in the planned `docs/openapi.yaml` or add.
- Only `Job` has `updatedAt @updatedAt`; the other five models have none ([schema.prisma:60](prisma/schema.prisma:60) etc.). Add when the schema freeze lifts.
- Auth callback: derive origin from `x-forwarded-host` in prod, and the "Email link expired" error shows for failed Google OAuth exchanges ([app/auth/callback/route.ts:20-24](app/auth/callback/route.ts:20)).
- Middleware's 3s `Promise.race` silently skips token refresh when Supabase is slow ([middleware.ts:36](middleware.ts:36)) — log when the timeout wins.
- Migration has a commit-but-lost-response edge that re-creates records on retry ([MigrateDataModal.tsx:102-116](components/MigrateDataModal.tsx:102)) — a `(userId, sourceId)` unique idempotency key would close it.

**Provider / data**
- "Remind me later" (and the X) set the permanent `migrationDismissed` flag — a user who never signs out is never re-offered and their guest data sits invisible indefinitely ([MigrateDataModal.tsx:149-152,187-192](components/MigrateDataModal.tsx:149)). Use a timestamped snooze.
- Partial-migration success is invisible until manual refresh — only the full-success branch reloads ([MigrateDataModal.tsx:126-139](components/MigrateDataModal.tsx:126)).
- `clearAllData` in auth mode only blanks in-memory state; server rows return on refresh ([AppDataProvider.tsx:1048-1050](components/AppDataProvider.tsx:1048)). Unused today — remove or implement.
- List ordering diverges: guest is insertion-ordered, authenticated reload is `createdAt desc`, and new records jump position after refresh. Sort client-side to match the API.
- `add*` throws after toasting while `update*`/`delete*` swallow — inconsistent contract across the fifteen mutators ([AppDataProvider.tsx:186 vs 224](components/AppDataProvider.tsx:186)).
- localStorage quota failure is console-only (UI shows data that evaporates on reload); corrupt JSON is reset and then permanently overwritten ([useLocalStorage.ts:13-19,33-35](hooks/useLocalStorage.ts:13)). Stash the corrupt payload and show a banner.
- No multi-device refresh for authenticated users (fetch happens once, on mount) — consider refetch-on-focus.

**UX / first-run** (live-verified where noted)
- *(live)* Below `md`, the Login / Sign Up nav links are unlabeled icons — no `aria-label`, and sighted first-timers can't tell which is which ([Navigation.tsx:177-190](components/Navigation.tsx:177)). The user-menu button also lacks `aria-expanded`.
- *(live)* The floating "+ Add Application" button renders on `/login` and `/signup` ([app/layout.tsx:40](app/layout.tsx:40), [FloatingAddButton.tsx:39-53](components/FloatingAddButton.tsx:39)) — hide on auth paths like GuestModeBanner does.
- *(live)* First-run onboarding (WelcomeModal) only fires on `/spreadsheet`, but the site root is the Dashboard — many first-timers never see it ([app/spreadsheet/page.tsx:33-42](app/spreadsheet/page.tsx:33)). Same effect never reads the `dismissedGettingStarted` flag it writes, so the banner reappears every visit.
- *(live)* Networking contact cards show an unexplained "(0/5)" when no priority is set, and the form stacks three unexplained rating systems (Connection Type, Cold/Warm/Hot, ⭐1-5) with no helper text ([networking/page.tsx:692-711](app/networking/page.tsx:692)).
- *(live)* Networking tabs render Research first but default to Contacts — the highlighted tab is the middle one ([networking/page.tsx:52](app/networking/page.tsx:52)).
- *(live, mobile)* Spreadsheet scrolls horizontally fine, but Edit/Delete actions are the last column — far off-screen at 375px; the research add-row uses fixed `w-40`/`w-48` in a non-wrapping flex and cramps on mobile ([networking/page.tsx:402-440](app/networking/page.tsx:402)).
- Row delete in the spreadsheet has no confirm (undo-toast only) while applications/companies use `confirm()` — pick one destructive-action pattern ([SpreadsheetTable.tsx:516-522](components/dashboard/SpreadsheetTable.tsx:516)).
- Validation errors via native `alert()` despite a Toast system and an unused `Input error` prop ([SpreadsheetTable.tsx:144](components/dashboard/SpreadsheetTable.tsx:144), [AddJobPanel.tsx:37](components/AddJobPanel.tsx:37), [resources/page.tsx:116](app/resources/page.tsx:116)).
- Submitting Add Application bounces to `/` with no success toast ([app/applications/page.tsx:40](app/applications/page.tsx:40)).
- Empty states are text-only with no call-to-action ([networking/page.tsx:991-995](app/networking/page.tsx:991), [SpreadsheetTable.tsx:342-350](components/dashboard/SpreadsheetTable.tsx:342)).
- Ctrl+K is advertised but only `console.log`s (and blocks the browser's Ctrl+K); Ctrl+D hijacks bookmarking and desyncs the ThemeProvider icon ([useKeyboardShortcuts.ts:89-110](hooks/useKeyboardShortcuts.ts:89)).
- `/forgot-password` is dormant but still live and functional-looking — a dead-end flow for anyone with an old bookmark ([app/forgot-password/page.tsx:16-40](app/forgot-password/page.tsx:16)). Redirect to `/login` while email/password is off.
- CSV export only quotes commas — newlines/quotes in Notes corrupt rows, and internal columns (`id`, `userId`, `createdAt`) are exported ([lib/utils.ts:59-68](lib/utils.ts:59)).
- A11y details: hand-rolled `<label>`s without `htmlFor` bypass the ui/Input primitive that fixes exactly this ([applications/page.tsx:116-118](app/applications/page.tsx:116) and 6 more spots); icon-only edit/delete/close buttons missing `aria-label` across ~8 files (Companies page does it right); AutocompleteInput has no combobox ARIA or arrow-key support ([AutocompleteInput.tsx:81-103](components/ui/AutocompleteInput.tsx:81)); notes-column resize is mouse-only ([SpreadsheetTable.tsx:156-185](components/dashboard/SpreadsheetTable.tsx:156)); empty stars/pins use `text-gray-300` with no dark variant ([networking/page.tsx:34](app/networking/page.tsx:34)); "-" placeholders are sub-AA `text-gray-400` ([SpreadsheetTable.tsx:291](components/dashboard/SpreadsheetTable.tsx:291)); welcome-modal step dots are unlabeled 8px targets ([WelcomeModal.tsx:171-181](components/onboarding/WelcomeModal.tsx:171)).

---

## What's already solid

- **API auth scoping is clean across the board**: every `[id]` route uses `{id, userId}` with `findFirst`/`updateMany`/`deleteMany` (avoiding the unscoped-`findUnique` trap), every method 401s when unauthenticated, malformed JSON is guarded, update schemas strip `id`/`userId`, and error responses don't leak internals. No cross-user path found.
- **No schema drift**: all six validation schemas match `schema.prisma` field-for-field.
- Guest mode is explained clearly in three places; the disabled email/password fields are properly `aria-hidden` with an honest "isn't available yet" note.
- Delete-with-UNDO toasts (verified live), the two-step Discard confirm in migration, native required-field validation on forms, and the `useId`-based ui primitives are all good patterns — the findings above are mostly places that bypass them.

---

## Top 5 things to fix before the pilot

1. **Make migration crash-safe and provider-aware** (P0-1 + P0-2): persist per-record progress and reload on the partial/discard paths. This is the single highest data-loss/duplication risk for the exact flow you'll demo — guest tries the app, likes it, signs in.
2. **Fix "Load Sample Data" in guest mode** (P0-3): guard all six entities and append instead of replace. One click currently erases a real user's research with no warning.
3. **Scope Ctrl+Z and consume the undo stack properly** (P0-4 + P1-4 + P1-5 + P1-3): don't fire in text fields, pop only on success, clear on auth change. Right now undo can destroy, duplicate, or cross-contaminate data.
4. **Stop silent failures in authenticated mode** (P1-7 + P1-8): expose `isLoading`, await form submits, keep the form on failure. Students on flaky campus Wi-Fi will hit these paths in week one and conclude the app ate their data.
5. **Tighten validation and the health endpoint** (P1-6 + P1-2): max lengths, enums, rating bounds, a typed `companies` schema, and no global row count / raw DB errors on a public endpoint.
