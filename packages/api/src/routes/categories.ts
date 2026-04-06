import { Hono } from "hono";
import { db, categories } from "@agora/db";
import { isNull, eq } from "drizzle-orm";

const categoriesRouter = new Hono();

categoriesRouter.get("/", async (c) => {
  const parentId = c.req.query("parentId");

  const condition = parentId
    ? eq(categories.parentId, parseInt(parentId, 10))
    : isNull(categories.parentId);

  const results = await db
    .select()
    .from(categories)
    .where(condition);

  return c.json({
    data: results,
    meta: { total: results.length },
  });
});

export { categoriesRouter };
