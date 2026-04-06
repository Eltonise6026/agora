#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { handleToolCall } from "./handlers.js";

const server = new McpServer({
  name: "agora",
  version: "0.1.0",
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const reg = server.registerTool.bind(server) as (name: string, config: any, cb: any) => void;

reg(
  "agora_search",
  {
    description:
      "Search for products across e-commerce sites. Supports natural language queries like 'waterproof hiking boots under $100' or keyword searches.",
    inputSchema: {
      query: z.string().describe("Search query (natural language or keywords)"),
      source: z.string().optional().describe("Filter by source (e.g., 'amazon', 'shopify')"),
      minPrice: z.number().optional().describe("Minimum price filter"),
      maxPrice: z.number().optional().describe("Maximum price filter"),
      availability: z
        .enum(["in_stock", "out_of_stock"])
        .optional()
        .describe("Filter by availability"),
    },
  },
  async (args: Record<string, unknown>) => {
    try {
      const text = await handleToolCall("agora_search", args);
      return { content: [{ type: "text" as const, text }] };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text" as const, text: `Error: ${message}` }],
        isError: true,
      };
    }
  }
);

reg(
  "agora_product",
  {
    description: "Get detailed information about a specific product by its Agora ID.",
    inputSchema: {
      id: z.string().describe("Agora product ID (e.g., agr_abc123)"),
    },
  },
  async (args: Record<string, unknown>) => {
    try {
      const text = await handleToolCall("agora_product", args);
      return { content: [{ type: "text" as const, text }] };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text" as const, text: `Error: ${message}` }],
        isError: true,
      };
    }
  }
);

reg(
  "agora_similar",
  {
    description:
      "Find products similar to a given product. Useful for comparison shopping.",
    inputSchema: {
      id: z.string().describe("Agora product ID to find similar products for"),
    },
  },
  async (args: Record<string, unknown>) => {
    try {
      const text = await handleToolCall("agora_similar", args);
      return { content: [{ type: "text" as const, text }] };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text" as const, text: `Error: ${message}` }],
        isError: true,
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
