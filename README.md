# Burger House — Restaurant Management System

An integrated restaurant management platform with a **Point of Sale (POS)**, **Kitchen Display System (KDS)**, **Customer Menu & Ordering**, and **Admin Dashboard** — all in one Next.js application.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router) + Turbopack |
| **UI** | React 19, TypeScript 6, Tailwind CSS 4 |
| **Backend** | Supabase (PostgreSQL + Auth + Realtime) |
| **Charts** | Recharts |
| **Icons** | Lucide React |

## Features

### 🏪 POS Terminal (`/pos`)
- Create dine-in / takeaway orders
- Item size & sauce selection
- Cash payment with change calculator and numeral keypad
- Receipt preview (browser print)
- Order status lifecycle: Pending → Preparing → Ready → Completed
- Real-time Supabase sync

### 👨‍🍳 Kitchen Display (`/kitchen`)
- Live order feed via Supabase Realtime
- Audio notification on new orders (Web Audio API)
- Pending / Preparing sections
- Time since order placed

### 🍔 Customer Menu (`/menu`)
- Product grid with category filters
- Size & sauce customization per item
- Persistent cart (localStorage via React Context)
- Checkout with order number confirmation
- Real-time order tracking at `/order/[id]`
- Per-item star rating after delivery

### 📊 Admin Dashboard (`/admin`)
- Revenue chart (7d / 30d / 6m / 12m)
- Top 5 selling products
- Peak hours chart
- Customer reviews feed
- Product availability manager

### 🔐 Authentication
- **Supabase Auth** with email/password (username-based via `{username}@burgerhouse.app`)
- Three roles: `admin`, `cashier`, `chef`
- Middleware route protection (`proxy.ts`) — enforces role-based access
- Client-side `AuthGuard` fallback on protected layouts

## Getting Started

### 1. Prerequisites

- Node.js 20+
- A Supabase project (free tier works)

### 2. Environment Variables

Copy `.env.local` (already present) and ensure it contains:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # needed for /api/auth/setup
```

### 3. Database Setup

1. Open your Supabase Dashboard → **SQL Editor**
2. Paste and run the contents of `data/migration.sql`
3. Go to **Database → Replication** and enable Realtime on the `orders` table (INSERT / UPDATE / DELETE)

### 4. Install & Run

```bash
npm install
npm run dev
```

### 5. Create Seed Users (one-time)

```bash
curl -X POST http://localhost:3000/api/auth/setup
```

This creates three accounts:

| Username | Password | Role |
|----------|----------|------|
| `admin` | `123` | Admin |
| `cashier` | `123` | Cashier |
| `chef` | `123` | Chef |

### 6. Log In

Open `http://localhost:3000/login`, select your role tab, and enter the credentials above.

## Project Structure

```
├── proxy.ts                 # Auth middleware
├── app/                     # Pages + API routes
├── components/              # React components
│   ├── pos/                 # POS terminal components
│   ├── admin/               # Admin dashboard components
│   └── icons/               # SVG icons
├── context/                 # React context providers
├── lib/                     # Utilities, types, supabase clients
├── data/                    # Database migration
└── public/                  # Static assets
```

See `PROJECT_MAP.md` for the full architecture breakdown.
