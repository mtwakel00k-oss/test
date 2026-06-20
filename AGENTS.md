<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Tenant Database State
The tenant Supabase DB (`zordvqqjnlmxgtbkrspp.supabase.co`) is **missing columns**: `is_available` on `produits`, `payment_status`/`order_type`/`order_number` on `orders`, `order_id` on `ratings`. The tenant migrations were never fully applied.
- `GET /api/products` auto-detects missing `is_available` and defaults to `true` for all products.
- Toggle availability, payment status, order type in admin UI will appear to work but won't persist until migration is run.
- To apply: run the SQL from `GET /api/run-sql?slug=burger-house` in the tenant's Supabase Dashboard SQL editor.

## Session Security (Phase 3)
Session cookie stores only `{email, role, slug}` — **no DB credentials**.
- `supabaseForRequest(req)` is **async**: looks up tenant credentials server-side via `getTenantConfig(slug)` (10s TTL cache). All 16 call sites use `await`.
- `browserSupabase()` reads `window.__TENANT_CONFIG__` (injected by `[restaurant_slug]/layout.tsx` from `getTenantConfigRSC`).
- `tenant` cookie: **removed** (no longer set by login, no longer read by any code). `useSlug()` reads from `window.__TENANT_CONFIG__` instead.
- Upload route (`POST /api/upload`): looks up `getTenantConfig(slug)` server-side; uses tenant's own Supabase keys.
- Layout (`app/[restaurant_slug]/layout.tsx`): injects `__TENANT_CONFIG__` with `{url, key, slug, name, logo_url}` using `tenant.supabase_anon_key` (never exposes `sb_secret_` keys).

## Admin Stats API
Dashboard fetched via `GET /api/admin/stats?period=7d|30d|6m|12m` or `?mode=root` — **not** direct Supabase queries. All aggregation runs server-side with admin role check.
- `app/[restaurant_slug]/admin/page.tsx`: uses `fetchApi("/api/admin/stats?period=...")` instead of `supabase().from(...)`.
- `app/admin/page.tsx`: uses `fetchApi("/api/admin/stats?mode=root")`.
- Real-time subscriptions (`supabase().channel(...)`) remain for refresh triggers only (no data queries).

## Rate Limiting
- `lib/rate-limit.ts`: distributed sliding window — Upstash Redis (primary) + Supabase `rate_limits` table (fallback), keyed by client IP.
- `POST /api/ratings`: 10 req/min per IP.
- `POST /api/orders`: 20 req/min per IP.
- Returns 429 with `Retry-After` header when exceeded.
- Falls open (allows all) if both Redis and Supabase are unreachable.

## RLS / Migration SQL
- `sql/rls-policies.sql`: RLS policies for all tenant tables (produits, categories, orders, order_items, ratings).
- `data/migration-v2.sql`: tenant migration v2 (adds `is_available`, `image_url`, `payment_status`, recreates `v_products_flat` view, adds RLS policies).
- `data/migration-v3.sql`: self-healing migration (also adds `order_type`, `order_number`, `order_id` on ratings, missing columns on categories).
- To apply tenant migration: run SQL from `GET /api/run-sql?slug=burger-house` in the tenant Supabase Dashboard.

## Root Admin
- Created via `POST /api/auth/setup-root` (default: `root@root.app` / `RootAdmin@123`).
- Login at `/login` with Owner tab → redirects to `/admin` (root dashboard, `?mode=root`).
- Role `owner` has same permissions as `admin` across all API routes.
- Session stores `{email, role: "owner", slug: ""}` — no tenant association.

## Cron Job — Cleanup Cancelled Orders
- **Route**: `GET /api/cron/cleanup?secret=<CRON_SECRET>`
- **Schedule**: Daily at 3 AM (configured in `vercel.json`)
- **Function**: Deletes `order_items` + `orders` where `status = 'cancelled'` AND `created_at < 30 days ago`.
- **Env**: Requires `CRON_SECRET` in `.env.local`.
- **Per-tenant**: Queries all active tenants from master DB, runs cleanup on each.
  - Tenants sharing the master project: uses `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS).
  - Separate-project tenants: uses `supabase_service_key` from `tenants` table if stored, else falls back to `supabase_anon_key` (RLS may block DELETE).
- **DB setup**: Run `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS supabase_service_key TEXT;` on master to store service keys for external tenants.

## Login Note
Use Node.js `http.request` for API testing (PowerShell curl has escaping issues with the login endpoint). Login with `{ username: 'admin', password: 'Admin123' }` — works reliably via Node.js.

<!-- BEGIN:session-2025-06-18 -->
## Session Progress (Jun 18) — Production Deployment & Login Fix

### Goal
Deploy the stable app to production with all tests passing, fix login 500 error, verify CSP works.

### Done
1. **Deploy to Vercel** — `https://simploo.vercel.app` aliased and live.
2. **CSP fix** — `proxy.ts` generates `crypto.randomUUID()` nonce per request with `'strict-dynamic'`. Removed deprecated `browsing-topics` from Permissions-Policy.
3. **`env.ts`** — Removed top-level `for` loop with `process.env[key]` (dynamic key not replaced by Next.js build step). Switched to static property access with `|| ""` defaults.
4. **Tests (139 passing)** — Fixed all 21 test files (products, categories, ratings, admin-stats, admin-plans, audit-log, delivery).
5. **Middleware → Proxy** — Renamed `middleware.ts` → `proxy.ts` (Next.js 16 convention, export must be `proxy`).
6. **`SESSION_ENCRYPTION_KEY` fix** — Was empty string on Vercel Production. Deleted and re-added with correct value.
7. **Login verified** — `POST /api/auth/login` now returns 200 with `{ok:true, slug:"burger-house"}`.
8. **Admin dashboard verified** — Fully renders with real data (1,250 DZD revenue, 3 orders, 5 top products, 2 drivers, 2 ratings).
9. **No CSP warnings** in production console.
10. **Tenant DB migration** — `data/run-this.sql` applied manually in Supabase Dashboard for `zordvqqjnlmxgtbkrspp.supabase.co`.

### Known
- React hydration error #418 — **fixed** in `LangProvider` via `useSyncExternalStore` (no more text content mismatch).
- Driver tracking — migrations v9–v11 included in `TENANT_MIGRATION` (apply via Supabase Dashboard).

### Environment
- `SESSION_ENCRYPTION_KEY`: re-added to Vercel Production with valid 32-byte base64 key.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`: confirmed set.

### Next Steps
1. Apply remaining driver tracking migrations (v9–v11) if needed.
2. Fix React hydration error #418.
<!-- END:session-2025-06-18 -->

<!-- BEGIN:session-2025-06-19 -->
## Session Progress (Jun 19) — Code Audit Fixes

### Goal
Address all issues from the code audit report (`75/100`): secure `/api/run-sql`, fix hydration error #418, update docs, clean test files, apply tenant migrations.

### Done
1. **`/api/run-sql` secured** — Now accepts `?secret=CRON_SECRET` in production. Falls back to admin/owner session check for dev. Rate-limited (10 req/min). Blocked entirely without valid secret in prod.
2. **Hydration error #418 fixed** — `LangProvider` migrated to `useSyncExternalStore` from `useState`+`useEffect`. Server-rendered value matches initial render; client subscribes to cookie changes without hydration mismatch.
3. **Test files cleaned** — 8 `test-*.js` files moved from project root to `scripts/`.
4. **AGENTS.md rate-limit doc corrected** — Now accurately describes "Upstash Redis (primary) + Supabase `rate_limits` table (fallback)" instead of "in-memory sliding window".
5. **Tenant migration SQL file** — `scripts/apply-tenant-migration.sql` contains the full combined SQL (v3–v11) ready to paste in Supabase Dashboard.
6. **All 139 tests passing**, TypeScript compiles with zero errors.
7. **`EarningsOverview` added to developer admin panel** — Now shows platform earnings in `[restaurant_slug]/admin/page.tsx` when logged in as `owner` role (conditionally rendered via `userRole` state). Pushed to main.

### To apply tenant migration
Open `https://supabase.com/dashboard/project/zordvqqjnlmxgtbkrspp` → SQL Editor → paste contents of `scripts/apply-tenant-migration.sql` → Run.
<!-- END:session-2025-06-19 -->
