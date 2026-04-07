# Agora Developer Portal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a developer portal where devs sign up via GitHub, manage API keys, view usage, and upgrade to paid plans via Stripe.

**Architecture:** Next.js 15 app at `packages/portal/`. Auth via Auth.js v5 (GitHub OAuth). Billing via Stripe Checkout + webhooks. Shares `@agora/db` for database. New tables: `users`, `subscriptions`, `usage_logs`. Modified: `api_keys` (add userId, lastUsedAt, revokedAt).

**Tech Stack:** Next.js 15, Auth.js v5, Stripe, Drizzle ORM, Tailwind CSS (pre-built), `@agora/db`

---

## File Structure

```
packages/portal/
├── package.json
├── next.config.ts
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── auth.ts                          # Auth.js config (GitHub provider)
├── proxy.ts                         # Next.js 16 route protection (was middleware.ts)
├── app/
│   ├── layout.tsx                   # Root layout, dark theme
│   ├── globals.css                  # Tailwind source
│   ├── tailwind.css                 # Pre-built Tailwind output
│   ├── login/
│   │   └── page.tsx                 # Login page with GitHub button
│   ├── dashboard/
│   │   ├── layout.tsx               # Dashboard layout (sidebar/nav)
│   │   ├── page.tsx                 # Main dashboard (stats, usage chart)
│   │   ├── keys/
│   │   │   └── page.tsx             # API key management
│   │   ├── billing/
│   │   │   └── page.tsx             # Billing & plan management
│   │   └── settings/
│   │       └── page.tsx             # Account settings
│   ├── api/
│   │   ├── auth/[...nextauth]/
│   │   │   └── route.ts             # Auth.js route handlers
│   │   ├── keys/
│   │   │   └── route.ts             # API key CRUD (POST create, DELETE revoke)
│   │   ├── usage/
│   │   │   └── route.ts             # Usage stats API
│   │   └── stripe/
│   │       ├── checkout/
│   │       │   └── route.ts         # Create Stripe Checkout session
│   │       └── webhook/
│   │           └── route.ts         # Stripe webhook handler
│   └── components/
│       ├── nav.tsx                   # Dashboard navigation
│       ├── usage-chart.tsx           # SVG bar chart
│       └── plan-badge.tsx            # Tier badge component
├── lib/
│   ├── stripe.ts                    # Stripe client
│   └── session.ts                   # Auth helper (get current user)
└── public/
    └── favicon.ico

packages/db/src/
├── schema.ts                        # MODIFIED: add users, subscriptions, usage_logs tables; modify api_keys
└── index.ts                         # MODIFIED: export new tables
```

---

## Task 1: Database Schema Updates

**Files:**
- Modify: `packages/db/src/schema.ts`

- [ ] **Step 1: Add new tables and modify api_keys in schema.ts**

Add these after the existing `apiKeys` table definition:

```typescript
// Add to imports at top of file:
// import { boolean } from "drizzle-orm/pg-core";  (add 'boolean' if not present)

export const tierEnum = pgEnum("tier", ["free", "pro", "enterprise"]);

export const users = pgTable("users", {
  id: text("id").primaryKey(), // cuid
  githubId: text("github_id").notNull().unique(),
  githubUsername: text("github_username").notNull(),
  name: text("name").notNull().default(""),
  email: text("email").notNull().default(""),
  avatarUrl: text("avatar_url").notNull().default(""),
  stripeCustomerId: text("stripe_customer_id"),
  tier: tierEnum("tier").notNull().default("free"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const subscriptions = pgTable("subscriptions", {
  id: text("id").primaryKey(), // cuid
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  stripeSubscriptionId: text("stripe_subscription_id").notNull().unique(),
  stripePriceId: text("stripe_price_id").notNull(),
  tier: tierEnum("subscription_tier").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const usageLogs = pgTable(
  "usage_logs",
  {
    id: serial("id").primaryKey(),
    apiKeyId: varchar("api_key_id", { length: 64 })
      .notNull()
      .references(() => apiKeys.key, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    statusCode: integer("status_code").notNull(),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_usage_logs_key").on(table.apiKeyId),
    index("idx_usage_logs_timestamp").on(table.timestamp),
  ]
);
```

Also modify the existing `apiKeys` table — replace it entirely:

```typescript
export const apiKeys = pgTable(
  "api_keys",
  {
    key: varchar("key", { length: 64 }).primaryKey(),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    tier: varchar("tier", { length: 20 }).notNull().default("free"),
    requestCount: integer("request_count").notNull().default(0),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_api_keys_user").on(table.userId),
  ]
);
```

- [ ] **Step 2: Generate and run migration**

```bash
cd packages/db
DATABASE_URL="$(grep '^DATABASE_URL=' ../../.env | sed 's/^DATABASE_URL=//')" npx drizzle-kit generate
DATABASE_URL="$(grep '^DATABASE_URL=' ../../.env | sed 's/^DATABASE_URL=//')" npx drizzle-kit migrate
```

- [ ] **Step 3: Rebuild the db package**

```bash
cd ../..
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add packages/db/
git commit -m "feat(db): add users, subscriptions, usage_logs tables; update api_keys with userId"
```

---

## Task 2: Portal Project Scaffold

**Files:**
- Create: `packages/portal/package.json`
- Create: `packages/portal/next.config.ts`
- Create: `packages/portal/tailwind.config.js`
- Create: `packages/portal/postcss.config.js`
- Create: `packages/portal/tsconfig.json`
- Create: `packages/portal/app/globals.css`
- Create: `packages/portal/app/tailwind.css` (pre-built)
- Create: `packages/portal/app/layout.tsx`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@agora/portal",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "npx tailwindcss -i app/globals.css -o app/tailwind.css --watch & next dev --port 3002",
    "build": "npx tailwindcss -i app/globals.css -o app/tailwind.css --minify && next build",
    "start": "next start"
  },
  "dependencies": {
    "@agora/db": "*",
    "next": "^15",
    "next-auth": "5.0.0-beta.25",
    "react": "^19",
    "react-dom": "^19",
    "stripe": "^17",
    "drizzle-orm": "^0.39"
  },
  "devDependencies": {
    "@types/node": "^22",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "typescript": "^5.7",
    "tailwindcss": "^3",
    "postcss": "^8",
    "autoprefixer": "^10"
  }
}
```

- [ ] **Step 2: Create configs (same pattern as demo app)**

`next.config.ts`:
```typescript
import type { NextConfig } from "next";
const nextConfig: NextConfig = {};
export default nextConfig;
```

`tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: "#18181b",
        border: "#27272a",
        accent: "#a78bfa",
        "accent-dim": "#1e1b2e",
        "accent-border": "#2d2640",
        price: "#22c55e",
        secondary: "#a1a1aa",
      },
    },
  },
  plugins: [],
};
```

`postcss.config.js`:
```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create globals.css and layout.tsx**

`app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

`app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import "./tailwind.css";

export const metadata: Metadata = {
  title: "Agora Developer Portal",
  description: "Manage your Agora API keys, view usage, and manage billing.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#0a0a0a] text-[#e5e5e5] font-sans antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Install deps, build Tailwind, verify**

```bash
cd /Users/matthewgoralczyk/Desktop/AI\ infrastructure/agora
npm install
cd packages/portal
npx tailwindcss -i app/globals.css -o app/tailwind.css --minify
npx next build
```

- [ ] **Step 5: Commit**

```bash
cd ../..
git add packages/portal/
git commit -m "feat(portal): scaffold Next.js project with Tailwind dark theme"
```

---

## Task 3: Auth.js Setup (GitHub OAuth)

**Files:**
- Create: `packages/portal/auth.ts`
- Create: `packages/portal/proxy.ts`
- Create: `packages/portal/lib/session.ts`
- Create: `packages/portal/app/api/auth/[...nextauth]/route.ts`
- Create: `packages/portal/app/login/page.tsx`

- [ ] **Step 1: Create the Auth.js config**

```typescript
// packages/portal/auth.ts
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { db, users } from "@agora/db";
import { eq } from "drizzle-orm";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ profile }) {
      if (!profile?.id) return false;

      const githubId = String(profile.id);
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.githubId, githubId))
        .limit(1);

      if (existing.length === 0) {
        const id = crypto.randomUUID();
        await db.insert(users).values({
          id,
          githubId,
          githubUsername: (profile as any).login ?? "",
          name: profile.name ?? "",
          email: profile.email ?? "",
          avatarUrl: (profile as any).avatar_url ?? "",
        });
      }

      return true;
    },
    async jwt({ token, profile }) {
      if (profile?.id) {
        const githubId = String(profile.id);
        const user = await db
          .select()
          .from(users)
          .where(eq(users.githubId, githubId))
          .limit(1);
        if (user[0]) {
          token.userId = user[0].id;
          token.tier = user[0].tier;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId) {
        (session as any).userId = token.userId;
        (session as any).tier = token.tier;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
```

- [ ] **Step 2: Create route protection proxy**

```typescript
// packages/portal/proxy.ts
export { auth as proxy } from "./auth";

export const config = {
  matcher: ["/dashboard/:path*"],
};
```

Note: Next.js 16 renamed `middleware.ts` to `proxy.ts`. If using Next.js 15, name this file `middleware.ts` and export as `middleware` instead of `proxy`.

- [ ] **Step 3: Create session helper**

```typescript
// packages/portal/lib/session.ts
import { auth } from "@/auth";
import { db, users } from "@agora/db";
import { eq } from "drizzle-orm";

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.userId) return null;

  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, (session as any).userId))
    .limit(1);

  return result[0] ?? null;
}
```

- [ ] **Step 4: Create Auth.js route handler**

```typescript
// packages/portal/app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
```

- [ ] **Step 5: Create login page**

```tsx
// packages/portal/app/login/page.tsx
import { signIn } from "@/auth";

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="bg-surface border border-border rounded-xl p-8 max-w-sm w-full text-center">
        <h1 className="text-2xl font-bold mb-2 bg-gradient-to-r from-white via-accent to-indigo-500 bg-clip-text text-transparent">
          Agora
        </h1>
        <p className="text-secondary text-sm mb-6">
          Get your API key and start building with Agora
        </p>
        <form
          action={async () => {
            "use server";
            await signIn("github", { redirectTo: "/dashboard" });
          }}
        >
          <button
            type="submit"
            className="w-full bg-[#e5e5e5] hover:bg-white text-[#0a0a0a] font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            Sign in with GitHub
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Rebuild Tailwind and verify build**

```bash
cd packages/portal
npx tailwindcss -i app/globals.css -o app/tailwind.css --minify
npx next build
```

- [ ] **Step 7: Commit**

```bash
cd ../..
git add packages/portal/
git commit -m "feat(portal): add GitHub OAuth with Auth.js, login page, session helper"
```

---

## Task 4: Dashboard Layout & Navigation

**Files:**
- Create: `packages/portal/app/components/nav.tsx`
- Create: `packages/portal/app/components/plan-badge.tsx`
- Create: `packages/portal/app/dashboard/layout.tsx`
- Create: `packages/portal/app/dashboard/page.tsx`

- [ ] **Step 1: Create the plan badge component**

```tsx
// packages/portal/app/components/plan-badge.tsx
function PlanBadge({ tier }: { tier: string }) {
  const colors: Record<string, string> = {
    free: "bg-zinc-800 text-zinc-300 border-zinc-700",
    pro: "bg-accent/20 text-accent border-accent-border",
    enterprise: "bg-amber-900/30 text-amber-400 border-amber-800",
  };

  return (
    <span
      className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${colors[tier] ?? colors.free}`}
    >
      {tier.charAt(0).toUpperCase() + tier.slice(1)}
    </span>
  );
}

export { PlanBadge };
```

- [ ] **Step 2: Create dashboard navigation**

```tsx
// packages/portal/app/components/nav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PlanBadge } from "./plan-badge";

interface NavProps {
  user: {
    name: string;
    avatarUrl: string;
    tier: string;
  };
}

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/keys", label: "API Keys" },
  { href: "/dashboard/billing", label: "Billing" },
  { href: "/dashboard/settings", label: "Settings" },
];

function Nav({ user }: NavProps) {
  const pathname = usePathname();

  return (
    <nav className="w-56 border-r border-border p-4 flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <img
          src={user.avatarUrl}
          alt={user.name}
          className="w-8 h-8 rounded-full"
        />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{user.name}</p>
          <PlanBadge tier={user.tier} />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? "bg-accent/10 text-accent"
                  : "text-secondary hover:text-[#e5e5e5] hover:bg-surface"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="mt-auto">
        <Link
          href="https://github.com/rbtbuilds/agora"
          target="_blank"
          className="text-xs text-secondary hover:text-[#e5e5e5] transition-colors"
        >
          GitHub →
        </Link>
      </div>
    </nav>
  );
}

export { Nav };
```

- [ ] **Step 3: Create dashboard layout**

```tsx
// packages/portal/app/dashboard/layout.tsx
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { Nav } from "../components/nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex h-screen">
      <Nav
        user={{
          name: user.name || user.githubUsername,
          avatarUrl: user.avatarUrl,
          tier: user.tier,
        }}
      />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 4: Create dashboard overview page**

```tsx
// packages/portal/app/dashboard/page.tsx
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { db, apiKeys, usageLogs } from "@agora/db";
import { eq, and, gte, sql, isNull } from "drizzle-orm";
import { PlanBadge } from "../components/plan-badge";
import Link from "next/link";

const TIER_LIMITS: Record<string, number> = {
  free: 100,
  pro: 10000,
  enterprise: 999999,
};

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Get active keys count
  const keys = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.userId, user.id), isNull(apiKeys.revokedAt)));

  // Get today's usage
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const keyIds = keys.map((k) => k.key);
  let todayUsage = 0;
  let monthUsage = 0;

  if (keyIds.length > 0) {
    const todayResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(usageLogs)
      .where(
        and(
          sql`${usageLogs.apiKeyId} = ANY(${keyIds})`,
          gte(usageLogs.timestamp, todayStart)
        )
      );
    todayUsage = Number(todayResult[0]?.count ?? 0);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(usageLogs)
      .where(
        and(
          sql`${usageLogs.apiKeyId} = ANY(${keyIds})`,
          gte(usageLogs.timestamp, monthStart)
        )
      );
    monthUsage = Number(monthResult[0]?.count ?? 0);
  }

  const dailyLimit = TIER_LIMITS[user.tier] ?? 100;

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-secondary text-xs uppercase tracking-wider mb-1">Plan</p>
          <div className="flex items-center gap-2">
            <PlanBadge tier={user.tier} />
            {user.tier === "free" && (
              <Link href="/dashboard/billing" className="text-xs text-accent hover:underline">
                Upgrade
              </Link>
            )}
          </div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-secondary text-xs uppercase tracking-wider mb-1">Today&apos;s Requests</p>
          <p className="text-xl font-semibold">
            {todayUsage.toLocaleString()}{" "}
            <span className="text-secondary text-sm font-normal">/ {dailyLimit.toLocaleString()}</span>
          </p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-secondary text-xs uppercase tracking-wider mb-1">Active Keys</p>
          <p className="text-xl font-semibold">{keys.length}</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-3">
        <Link
          href="/dashboard/keys"
          className="bg-accent hover:bg-[#8b5cf6] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Manage API Keys
        </Link>
        <Link
          href="https://github.com/rbtbuilds/agora#sdk-usage"
          target="_blank"
          className="bg-surface border border-border hover:border-[#3f3f46] text-[#e5e5e5] px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Read Docs →
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Rebuild Tailwind and verify**

```bash
cd packages/portal
npx tailwindcss -i app/globals.css -o app/tailwind.css --minify
npx next build
```

- [ ] **Step 6: Commit**

```bash
cd ../..
git add packages/portal/
git commit -m "feat(portal): add dashboard layout, nav, overview page with stats"
```

---

## Task 5: API Key Management Page

**Files:**
- Create: `packages/portal/app/api/keys/route.ts`
- Create: `packages/portal/app/dashboard/keys/page.tsx`

- [ ] **Step 1: Create API key CRUD route**

```typescript
// packages/portal/app/api/keys/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, apiKeys } from "@agora/db";
import { eq, and, isNull } from "drizzle-orm";
import crypto from "crypto";

function generateApiKey(): string {
  return "ak_" + crypto.randomBytes(24).toString("hex");
}

export async function GET() {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const keys = await db
    .select({
      key: apiKeys.key,
      name: apiKeys.name,
      createdAt: apiKeys.createdAt,
      lastUsedAt: apiKeys.lastUsedAt,
      requestCount: apiKeys.requestCount,
      revokedAt: apiKeys.revokedAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.userId, (session as any).userId));

  return NextResponse.json({ keys });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name } = await req.json();
  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const key = generateApiKey();
  await db.insert(apiKeys).values({
    key,
    userId: (session as any).userId,
    name: name.trim(),
    tier: (session as any).tier ?? "free",
  });

  return NextResponse.json({ key, name: name.trim() });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { key } = await req.json();
  const now = new Date();

  await db
    .update(apiKeys)
    .set({ revokedAt: now })
    .where(
      and(
        eq(apiKeys.key, key),
        eq(apiKeys.userId, (session as any).userId),
        isNull(apiKeys.revokedAt)
      )
    );

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Create the keys management page**

```tsx
// packages/portal/app/dashboard/keys/page.tsx
"use client";

import { useState, useEffect } from "react";

interface ApiKey {
  key: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
  requestCount: number;
  revokedAt: string | null;
}

export default function KeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchKeys();
  }, []);

  async function fetchKeys() {
    const res = await fetch("/api/keys");
    const data = await res.json();
    setKeys(data.keys);
    setLoading(false);
  }

  async function createKey() {
    if (!newKeyName.trim()) return;
    setCreating(true);
    const res = await fetch("/api/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newKeyName }),
    });
    const data = await res.json();
    setNewKey(data.key);
    setNewKeyName("");
    setCreating(false);
    fetchKeys();
  }

  async function revokeKey(key: string) {
    await fetch("/api/keys", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    fetchKeys();
  }

  const activeKeys = keys.filter((k) => !k.revokedAt);
  const revokedKeys = keys.filter((k) => k.revokedAt);

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">API Keys</h1>

      {/* Create new key */}
      <div className="bg-surface border border-border rounded-xl p-4 mb-6">
        <h2 className="text-sm font-medium mb-3">Create New Key</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Key name (e.g., Production, Development)"
            className="flex-1 bg-[#0a0a0a] border border-border rounded-lg px-3 py-2 text-sm placeholder:text-secondary outline-none focus:border-accent"
          />
          <button
            onClick={createKey}
            disabled={creating || !newKeyName.trim()}
            className="bg-accent hover:bg-[#8b5cf6] disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {creating ? "Creating..." : "Create"}
          </button>
        </div>

        {newKey && (
          <div className="mt-3 p-3 bg-green-900/20 border border-green-800 rounded-lg">
            <p className="text-green-400 text-xs font-medium mb-1">
              Key created! Copy it now — you won&apos;t see it again.
            </p>
            <div className="flex items-center gap-2">
              <code className="text-sm text-green-300 bg-green-900/30 px-2 py-1 rounded flex-1 break-all">
                {newKey}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(newKey);
                }}
                className="text-xs text-green-400 hover:text-green-300 px-2 py-1"
              >
                Copy
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Active keys */}
      {loading ? (
        <p className="text-secondary text-sm">Loading keys...</p>
      ) : (
        <>
          <h2 className="text-sm font-medium text-secondary mb-3">
            Active Keys ({activeKeys.length})
          </h2>
          {activeKeys.length === 0 ? (
            <p className="text-secondary text-sm">No active keys. Create one above.</p>
          ) : (
            <div className="space-y-2 mb-6">
              {activeKeys.map((k) => (
                <div
                  key={k.key}
                  className="bg-surface border border-border rounded-xl p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium">{k.name}</p>
                    <p className="text-xs text-secondary mt-0.5">
                      {k.key.slice(0, 12)}...{" · "}
                      {k.requestCount.toLocaleString()} requests{" · "}
                      Created {new Date(k.createdAt).toLocaleDateString()}
                      {k.lastUsedAt && (
                        <> · Last used {new Date(k.lastUsedAt).toLocaleDateString()}</>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => revokeKey(k.key)}
                    className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 border border-red-800 rounded-lg hover:bg-red-900/20 transition-colors"
                  >
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          )}

          {revokedKeys.length > 0 && (
            <>
              <h2 className="text-sm font-medium text-secondary mb-3">
                Revoked Keys ({revokedKeys.length})
              </h2>
              <div className="space-y-2 opacity-50">
                {revokedKeys.map((k) => (
                  <div
                    key={k.key}
                    className="bg-surface border border-border rounded-xl p-4"
                  >
                    <p className="text-sm font-medium line-through">{k.name}</p>
                    <p className="text-xs text-secondary mt-0.5">
                      Revoked {new Date(k.revokedAt!).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Rebuild Tailwind and verify**

```bash
cd packages/portal
npx tailwindcss -i app/globals.css -o app/tailwind.css --minify
npx next build
```

- [ ] **Step 4: Commit**

```bash
cd ../..
git add packages/portal/
git commit -m "feat(portal): add API key management — create, list, copy, revoke"
```

---

## Task 6: Stripe Billing Integration

**Files:**
- Create: `packages/portal/lib/stripe.ts`
- Create: `packages/portal/app/api/stripe/checkout/route.ts`
- Create: `packages/portal/app/api/stripe/webhook/route.ts`
- Create: `packages/portal/app/dashboard/billing/page.tsx`

- [ ] **Step 1: Create Stripe client**

```typescript
// packages/portal/lib/stripe.ts
import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-04-30.basil",
});
```

- [ ] **Step 2: Create checkout session route**

```typescript
// packages/portal/app/api/stripe/checkout/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { stripe } from "@/lib/stripe";
import { db, users } from "@agora/db";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session as any).userId as string;
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user[0]) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Create or reuse Stripe customer
  let customerId = user[0].stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user[0].email || undefined,
      metadata: { userId, githubUsername: user[0].githubUsername },
    });
    customerId = customer.id;
    await db
      .update(users)
      .set({ stripeCustomerId: customerId })
      .where(eq(users.id, userId));
  }

  const origin = req.headers.get("origin") ?? "http://localhost:3002";

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    line_items: [
      {
        price: process.env.STRIPE_PRO_PRICE_ID!,
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: `${origin}/dashboard/billing?success=true`,
    cancel_url: `${origin}/dashboard/billing?canceled=true`,
    metadata: { userId },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
```

- [ ] **Step 3: Create webhook handler**

```typescript
// packages/portal/app/api/stripe/webhook/route.ts
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db, users, subscriptions } from "@agora/db";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const userId = session.metadata?.userId;
      if (!userId || !session.subscription) break;

      const sub = await stripe.subscriptions.retrieve(
        session.subscription as string
      );

      const subId = crypto.randomUUID();
      await db.insert(subscriptions).values({
        id: subId,
        userId,
        stripeSubscriptionId: sub.id,
        stripePriceId: sub.items.data[0].price.id,
        tier: "pro",
        status: "active",
        currentPeriodEnd: new Date(sub.current_period_end * 1000),
      });

      await db
        .update(users)
        .set({ tier: "pro" })
        .where(eq(users.id, userId));

      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object;
      await db
        .update(subscriptions)
        .set({
          status: sub.status,
          currentPeriodEnd: new Date(sub.current_period_end * 1000),
        })
        .where(eq(subscriptions.stripeSubscriptionId, sub.id));
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object;
      await db
        .update(subscriptions)
        .set({ status: "canceled" })
        .where(eq(subscriptions.stripeSubscriptionId, sub.id));

      // Find user and downgrade
      const subRecord = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.stripeSubscriptionId, sub.id))
        .limit(1);

      if (subRecord[0]) {
        await db
          .update(users)
          .set({ tier: "free" })
          .where(eq(users.id, subRecord[0].userId));
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
```

- [ ] **Step 4: Create billing page**

```tsx
// packages/portal/app/dashboard/billing/page.tsx
"use client";

import { useState } from "react";

const PLANS = [
  {
    name: "Free",
    tier: "free",
    price: "$0",
    period: "forever",
    features: ["100 requests/day", "1 API key", "Keyword search", "Community support"],
  },
  {
    name: "Pro",
    tier: "pro",
    price: "$29",
    period: "/month",
    features: ["10,000 requests/day", "Unlimited API keys", "Semantic search", "Priority support"],
    highlight: true,
  },
  {
    name: "Enterprise",
    tier: "enterprise",
    price: "Custom",
    period: "",
    features: ["Unlimited requests", "Unlimited keys", "Dedicated support", "Custom SLA", "On-premise option"],
  },
];

export default function BillingPage() {
  const [loading, setLoading] = useState(false);

  async function handleUpgrade() {
    setLoading(true);
    const res = await fetch("/api/stripe/checkout", { method: "POST" });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    }
    setLoading(false);
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Billing</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map((plan) => (
          <div
            key={plan.tier}
            className={`bg-surface border rounded-xl p-5 flex flex-col ${
              plan.highlight
                ? "border-accent ring-1 ring-accent"
                : "border-border"
            }`}
          >
            <h3 className="text-lg font-semibold mb-1">{plan.name}</h3>
            <div className="mb-4">
              <span className="text-2xl font-bold">{plan.price}</span>
              <span className="text-secondary text-sm">{plan.period}</span>
            </div>
            <ul className="space-y-2 mb-6 flex-1">
              {plan.features.map((f) => (
                <li key={f} className="text-sm text-secondary flex items-center gap-2">
                  <span className="text-price">✓</span> {f}
                </li>
              ))}
            </ul>
            {plan.tier === "pro" && (
              <button
                onClick={handleUpgrade}
                disabled={loading}
                className="w-full bg-accent hover:bg-[#8b5cf6] disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {loading ? "Redirecting..." : "Upgrade to Pro"}
              </button>
            )}
            {plan.tier === "enterprise" && (
              <a
                href="mailto:ceo@bentolabs.co.uk?subject=Agora Enterprise"
                className="w-full block text-center bg-surface border border-border hover:border-[#3f3f46] text-[#e5e5e5] py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Contact Us
              </a>
            )}
            {plan.tier === "free" && (
              <div className="w-full text-center text-secondary text-sm py-2">
                Current plan
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Rebuild Tailwind and verify**

```bash
cd packages/portal
npx tailwindcss -i app/globals.css -o app/tailwind.css --minify
npx next build
```

- [ ] **Step 6: Commit**

```bash
cd ../..
git add packages/portal/
git commit -m "feat(portal): add Stripe billing — checkout, webhooks, pricing page"
```

---

## Task 7: Settings Page & Logout

**Files:**
- Create: `packages/portal/app/dashboard/settings/page.tsx`

- [ ] **Step 1: Create settings page**

```tsx
// packages/portal/app/dashboard/settings/page.tsx
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { signOut } from "@/auth";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="bg-surface border border-border rounded-xl p-6 mb-6">
        <h2 className="text-sm font-medium text-secondary uppercase tracking-wider mb-4">
          Account
        </h2>
        <div className="flex items-center gap-4 mb-4">
          <img
            src={user.avatarUrl}
            alt={user.name}
            className="w-16 h-16 rounded-full"
          />
          <div>
            <p className="text-lg font-medium">{user.name || user.githubUsername}</p>
            <p className="text-secondary text-sm">@{user.githubUsername}</p>
            {user.email && (
              <p className="text-secondary text-sm">{user.email}</p>
            )}
          </div>
        </div>
        <p className="text-xs text-secondary">
          Account created {new Date(user.createdAt).toLocaleDateString()}
        </p>
      </div>

      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <button
          type="submit"
          className="text-sm text-red-400 hover:text-red-300 px-4 py-2 border border-red-800 rounded-lg hover:bg-red-900/20 transition-colors"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Rebuild Tailwind and verify**

```bash
cd packages/portal
npx tailwindcss -i app/globals.css -o app/tailwind.css --minify
npx next build
```

- [ ] **Step 3: Commit**

```bash
cd ../..
git add packages/portal/
git commit -m "feat(portal): add settings page with account info and logout"
```

---

## Task 8: API Rate Limiting & Usage Logging

**Files:**
- Modify: `packages/api/src/middleware/auth.ts`

- [ ] **Step 1: Update API auth middleware to validate keys against DB and log usage**

Replace the existing auth middleware:

```typescript
// packages/api/src/middleware/auth.ts
import type { MiddlewareHandler } from "hono";
import { db, apiKeys, usageLogs, users } from "@agora/db";
import { eq, and, isNull, gte, sql } from "drizzle-orm";

const TIER_LIMITS: Record<string, number> = {
  free: 100,
  pro: 10000,
  enterprise: 999999,
};

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json(
      { error: { code: "UNAUTHORIZED", message: "Missing API key" } },
      401
    );
  }

  const apiKey = authHeader.slice(7);

  if (!apiKey.startsWith("ak_")) {
    return c.json(
      { error: { code: "UNAUTHORIZED", message: "Invalid API key format" } },
      401
    );
  }

  // Validate key exists and isn't revoked
  const keyResult = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.key, apiKey), isNull(apiKeys.revokedAt)))
    .limit(1);

  if (keyResult.length === 0) {
    return c.json(
      { error: { code: "UNAUTHORIZED", message: "Invalid or revoked API key" } },
      401
    );
  }

  const key = keyResult[0];

  // Check rate limit
  const tier = key.tier ?? "free";
  const dailyLimit = TIER_LIMITS[tier] ?? 100;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const usageResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(usageLogs)
    .where(
      and(
        eq(usageLogs.apiKeyId, apiKey),
        gte(usageLogs.timestamp, todayStart)
      )
    );

  const todayUsage = Number(usageResult[0]?.count ?? 0);

  if (todayUsage >= dailyLimit) {
    return c.json(
      {
        error: {
          code: "RATE_LIMITED",
          message: `Daily limit of ${dailyLimit} requests exceeded. Upgrade your plan for more.`,
        },
      },
      429
    );
  }

  // Store key info on context
  c.set("apiKey", apiKey);

  await next();

  // Log usage after response (non-blocking)
  const status = c.res.status;
  db.insert(usageLogs)
    .values({
      apiKeyId: apiKey,
      endpoint: c.req.path,
      statusCode: status,
    })
    .then(() => {
      // Update last used and request count
      return db
        .update(apiKeys)
        .set({
          lastUsedAt: new Date(),
          requestCount: sql`${apiKeys.requestCount} + 1`,
        })
        .where(eq(apiKeys.key, apiKey));
    })
    .catch((err) => console.error("Usage log error:", err));
};
```

- [ ] **Step 2: Update API auth tests**

The existing auth tests mock the middleware — they should still pass since the middleware still checks for `ak_` prefix. But the tests won't hit the DB. Add a note that integration tests with DB are needed in the future.

```bash
cd packages/api
npx vitest run
```

Expected: Tests still pass (they test the Hono app which now imports the updated middleware, but the test requests won't reach DB calls since they'll fail at the key validation step).

Note: If tests fail because of the DB import at module level, mock `@agora/db` in the test files the same way `products.test.ts` does.

- [ ] **Step 3: Rebuild API**

```bash
cd ../..
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add packages/api/
git commit -m "feat(api): add real API key validation, rate limiting, and usage logging"
```

---

## Task 9: Deploy Portal & Update README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Deploy portal to Vercel**

```bash
cd packages/portal
vercel deploy --prod --yes
```

Add environment variables:
```bash
vercel env add AUTH_SECRET production
# Generate with: openssl rand -base64 32

vercel env add AUTH_GITHUB_ID production
# From GitHub OAuth App settings

vercel env add AUTH_GITHUB_SECRET production
# From GitHub OAuth App settings

vercel env add DATABASE_URL production
# Same as API

vercel env add STRIPE_SECRET_KEY production
# From Stripe dashboard

vercel env add STRIPE_WEBHOOK_SECRET production
# From Stripe webhook setup

vercel env add STRIPE_PRO_PRICE_ID production
# Create in Stripe: Product → Price → copy price ID

vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production
# From Stripe dashboard
```

Redeploy after adding env vars:
```bash
vercel deploy --prod --yes
```

- [ ] **Step 2: Create GitHub OAuth App**

Go to https://github.com/settings/developers → New OAuth App:
- Application name: Agora
- Homepage URL: your portal URL
- Authorization callback URL: `https://your-portal-url/api/auth/callback/github`

Copy Client ID and Client Secret to the Vercel env vars.

- [ ] **Step 3: Create Stripe Product and Price**

In Stripe Dashboard:
1. Create Product: "Agora Pro"
2. Add Price: $29/month, recurring
3. Copy the Price ID (starts with `price_`)
4. Add to Vercel as `STRIPE_PRO_PRICE_ID`

Set up webhook:
1. Stripe Dashboard → Developers → Webhooks → Add endpoint
2. URL: `https://your-portal-url/api/stripe/webhook`
3. Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
4. Copy signing secret to Vercel as `STRIPE_WEBHOOK_SECRET`

- [ ] **Step 4: Update README with portal link**

Add to the README nav links:
```markdown
[**Developer Portal →**](https://your-portal-url.vercel.app)
```

- [ ] **Step 5: Redeploy API with updated auth middleware**

```bash
cd /Users/matthewgoralczyk/Desktop/AI\ infrastructure/agora
vercel deploy --prod --yes
```

- [ ] **Step 6: Final commit and push**

```bash
git add .
git commit -m "feat: deploy developer portal with auth, keys, billing"
git push origin main
```
