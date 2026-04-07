import type { MiddlewareHandler } from "hono";
import { db, products } from "@agora/db";
import { eq, sql, inArray } from "drizzle-orm";
import { dispatchWebhooks } from "../lib/webhook-dispatcher.js";

export const analyticsMiddleware: MiddlewareHandler = async (c, next) => {
  await next();

  // Only track successful responses
  if (c.res.status !== 200) return;

  const path = c.req.path;

  // Fire and forget — don't block the response
  trackAnalytics(path, c.res.clone()).catch((err) =>
    console.error("Analytics error:", err)
  );
};

async function trackAnalytics(path: string, res: Response) {
  const body = await res.json();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (path === "/v1/products/search") {
    const productIds: string[] = (body?.data ?? [])
      .map((p: any) => p.id)
      .filter(Boolean);

    if (productIds.length === 0) return;

    const storeResults = await db
      .selectDistinct({ storeId: products.storeId })
      .from(products)
      .where(inArray(products.id, productIds));

    // Group product IDs by store for webhook dispatching
    const storeProductMap = new Map<string, string[]>();
    for (const { storeId } of storeResults) {
      if (!storeId) continue;
      await db.execute(sql`
        INSERT INTO store_analytics (store_id, date, query_count, product_views)
        VALUES (${storeId}, ${today}, 1, 0)
        ON CONFLICT ON CONSTRAINT idx_store_analytics_store_date
        DO UPDATE SET query_count = store_analytics.query_count + 1
      `);
      storeProductMap.set(storeId, []);
    }

    // Map product IDs to their stores for webhook payload
    if (storeProductMap.size > 0) {
      const productStoreRows = await db
        .select({ id: products.id, storeId: products.storeId })
        .from(products)
        .where(inArray(products.id, productIds));

      for (const { id, storeId } of productStoreRows) {
        if (storeId && storeProductMap.has(storeId)) {
          storeProductMap.get(storeId)!.push(id);
        }
      }

      const query: string = body?.meta?.query ?? "";
      for (const [storeId, matchedIds] of storeProductMap) {
        dispatchWebhooks({
          event: "product.searched",
          store_id: storeId,
          data: {
            query,
            products_matched: matchedIds.length,
            product_ids: matchedIds,
          },
        }).catch((err) => console.error("Webhook dispatch error:", err));
      }
    }
  } else if (/^\/v1\/products\/[^/]+$/.test(path) && !path.includes("similar")) {
    // Product detail view
    const productId = body?.data?.id;
    if (!productId) return;

    const result = await db
      .select({ storeId: products.storeId })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    const storeId = result[0]?.storeId;
    if (!storeId) return;

    await db.execute(sql`
      INSERT INTO store_analytics (store_id, date, query_count, product_views)
      VALUES (${storeId}, ${today}, 0, 1)
      ON CONFLICT ON CONSTRAINT idx_store_analytics_store_date
      DO UPDATE SET product_views = store_analytics.product_views + 1
    `);

    dispatchWebhooks({
      event: "product.viewed",
      store_id: storeId,
      data: { product_id: productId },
    }).catch((err) => console.error("Webhook dispatch error:", err));
  }
}
