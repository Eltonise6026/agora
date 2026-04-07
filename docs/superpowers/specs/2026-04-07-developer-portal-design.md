# Agora Developer Portal — Design Spec

**Date:** 2026-04-07
**Status:** Approved

## Overview

A developer portal for Agora where developers sign up via GitHub OAuth, get API keys, view usage stats, and manage billing. Lives at `packages/portal/` in the monorepo. Includes Stripe integration for paid tiers (Free, Pro, Enterprise).

## Architecture

```
Browser → Next.js Portal App
  ├── /login          → GitHub OAuth via Auth.js
  ├── /dashboard      → API keys, usage stats, plan info
  ├── /dashboard/keys → Create/revoke API keys
  ├── /dashboard/billing → Stripe Checkout, Customer Portal
  ├── /api/auth/*     → Auth.js route handlers
  ├── /api/stripe/*   → Checkout + webhook handlers
  └── /api/keys/*     → Key CRUD operations
```

Shares the `@agora/db` package with the API. New tables for users, usage logs, and subscriptions.

## Auth

**Provider:** GitHub OAuth only via Auth.js v5 (NextAuth).

**Flow:**
1. Dev clicks "Sign in with GitHub"
2. GitHub OAuth redirect → callback
3. Auth.js creates/finds user in DB, issues JWT session cookie
4. All `/dashboard/*` routes protected by middleware — redirect to `/login` if unauthenticated

**Session:** HTTP-only JWT cookie. No database sessions needed for v1.

## Data Model

New tables added to `@agora/db`:

**`users`**
```
id:             text (primary key, cuid)
githubId:       text (unique, GitHub user ID)
githubUsername:  text
name:           text
email:          text
avatarUrl:      text
stripeCustomerId: text (nullable, set when first Stripe interaction)
tier:           enum("free", "pro", "enterprise") default "free"
createdAt:      timestamp
```

**`usage_logs`**
```
id:         serial (primary key)
apiKeyId:   text (foreign key → api_keys.key)
endpoint:   text ("/v1/products/search", etc.)
statusCode: integer
timestamp:  timestamp
```

**Modify existing `api_keys` table:**
- Add: `userId` (text, foreign key → users.id)
- Add: `name` (text, human-readable key name — already exists)
- Add: `lastUsedAt` (timestamp, nullable)
- Add: `revokedAt` (timestamp, nullable — soft delete)

**`subscriptions`**
```
id:                 text (primary key, cuid)
userId:             text (foreign key → users.id, unique)
stripeSubscriptionId: text (unique)
stripePriceId:      text
tier:               enum("free", "pro", "enterprise")
status:             text ("active", "canceled", "past_due")
currentPeriodEnd:   timestamp
createdAt:          timestamp
```

## Billing

**Tiers:**

| Tier | Requests/day | Price | Stripe |
|------|-------------|-------|--------|
| Free | 100 | $0 | No subscription needed |
| Pro | 10,000 | $29/mo | Stripe Checkout → subscription |
| Enterprise | Unlimited | Custom | "Contact us" (mailto) |

**Stripe integration:**
- `POST /api/stripe/checkout` — creates Stripe Checkout Session for Pro plan upgrade. Redirects to Stripe-hosted payment page.
- `POST /api/stripe/webhook` — receives `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` events. Updates `subscriptions` and `users.tier` in DB.
- Stripe Customer Portal — linked from billing page for payment method changes, cancellation, invoice history.

**Downgrade:** User clicks "Downgrade to Free" → cancels Stripe subscription at period end → webhook updates tier when period expires.

## Pages

**`/login`**
- Dark themed landing page
- "Sign in with GitHub" button
- Brief copy: "Get your API key and start building with Agora"

**`/dashboard`**
- Welcome message with GitHub avatar and name
- Current plan badge (Free/Pro/Enterprise) with "Upgrade" button if on Free
- Quick stats: total requests today, total requests this month, number of active keys
- Usage chart: bar chart showing requests per day for the last 30 days
- Recent API keys (top 3) with quick copy

**`/dashboard/keys`**
- "Create new key" button → modal/form with key name → generates `ak_` prefixed key → shows once (can't retrieve later)
- List of all keys: name, prefix (first 8 chars shown), created date, last used, request count, revoke button
- Revoked keys shown grayed out

**`/dashboard/billing`**
- Current plan with features comparison
- Upgrade/downgrade buttons
- If Pro: next invoice date, payment method (last 4 digits), link to Stripe Customer Portal
- Invoice history (from Stripe)

**`/dashboard/settings`**
- GitHub profile info (read-only)
- Logout button

## API Rate Limiting Update

The existing Agora API (`packages/api`) needs updates:

1. **Validate API key against DB** — currently accepts any `ak_` prefix. Now check it exists in `api_keys` table and isn't revoked.
2. **Log usage** — insert into `usage_logs` on each request.
3. **Enforce tier limits** — check daily request count against the user's tier limit. Return 429 with `Retry-After` header when exceeded.

## Tech Stack

- Next.js 15 (App Router)
- Auth.js v5 with GitHub provider
- Stripe SDK (`stripe` npm package)
- Same dark theme, Tailwind (pre-built CSS)
- `@agora/db` for database access
- Simple SVG bar chart (no chart library)

## Environment Variables

```
AUTH_SECRET=...                    # Auth.js secret (random string)
AUTH_GITHUB_ID=...                 # GitHub OAuth app client ID
AUTH_GITHUB_SECRET=...             # GitHub OAuth app client secret
STRIPE_SECRET_KEY=sk_...           # Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_...    # Stripe webhook signing secret
STRIPE_PRO_PRICE_ID=price_...      # Stripe Price ID for Pro plan
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...  # Stripe publishable key
DATABASE_URL=...                   # Same as other packages
```

## Deployment

Separate Vercel project from `packages/portal/`. Own domain eventually.

## Out of Scope

- Team management (future)
- Multiple organizations (future)
- API key scoping/permissions (future)
- Email notifications (future)
- Usage alerts (future)
