# Marketing Site - Design Spec

**Date:** 2026-04-07
**Status:** Approved

---

## Overview

Single-page marketing site for Agora at `packages/marketing`. Next.js app deployed separately on Vercel. Dark theme with Planetscale/Railway aesthetic: subtle grid texture, badge/pill elements, status indicators, heavy contrast, numbers prominent.

## Visual Direction

- Background: #050508 with subtle grid lines (rgba purple, 40px spacing)
- Text: #fff headings, #71717a body, #a78bfa accent
- Elements: pill badges, status dots, monospaced data, subtle gradient overlays
- Cards: #18181b with #27272a borders, 14px border-radius
- Animations: rotating ambient conic gradient on hero, counter-style number animations on stats, smooth scroll between sections

## Page Structure

### Hero
- Large "Agora" title, "PROTOCOL v1.0" badge pill
- Tagline: "The internet's missing commerce layer. Built for AI agents. Open for everyone."
- Rotating ambient conic gradient background
- Three role selector cards below: Developer (</> icon), Store Owner (store icon), Investor (arrow icon)
- Each card has a title and subtitle (e.g., "Build with the API")
- Clicking a card highlights it (purple border glow) and smooth-scrolls to that section

### Stats Banner
- Horizontal strip with animated counters
- "22,562 products / 52 stores / 30+ endpoints / Protocol v1.0"
- Green status dot with "NETWORK OPERATIONAL" monospaced label

### Developer Section
- Heading: "Build agents that shop"
- SDK code snippet (3 lines, syntax highlighted)
- MCP server config JSON block
- "Try the playground" and "Read the docs" CTAs
- Link to portal for API keys

### Store Owner Section
- Heading: "Make your store agent-ready"
- Shopify adapter one-liner: `curl -X POST .../v1/adapter/shopify`
- What stores get: 6 feature cards (registry, analytics, trust score, webhooks, purchases, cross-store)
- Validator CTA: `npx @agora/validator https://yourstore.com`

### Investor Section
- Heading: "The infrastructure layer for agent commerce"
- Three data points: market size (4M+ Shopify stores), transaction layer (cart to checkout), network effect (registry + protocol)
- Architecture overview: Protocol > Registry > API > Commerce > Webhooks
- "The moat" explanation: protocol standard + network effect + data graph

### Footer
- Links: GitHub, API Playground, Developer Portal, Demo, Protocol Spec
- "Built by Agora" with MIT license note

## Tech Stack

- Next.js (App Router) in `packages/marketing`
- Tailwind CSS v3 with CLI pre-build approach (same as other packages in monorepo)
- Static export (`output: 'export'`) - no server-side rendering needed
- Framer Motion for animations (counter, scroll, card interactions)
- Deploy separately on Vercel

## File Structure

```
packages/marketing/
  app/
    layout.tsx          - Root layout, fonts, metadata
    page.tsx            - Single page with all sections
    globals.css         - Tailwind input
    tailwind.css        - Built output (CLI approach)
    components/
      hero.tsx          - Hero + role selector cards
      stats-banner.tsx  - Animated stats strip
      developer.tsx     - Developer section
      store-owner.tsx   - Store owner section
      investor.tsx      - Investor section
      footer.tsx        - Footer
      animated-counter.tsx - Number counter animation
  package.json
  tailwind.config.js
  tsconfig.json
  next.config.js
```
