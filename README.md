# Simploo — Multi-Tenant Restaurant Management Platform

An integrated restaurant management platform with **POS**, **KDS**, **Customer Menu & Ordering**, **Delivery Tracking**, **WhatsApp notifications**, and **Admin Dashboard** — all in a single Next.js application.

Built as a **multi-tenant SaaS**: each restaurant gets its own Supabase project (or shares a project with row-level isolation).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router) + Turbopack |
| **UI** | React 19, TypeScript 6, Tailwind CSS 4 |
| **Backend** | Supabase (PostgreSQL + Auth + Realtime) |
| **Maps** | Leaflet (driver tracking, customer order tracking) |
| **Charts** | Recharts |
| **Icons** | Lucide React |
| **WhatsApp** | Evolution API (self-hosted WhatsApp Business proxy) |
| **Migrations** | Per-tenant SQL via Supabase Dashboard or `exec_sql` RPC |

## Architecture

### Multi-Tenant
- **Master DB** — `tenants` table: slug, supabase_url, supabase_anon_key, drivers, plan_type, etc.
- **Per-tenant DB** — Each tenant has its own Supabase project (or schema-isolated tables in a shared project). Business tables: `produits`, `categories`, `orders`, `order_items`, `ratings`, `delivery_men`. Audit trail: `audit_events` (immutable, tamper-evident, v2).
- **Session** — Cookie stores `{email, role, slug}` only (no DB credentials). Server-side lookup resolves tenant config.
- **Routing** — `[restaurant_slug]` param drives all tenant-scoped pages and API routes.

### Subscription Tiers
| Tier | Delivery | Live Tracking | Ratings | Max Branches |
|------|----------|--------------|---------|-------------|
| Starter | ❌ | ❌ | ✅ | 1 |
| Pro | ✅ | ❌ | ✅ | 1 |
| Elite | ✅ | ✅ | ✅ | 3 |

## Features

### 🏪 POS Terminal (`/[slug]/pos`)
- Dine-in / takeaway / delivery orders
- Item size & sauce selection
- Cash payment with change calculator (numeral keypad)
- Receipt preview & browser print
- Order status lifecycle: Pending → Preparing → Ready → Out for Delivery → Completed
- Staff/cashier switching with active staff indicator
- Cashier self-service password change (dropdown menu)

### 👨‍🍳 Kitchen Display (`/[slug]/kitchen`)
- Live order feed via Supabase Realtime
- Audio notification on new orders (Web Audio API)
- Pending / Preparing sections
- Time-since-order tracking

### 🍔 Customer Menu (`/[slug]/menu`)
- Product grid with category filters
- Size & sauce customization
- Persistent cart (localStorage via React Context)
- Order type selection: dine-in / takeaway / delivery
- Table number from URL param (`?table=N`) for QR-scanned customers
- Checkout with order number confirmation
- Real-time order tracking at `/[slug]/order/[id]`
- Live driver map (Elite plan)
- Per-item star rating after delivery

### 📊 Admin Dashboard (`/[slug]/admin`)
- Revenue chart (7d / 30d / 6m / 12m)
- Top 5 selling products
- Peak hours chart
- Customer reviews feed
- Product / category CRUD
- Order management (list, detail, status updates)
- Restaurant settings (name, logo)
- Driver management (add/remove/toggle)
- Cashier management (add/remove)
- Table QR code generator (print QR codes with table number)
- Audit log viewer (table-filter, operation-filter, detail expand)

### 🚚 Delivery Management
- Delivery men CRUD (name, WhatsApp number, busy status)
- Order assignment → WhatsApp notification via Evolution API
- Driver token-based auth (secret link per driver)
- Driver GPS location updates (PATCH `/api/driver/[token]/location`)
- Staff-side driver map with live GPS (Leaflet)
- Customer-side order tracking with live driver map + ETA
- WhatsApp webhook for "collected" confirmation

### 👑 Root Admin (`/admin`)
- All tenants list (status, plan, URL)
- Plan management (assign Starter/Pro/Elite per tenant)
- Root login at `/login` (Owner tab)
- Cross-tenant stats (`/api/admin/stats?mode=root`)

### 🔐 Authentication
- Supabase Auth with email/password (username-based: `{username}@{slug}.app`)
- Roles: `owner`, `admin`, `cashier`, `chef`
- Proxy-based route protection (`proxy.ts` enforces role-based access)
- Client-side `AuthGuard` fallback on protected layouts
- Rate limiting: 10 req/min for ratings, 20 req/min for orders, etc.

### 📋 Audit Log
- Automatic INSERT/UPDATE/DELETE logging for products, categories, orders
- Stores to `audit_log` table (auto-created via RPC if missing)
- In-memory fallback when DB table doesn't exist
- Viewable in admin dashboard with filters

## Getting Started

### 1. Prerequisites
- Node.js 20+
- A Supabase project (for master DB) + per-tenant Supabase project(s)

### 2. Environment Variables
Copy `.env.local` and ensure it contains:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Master project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Master project anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Master project service role key |
| `SESSION_ENCRYPTION_KEY` | 32-byte base64-encoded key for session cookie encryption |
| `CRON_SECRET` | Secret for `/api/cron/cleanup` endpoint |
| `EVOLUTION_API_URL` | WhatsApp Evolution API base URL |
| `EVOLUTION_API_KEY` | WhatsApp Evolution API key |

### 3. Database Setup
1. **Master project**: Run `supabase/migrations/00001_master_schema.sql` in the master Supabase Dashboard.
2. **Per tenant**: Run `supabase/migrations/00002_tenant_schema.sql` in each tenant's Supabase Dashboard.
3. **Optional RLS hardening**: Run `supabase/migrations/00004_tenant_scoped_rls.sql` to replace permissive policies with authenticated-only access.
4. Enable Realtime on `orders` table in each tenant's Supabase Dashboard → Database → Replication.

### 4. Install & Run
```bash
npm install
npm run dev
```

### 5. Create Root Admin
```bash
curl -X POST http://localhost:3000/api/auth/setup-root \
  -H "Content-Type: application/json" \
  -d '{"password":"RootAdmin@123"}'
```
Default: `root@root.app` / `RootAdmin@123`

### 6. Register a Tenant
```bash
curl -X POST http://localhost:3000/api/admin/tenants \
  -H "Content-Type: application/json" \
  -d '{"name":"Burger House","slug":"burger-house","supabase_url":"https://xxx.supabase.co","supabase_anon_key":"<key>"}'
```

### 7. Create Seed Users
```bash
curl -X POST http://localhost:3000/api/auth/setup \
  -H "Content-Type: application/json" \
  -d '{"slug":"burger-house","passwords":{"admin":"Admin@123","cashier":"Cash12345","chef":"Chef@1234"}}'
```

### 8. Log In
Open `http://localhost:3000/login`, select your role tab, and enter credentials.

## Project Structure
```
├── proxy.ts                    # Auth middleware (route protection)
├── app/
│   ├── [restaurant_slug]/      # Tenant-scoped pages & API
│   │   ├── admin/              # Admin dashboard
│   │   ├── kitchen/            # Kitchen Display System (KDS)
│   │   ├── menu/               # Customer menu & ordering
│   │   ├── order/[id]/         # Public order tracking
│   │   └── pos/                # POS terminal
│   ├── admin/                  # Root admin (cross-tenant)
│   ├── delivery/manage/[id]/   # Driver delivery management
│   ├── login/                  # Login page
│   └── api/                    # API routes (auth, products, orders, categories, ratings, admin, tenant, qr, upload, cron, driver)
├── components/
│   ├── pos/                    # POS components
│   ├── admin/                  # Admin components
│   ├── restoos/                # Landing page components
│   └── ui/                     # shadcn/ui primitives
├── lib/                        # Utilities, types, supabase clients, translations
├── supabase/migrations/        # Consolidated, versioned SQL migrations
└── data/                       # Seed data & legacy files
```

## Migrations

Consolidated in `supabase/migrations/` (numbered, ordered):

| File | Target | Purpose |
|------|--------|---------|
| `00001_master_schema.sql` | Master DB | Master project columns, cron support |
| `00002_tenant_schema.sql` | Per tenant | Full tenant schema (orders, produits, ratings, categories, v_products_flat, storage, audit_log, delivery_men, daily_order_counters) |
| `00003_remove_exec_sql.sql` | Both | Remove `exec_sql` SECURITY DEFINER function |
| `00004_tenant_scoped_rls.sql` | Per tenant | ⚠ DO NOT RUN — superseded by 00005 (see file header) |
| `00005_lockdown_rls.sql` | Per tenant | **Required.** Lockdown RLS: service_role-only writes; anon SELECT only on public menu tables; anon INSERT on ratings |

**Apply order**: 00001 → 00002 → 00003 → 00005 (skip 00004).

**Important**: Skipping 00005 leaves customer PII and pricing publicly writable via the Supabase REST API. Anyone with the anon key (visible in the browser) can read orders, audit_log, and delete data directly.

**Apply via**: `supabase db push` (CLI) or paste into Supabase Dashboard SQL Editor. Never via HTTP.

> **Why no authenticated policies?** The app never attaches a Supabase Auth JWT to server queries. Every `supabaseForRequest()` call uses the anon key, so `auth.role()` always returns `anon`. Authenticated-only policies (`auth.role() = 'authenticated'`) would never match and would break all server queries. Instead, all writes use the service_role key (`supabaseForRequestAdmin()`), which bypasses RLS entirely. Only public menu reads use the anon key.

## Security

### CSRF Protection
CSRF protection relies on the `session` cookie's `sameSite: "lax"` attribute (set in login routes). The browser will not include the session cookie in cross-origin POST requests that don't originate from top-level navigation. All state-changing endpoints use POST/PATCH/DELETE (no GET mutations), and rate limiting further mitigates automated CSRF attempts. If SameSite is ever relaxed, add explicit CSRF tokens via the double-submit cookie pattern.

### RLS (Row-Level Security)
The app uses **service_role-only writes**: all API routes authenticated by session use `supabaseForRequestAdmin()` (service_role key, bypassing RLS). Only public menu reads (products, categories) use the anon key with permissive SELECT policies. No anon/authenticated policies exist on orders, order_items, audit_log, or other sensitive tables. See `supabase/migrations/00005_lockdown_rls.sql` for details.

### Audit Trail (`audit_events`)
The `audit_events` table (migration 00006) provides an enterprise-grade, tamper-evident audit trail:
- **Hash chain**: each row stores `prev_hash` and `row_hash` (SHA-256), computed by a `BEFORE INSERT` trigger. Any historical tampering breaks the chain and is detectable by `scripts/verify-audit-chain.ts`.
- **Append-only**: UPDATE/DELETE triggers block all mutations, even for service_role.
- **Tenant isolation**: `tenant_slug TEXT NOT NULL` column separates events from different tenants sharing the same physical database.
- **Dead-letter**: `audit_write_failures` table records any failed audit writes for replay/alerting.
- **Access control**: empty RLS policy set (RLS enabled, no policies = default DENY for anon/authenticated).
- **Meta-audit**: every successful GET to `/api/admin/audit-log` emits an `audit_log.viewed` event.

### Retention Policy
Audit events are retained **hot for 12 months** in `audit_events`. Older rows must be archived to cold storage (Supabase Storage or external bucket) via a scheduled job.

TODO: Implement an archival job (`app/api/cron/audit-archive`) that:
1. Copies rows older than 12 months to an archive table or JSON export in Supabase Storage.
2. Deletes archived rows from `audit_events` (using service_role, which bypasses RLS but NOT the append-only trigger — deletion requires a direct `TRUNCATE` or a dedicated SECURITY DEFINER function).
3. Is triggered via `GET /api/cron/audit-archive?secret=<CRON_SECRET>`.
4. Logs its own archive operation as an audit event before truncation.

## Tests
```bash
npm test          # 139+ tests (vitest)
npm run typecheck # tsc --noEmit
npm run lint      # eslint
```
