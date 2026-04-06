import type { Tool } from "@modelcontextprotocol/sdk/types.js";

export const tools: Tool[] = [
  {
    name: "agora_search",
    description:
      "Search for products across e-commerce sites. Supports natural language queries like 'waterproof hiking boots under $100' or keyword searches.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search query (natural language or keywords)",
        },
        source: {
          type: "string",
          description: "Filter by source (e.g., 'amazon', 'shopify')",
        },
        minPrice: {
          type: "number",
          description: "Minimum price filter",
        },
        maxPrice: {
          type: "number",
          description: "Maximum price filter",
        },
        availability: {
          type: "string",
          enum: ["in_stock", "out_of_stock"],
          description: "Filter by availability",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "agora_product",
    description:
      "Get detailed information about a specific product by its Agora ID.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: {
          type: "string",
          description: "Agora product ID (e.g., agr_abc123)",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "agora_similar",
    description:
      "Find products similar to a given product. Useful for comparison shopping.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: {
          type: "string",
          description: "Agora product ID to find similar products for",
        },
      },
      required: ["id"],
    },
  },
];
