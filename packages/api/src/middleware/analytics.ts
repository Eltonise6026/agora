import type { MiddlewareHandler } from "hono";
import { db, products } from "@agora/db";
import { eq, sql, inArray } from "drizzle-orm";

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

    for (const { storeId } of storeResults) {
      if (!storeId) continue;
      await db.execute(sql`
        INSERT INTO store_analytics (store_id, date, query_count, product_views)
        VALUES (${storeId}, ${today}, 1, 0)
        ON CONFLICT ON CONSTRAINT idx_store_analytics_store_date
        DO UPDATE SET query_count = store_analytics.query_count + 1
      `);
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
  }
}
