# Simploo SaaS — Architectural Map

## Overview

Multi-tenant restaurant management system (Next.js 16, React 19, Supabase, Tailwind CSS 4).

```ascii
┌─────────────────────────────────────────────────────────────┐
│  Client Layer                                               │
│  app/ (App Router) · app/[restaurant_slug]/ (Tenant Scope)  │
├─────────────────────────────────────────────────────────────┤
│  API Layer                                                  │
│  app/api/* (38 route files) · Middleware (proxy.ts)         │
├─────────────────────────────────────────────────────────────┤
│  Service Layer                                              │
│  lib/ · context/ · components/                              │
├─────────────────────────────────────────────────────────────┤
│  Data Layer                                                 │
│  Supabase (Master · Tenant) · In-memory Fallbacks           │
└─────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
app/
├── page.tsx                    # Landing (RestoOS marketing)
├── layout.tsx                  # Root layout (fonts, providers)
├── admin/                      # Root owner dashboard
│   ├── layout.tsx              # Admin shell (header + sidebar)
│   └── page.tsx                # Plan manager / tenant list
├── setup/                      # Root admin creation
│   └── page.tsx
├── login/                      # Global login
│   ├── page.tsx                # Server component (SSR)
│   └── login-form.tsx          # Client form
├── menu/                       # Public customer menu
│   └── page.tsx
├── pos/                        # Root POS (standalone)
│   └── page.tsx
├── kitchen/                    # Root KDS (standalone)
│   └── page.tsx
├── order/[id]/                 # Customer order tracking
│   └── page.tsx
├── delivery/manage/[order_id]/ # Delivery management
│   └── page.tsx
├── api/                        # API routes (38 total)
│   ├── auth/                   # login, logout, setup-root, extend-session
│   ├── orders/                 # GET, POST, [id] (GET, PATCH), clear
│   ├── admin/                  # stats, audit-log, bulk-update, clear-data
│   ├── products/               # CRUD
│   ├── categories/             # CRUD
│   ├── ratings/                # POST
│   ├── drivers/                # CRUD
│   ├── delivery/               # manage/[id], collect
│   ├── upload/                 # Image upload
│   ├── cron/cleanup/           # Daily cleanup job
│   └── ...                     # me, contact, receipt, etc.
├── [restaurant_slug]/          # Tenant-scoped routes
│   ├── login/                  # Tenant login
│   ├── admin/                  # Tenant dashboard
│   ├── pos/                    # Tenant POS
│   ├── kitchen/                # Tenant KDS
│   ├── menu/                   # Tenant menu
│   ├── order/[id]/             # Tenant order tracking
│   └── driver/[id]/            # Driver delivery page
├── not-found.tsx               # 404 page
├── error.tsx                   # Error boundary (client)
├── global-error.tsx            # Root error boundary
└── loading.tsx                 # Root loading state

components/
├── ui/                         # shadcn-style primitives (22 files)
├── admin/                      # Admin components (15 files)
│   ├── plan-manager.tsx        # Tenant CRUD + plan assignment
│   ├── stat-card.tsx           # Metric display card
│   ├── sales-chart.tsx         # Revenue chart (Recharts)
│   ├── peak-hours-chart.tsx    # Order distribution chart
│   ├── top-products.tsx        # Best-sellers list
│   ├── reviews-feed.tsx        # Customer ratings
│   ├── audit-log.tsx           # Security audit viewer
│   ├── product-manager.tsx     # Menu CRUD
│   ├── bulk-operations.tsx     # Batch product updates
│   ├── orders-list.tsx         # Order table
│   ├── order-detail-sheet.tsx  # Order details drawer
│   ├── clear-data.tsx          # Data reset
│   ├── confirm-delete-modal.tsx
│   └── restaurant-settings.tsx
├── pos/                        # POS components (10 files)
├── resto/                      # Marketing components (14 files)
└── [shared]/                   # Shared components

lib/
├── supabase-server.ts          # Server Supabase clients (3 patterns)
├── tenant.ts                   # Tenant resolution + session parsing
├── auth-server.ts              # Route role guard
├── env.ts                      # Runtime env validation
├── session-crypto.ts           # AES session encryption
├── logger.ts                   # Structured logging
├── rate-limit.ts               # Sliding window rate limiter
├── audit.ts                    # Audit trail (DB + in-memory fallback)
├── use-realtime.ts             # Reusable real-time hook
├── translations.ts             # i18n (ar/en/fr, 450+ keys)
├── types.ts                    # MenuProduct, Order, CartItem, etc.
├── constants.ts                # DB status mapping, defaults
├── validations.ts              # Phone regex, etc.
└── route-roles.ts              # Role-based access definitions

supabase/migrations/             # Versioned SQL migrations (consolidated)
├── 00001_master_schema.sql      # Master project columns, cron support
├── 00002_tenant_schema.sql      # Full tenant schema
├── 00003_remove_exec_sql.sql    # Remove exec_sql backdoor
└── 00004_tenant_scoped_rls.sql  # Authenticated-only RLS

data/                           # Seed data & legacy tooling
├── migration-apply.ts          # Multi-tenant migration runner (legacy)
└── subscription-tiers.sql      # Plan tier definitions
```

---

## Multi-Tenancy Architecture

```
                          ┌──────────────┐
                          │  Master DB    │
                          │  (icefntw..)  │
                          │  tenants[]    │
                          └──────┬───────┘
                                 │ getTenantConfig(slug)
                                 ▼
                    ┌────────────────────────┐
                    │  Tenant Router          │
                    │  - Resolves slug        │
                    │  - Returns config       │
                    │  - 10s TTL cache        │
                    └────────┬───────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
     ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
     │ Tenant DB   │ │ Tenant DB   │ │ Tenant DB   │
     │ (same proj) │ │ (separate)  │ │ (separate)  │
     │ burger-house│ │ pizza-place │ │ sushi-bar   │
     └─────────────┘ └─────────────┘ └─────────────┘
```

- **Session**: Cookie stores `{email, role, slug}` (encrypted AES, no DB creds)
- **Client**: `browserSupabase()` reads `window.__TENANT_CONFIG__`
- **Server**: `supabaseForRequest(req)` calls `getTenantConfig(slug)` (async, cached)
- **Fallback chain**: Primary column → optional column → self-healing default

---

## Data Pipeline Contracts

### Order Lifecycle

```
POST /api/orders  ──►  Validate items + prices
        │
        ▼
   Compute order_number (RPC → SQL → timestamp fallback)
        │
        ▼
   Insert orders row (column-aware retry loop)
        │
        ▼
   Verify (re-query 3× with backoff)
        │
        ▼
   Insert order_items
        │
        ▼
   Return { id, orderNumber }
```

### Status Flow

```
pending ──► preparing ──► ready ──► out_for_delivery ──► delivered
  │                              │
  └── cancelled                  └── completed
```

### Real-Time Subscriptions

```
POS (create order) ──► supabase.channel("orders")
        │
        ├──► Kitchen (new order appears)
        ├──► Admin (stats refresh)
        └──► Customer (tracking update)
```

---

## Security Layers

| Layer | Mechanism |
|-------|-----------|
| Transport | CSP headers, HTTPS enforced |
| Auth | Session cookie (AES-encrypted), role guard middleware |
| API | Rate limiting (20/10 req/min), CSRF exempt for /api/* |
| Data | Row-Level Security (RLS) per tenant |
| Isolation | Separate Supabase keys per tenant project |

---

## Testing Strategy

```
__tests__/        Vitest unit tests (12 files, component + lib)
tests/            Playwright E2E (admin, cashier, chef, edge-cases)
tests/smoke.spec  Homepage load verification
```

---

## Environment Variables

| Variable | Required |
|----------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes |
| `SESSION_ENCRYPTION_KEY` | Yes |
| `CRON_SECRET` | Yes |
| `DEV_ROOT_PASSWORD` | Dev only |
| `DEV_PASSWORDS` | Dev only |
