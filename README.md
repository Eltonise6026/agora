# Agora

Agent-friendly commerce infrastructure. Agora makes the internet accessible to AI agents by providing a unified API, SDK, and MCP server for discovering, comparing, and purchasing products across e-commerce sites.

## Architecture

```
Agent → SDK → API → Index (PostgreSQL + pgvector) ← Crawler
```

## Packages

| Package | Description |
|---------|-------------|
| `@agora/db` | Database schema and client (Drizzle ORM) |
| `@agora/api` | REST API (Hono on Vercel) |
| `@agora/sdk` | TypeScript SDK for agent developers |
| `@agora/mcp` | MCP server for native AI agent integration |
| `crawler/` | Python crawler (Scrapy + Playwright) |

## Quick Start

### Prerequisites

- Node.js 22+
- Python 3.12+
- PostgreSQL 16+ with pgvector extension
- OpenAI API key (for embeddings)

### Setup

```bash
# Install JS dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your database URL and API keys

# Generate and run database migrations
cd packages/db
npx drizzle-kit generate
npx drizzle-kit migrate

# Install crawler dependencies
cd ../../crawler
uv sync

# Start the API
cd ../packages/api
npm run dev
```

### Using the SDK

```typescript
import { Agora } from '@agora/sdk'

const agora = new Agora({ apiKey: 'ak_your_key' })
const results = await agora.search('waterproof hiking boots under $100')
```

### Using as MCP Server

Add to your Claude Code config:

```json
{
  "mcpServers": {
    "agora": {
      "command": "npx",
      "args": ["@agora/mcp"],
      "env": {
        "AGORA_API_KEY": "ak_your_key"
      }
    }
  }
}
```

## Development

```bash
npm run test    # Run all tests
npm run build   # Build all packages
npm run dev     # Start dev servers
```
