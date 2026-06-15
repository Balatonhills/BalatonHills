# Issues

Tracking findings from the 2026-05-19 architecture audit. Roughly priority-ordered; pick out of order when timing makes sense.

---

## 🔴 Real risks

### 1. Double-booking is possible on `tee_times` — ✅ FIXED 2026-05-20

Partial unique index added; pre-flight check in the form for a friendly error.

- [x] Added partial unique index `tee_times_unique_active_slot on (starts_at, course_slug) where status <> 'cancelled'` (blocks also occupy a slot, so they're included)
- [x] `findConflictingTeeTime` helper in [src/lib/tee-times.ts](src/lib/tee-times.ts); pre-flight call in [src/routes/admin.tee-times.$id.tsx](src/routes/admin.tee-times.$id.tsx) with a per-status conflict message
- [x] Postgres unique-violation also caught and rephrased in the catch block as a belt-and-braces guard against a race
- [x] DB smoke confirmed: booking+booking blocked, block+booking blocked, cancelled rows allowed

### 2. RLS policies are wide-open for any authenticated user — ✅ FIXED 2026-05-26

Two roles introduced (`staff` + `admin`), stored in `auth.users.app_metadata.role`. Every domain table now has role-scoped RLS via a new `public.is_admin()` helper that reads the JWT claim.

- [x] Role plumbing in [src/lib/admin-auth.ts](src/lib/admin-auth.ts) (`useIsAdmin()`, `roleFromSession` defaults missing → `staff`)
- [x] Admin-only writes on `site_metadata`, `pricing_items`, `membership_tiers`
- [x] `members`: authenticated R+C+U; staff can't set `deleted_at`; hard DELETE admin-only
- [x] `tee_times`: full CRUD for any authenticated (both roles share this)
- [x] `expenses`: admin sees all, staff sees only own (`created_by = auth.uid()`); INSERT stamps `created_by` via the audit trigger
- [x] Backfilled four existing users (2 admin / 2 staff)
- [x] UI: top nav, dashboard, and per-page write affordances all adapt to role
- [x] Residual advisor flags on `members_auth_insert` and `tee_times_*` are deliberate (both roles allowed); the wide-open `*_auth_all` policies are gone

### 3. Site-password cookie is trivially forgeable — ✅ MOOT 2026-06-01

Gate removed entirely (site launched publicly). All SITE_PASSWORD code stripped from api/ssr.mjs and the env var unset on Vercel. Nothing to forge.

### 4. No double-submit guard on form saves

`saving` boolean disables the button visually, but rapid clicks before the React state flush can fire multiple inserts.

- [ ] Add a `submittingRef` (useRef) and early-return if already submitting
- [ ] Apply to every admin form (members, expenses, tee-times, pricing, memberships)

---

## 🟡 Maintenance debt

### 5. `updated_by` columns are never populated — ✅ FIXED 2026-05-20

Single consolidated trigger function handles both audit columns.

- [x] `public.set_audit_columns()` (BEFORE INSERT OR UPDATE) sets `updated_at = now()` on UPDATE and `updated_by = auth.uid()` on both. `search_path = ''` set explicitly.
- [x] Wired on all six tables (`site_metadata`, `pricing_items`, `membership_tiers`, `members`, `tee_times`, `expenses`); old per-table `*_touch` triggers dropped.
- [x] Service-role inserts leave `updated_by` NULL (no JWT) — confirmed via SQL smoke.
- [x] **2026-05-20 follow-up:** delete audit was previously broken (DELETE blows away the row, no `deleted_by` trail). Now: the five user-deletable tables (`pricing_items`, `membership_tiers`, `members`, `tee_times`, `expenses`) carry `deleted_at` + `deleted_by` columns. The Delete button performs a soft-delete UPDATE; the audit trigger fills `deleted_by` when `deleted_at` flips from NULL → non-NULL (and clears it on undelete). List/get/count/sum helpers across the libs filter `deleted_at IS NULL`. The tee-times unique-slot index was tightened to ignore soft-deleted rows so undeleting into an occupied slot is rejected. Receipt blobs in storage are preserved on soft-delete so an undelete restores the expense intact.
- [x] Verify in prod: edit a row from the admin UI → `select updated_by from <table> order by updated_at desc limit 1` shows your auth user's UUID. Delete a row → `select deleted_at, deleted_by from <table> where id = '<id>'` shows the timestamp + your UUID.

### 6. No CI workflow

Tests / lint / typecheck only run locally. Vercel's build runs `tsc` but not vitest.

- [ ] Add `.github/workflows/ci.yml` that runs `npm ci && npm run lint && npx tsc --noEmit && npm test` on PR + push to main
- [ ] Optional: add `actions/cache` for `node_modules`

### 7. Postgres functions missing `search_path` — ✅ FIXED 2026-05-20 (as side effect of #5)

Both flagged helpers (`touch_updated_at`, `touch_site_metadata_updated_at`) were dropped when the new `set_audit_columns()` trigger replaced them. The replacement explicitly sets `search_path = ''`. Supabase advisor confirms no `function_search_path_mutable` warnings remain.

### 8. No preview deployments on Vercel

Every push to `main` goes straight to production. Branch deploys would have caught the parent-Outlet-swallowing-child bug.

- [ ] Confirm preview deploys are enabled in Vercel project settings (free)
- [ ] Optionally: require a preview deploy before merging via branch protection

### 9. Duplicate permissive SELECT policies on `membership_tiers` — ✅ FIXED 2026-05-26 (as part of #2)

`tiers_auth_all` was dropped entirely; replaced with three role-scoped policies (`tiers_admin_insert/update/delete`). Only `tiers_public_read` covers SELECT now. Supabase advisor confirms the duplicate is gone.

### 10. Eight unindexed foreign keys

Supabase advisor flags `updated_by` FKs across all six tables, plus `members.tier_id` and `tee_times.primary_member_id`.

- [ ] One migration creating indexes on each FK column

### 11. Auth gate is client-side only

SSR returns "Loading…" placeholder for every admin URL regardless of session. Brief flash before redirect.

- [ ] Read session from cookie in [api/ssr.mjs](api/ssr.mjs) and 302 anon visitors to `/admin/login` for `/admin/*` paths (excluding `/admin/login`)
- [ ] Or accept the flash as a deliberate UX trade-off and document it here

### 12. Supabase Auth: leaked-password protection disabled

Free toggle in dashboard. Checks new passwords against HaveIBeenPwned.

- [ ] Enable in Supabase dashboard → Authentication → Policies

---

## 🟢 Polish / opinions

### 13. Hardcoded operating hours and slot interval

[src/lib/tee-times.ts](src/lib/tee-times.ts): `DAY_START_HOUR = 7`, `DAY_END_HOUR = 19`, `SLOT_INTERVAL_MIN = 10`.

- [ ] Move to a `courses` table or a `settings` table so they can differ per course / be edited from admin

### 14. Currency = HUF baked in throughout

~8 sites default to `"HUF"`. Painful if/when expanding to euros.

- [ ] Centralize in a single `DEFAULT_CURRENCY` constant (and a settings row eventually)

### 15. Duplicate `Field` component across 5 admin routes

`admin.expenses.$id.tsx`, `admin.members.$id.tsx`, `admin.tee-times.$id.tsx`, `admin.website.tsx`, `admin.memberships.tsx` all define their own.

- [ ] Extract to `src/components/admin/Field.tsx` (also a `Button`, `Table` while at it)

### 16. Tee-sheet uses plain `<a href>` instead of TanStack `<Link>`

Workaround from the click-debug session. SPA snappiness was lost (every click is a full page load).

- [ ] Revert to `<Link>` now that the parent-Outlet bug is fixed; verify clicks still navigate

### 17. Signed receipt URLs expire in 1h

Open a receipt in a new tab, leave for an hour, refresh → 404.

- [ ] Bump TTL to 24h in [src/lib/expenses.ts](src/lib/expenses.ts) (`SIGNED_URL_TTL_SEC`)
- [ ] Or generate signed URLs lazily on click instead of on form load

### 18. Plan file stale

`~/.claude/plans/so-i-m-making-this-ancient-tide.md` describes pre-expenses scope as TODO.

- [ ] Either delete it (the work is done and tracked here) or refresh with current state

---

## What's working well (no action needed)

- Loaders fall back to hardcoded values when Supabase is unreachable (`/membership`, every route's `head()`)
- 60s in-memory cache on stable reads (site metadata, tier list) — cheap SSR, picks up edits fast
- File-based routing produces per-route chunks; admin code doesn't bloat the public bundle
- Receipts live in a private storage bucket with signed URLs, not on a public CDN
