import type { MiddlewareHandler } from "hono";
import { db, apiKeys, usageLogs } from "@agora/db";
import { eq, and, isNull, gte, sql } from "drizzle-orm";

const TIER_LIMITS: Record<string, number> = {
  free: 100,
  pro: 10000,
  enterprise: 999999,
};

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json(
      { error: { code: "UNAUTHORIZED", message: "Missing API key" } },
      401
    );
  }

  const apiKey = authHeader.slice(7);

  if (!apiKey.startsWith("ak_")) {
    return c.json(
      { error: { code: "UNAUTHORIZED", message: "Invalid API key format" } },
      401
    );
  }

  // Validate key exists and isn't revoked
  const keyResult = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.key, apiKey), isNull(apiKeys.revokedAt)))
    .limit(1);

  if (keyResult.length === 0) {
    return c.json(
      { error: { code: "UNAUTHORIZED", message: "Invalid or revoked API key" } },
      401
    );
  }

  const key = keyResult[0];
  const tier = key.tier ?? "free";
  const dailyLimit = TIER_LIMITS[tier] ?? 100;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const usageResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(usageLogs)
    .where(and(eq(usageLogs.apiKeyId, apiKey), gte(usageLogs.timestamp, todayStart)));

  const todayUsage = Number(usageResult[0]?.count ?? 0);

  if (todayUsage >= dailyLimit) {
    return c.json(
      { error: { code: "RATE_LIMITED", message: `Daily limit of ${dailyLimit} requests exceeded. Upgrade your plan for more.` } },
      429
    );
  }

  c.set("apiKey", apiKey);
  await next();

  // Log usage after response (non-blocking)
  const status = c.res.status;
  db.insert(usageLogs)
    .values({ apiKeyId: apiKey, endpoint: c.req.path, statusCode: status })
    .then(() => db.update(apiKeys).set({ lastUsedAt: new Date(), requestCount: sql`${apiKeys.requestCount} + 1` } as any).where(eq(apiKeys.key, apiKey)))
    .catch((err) => console.error("Usage log error:", err));
};
