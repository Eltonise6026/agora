import { Hono } from "hono";
import { db, products, productEmbeddings } from "@agora/db";
import { eq, sql } from "drizzle-orm";
import { searchProducts } from "../lib/search.js";
import { computeConfidence, computeFreshness } from "../lib/confidence.js";
import type { SearchQuery, ProductResponse } from "../types.js";

const productsRouter = new Hono();

function formatProduct(row: typeof products.$inferSelect): ProductResponse {
  return {
    id: row.id,
    sourceUrl: row.sourceUrl,
    source: row.source,
    name: row.name,
    description: row.description,
    price: row.priceAmount
      ? { amount: row.priceAmount, currency: row.priceCurrency ?? "USD" }
      : null,
    images: (row.images as string[]) ?? [],
    categories: (row.categories as string[]) ?? [],
    attributes: (row.attributes as Record<string, string>) ?? {},
    availability: row.availability ?? "unknown",
    seller: {
      name: row.sellerName,
      url: row.sellerUrl,
      rating: row.sellerRating,
    },
    lastCrawled: row.lastCrawled.toISOString(),
  };
}

// GET /v1/products/search
productsRouter.get("/search", async (c) => {
  const query: SearchQuery = {
    q: c.req.query("q") ?? "",
    source: c.req.query("source"),
    minPrice: c.req.query("minPrice"),
    maxPrice: c.req.query("maxPrice"),
    availability: c.req.query("availability"),
    category: c.req.query("category"),
    page: c.req.query("page"),
    perPage: c.req.query("perPage"),
  };

  if (!query.q) {
    return c.json(
      { error: { code: "BAD_REQUEST", message: "Query parameter 'q' is required" } },
      400
    );
  }

  const { results, total, page, perPage } = await searchProducts(query);

  return c.json({
    data: results.map(formatProduct),
    meta: { total, page, perPage },
  });
});

// GET /v1/products/:id
productsRouter.get("/:id", async (c) => {
  const id = c.req.param("id");

  const result = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);

  if (result.length === 0) {
    return c.json(
      { error: { code: "NOT_FOUND", message: `Product ${id} not found` } },
      404
    );
  }

  const product = result[0];
  return c.json({
    data: formatProduct(product),
    meta: {
      freshness: computeFreshness(product.lastCrawled),
      source: product.source,
      confidence: computeConfidence(product.lastCrawled),
    },
  });
});

// GET /v1/products/:id/similar
productsRouter.get("/:id/similar", async (c) => {
  const id = c.req.param("id");

  const embeddingResult = await db
    .select()
    .from(productEmbeddings)
    .where(eq(productEmbeddings.productId, id))
    .limit(1);

  if (embeddingResult.length === 0) {
    return c.json(
      { error: { code: "NOT_FOUND", message: `Product ${id} not found or has no embedding` } },
      404
    );
  }

  const embedding = embeddingResult[0].embedding;

  const similar = await db
    .select({ product: products })
    .from(products)
    .innerJoin(productEmbeddings, eq(products.id, productEmbeddings.productId))
    .where(sql`${products.id} != ${id}`)
    .orderBy(sql`${productEmbeddings.embedding} <=> ${JSON.stringify(embedding)}::vector`)
    .limit(10);

  return c.json({
    data: similar.map((r) => formatProduct(r.product)),
    meta: { total: similar.length, page: 1, perPage: 10 },
  });
});

export { productsRouter };
