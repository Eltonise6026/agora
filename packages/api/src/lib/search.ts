import { db, products, productEmbeddings } from "@agora/db";
import { sql, eq, and, gte, lte, ilike, or, desc } from "drizzle-orm";
import { generateEmbedding } from "./embeddings.js";
import type { SearchQuery } from "../types.js";

const DEFAULT_PER_PAGE = 20;
const MAX_PER_PAGE = 100;

export async function searchProducts(query: SearchQuery) {
  const page = Math.max(1, parseInt(query.page ?? "1", 10));
  const perPage = Math.min(
    MAX_PER_PAGE,
    Math.max(1, parseInt(query.perPage ?? String(DEFAULT_PER_PAGE), 10))
  );
  const offset = (page - 1) * perPage;

  const conditions = [];

  if (query.source) {
    conditions.push(eq(products.source, query.source));
  }
  if (query.availability) {
    conditions.push(eq(products.availability, query.availability as any));
  }
  if (query.minPrice) {
    conditions.push(gte(products.priceAmount, query.minPrice));
  }
  if (query.maxPrice) {
    conditions.push(lte(products.priceAmount, query.maxPrice));
  }

  const isNaturalLanguage = query.q.split(" ").length > 3;

  if (isNaturalLanguage) {
    return semanticSearch(query.q, conditions, perPage, offset, page);
  }

  return keywordSearch(query.q, conditions, perPage, offset, page);
}

async function keywordSearch(
  q: string,
  conditions: any[],
  perPage: number,
  offset: number,
  page: number
) {
  // Escape SQL LIKE metacharacters to prevent injection
  const sanitizedQ = q.replace(/[%_\\]/g, "\\$&");

  // Match against name and description, but rank name matches higher
  const searchCondition = or(
    ilike(products.name, `%${sanitizedQ}%`),
    ilike(products.description, `%${sanitizedQ}%`)
  );

  const where =
    conditions.length > 0
      ? and(searchCondition, ...conditions)
      : searchCondition;

  // Relevance score: name match = 2, description-only match = 1
  const relevance = sql<number>`(
    CASE WHEN lower(${products.name}) LIKE lower(${"%" + sanitizedQ + "%"}) THEN 2 ELSE 0 END +
    CASE WHEN lower(${products.description}) LIKE lower(${"%" + sanitizedQ + "%"}) THEN 1 ELSE 0 END
  )`;

  const results = await db
    .select()
    .from(products)
    .where(where!)
    .orderBy(sql`${relevance} DESC`, desc(products.lastCrawled))
    .limit(perPage)
    .offset(offset);

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(products)
    .where(where!);

  return {
    results,
    total: Number(countResult[0].count),
    page,
    perPage,
  };
}

async function semanticSearch(
  q: string,
  conditions: any[],
  perPage: number,
  offset: number,
  page: number
) {
  const queryEmbedding = await generateEmbedding(q);

  const similarity = sql<number>`1 - (${productEmbeddings.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector)`;

  const results = await db
    .select({
      product: products,
      similarity,
    })
    .from(products)
    .innerJoin(productEmbeddings, eq(products.id, productEmbeddings.productId))
    .orderBy(sql`${productEmbeddings.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector`)
    .limit(perPage)
    .offset(offset);

  return {
    results: results.map((r) => r.product),
    total: results.length,
    page,
    perPage,
  };
}
