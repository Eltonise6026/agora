import type { MiddlewareHandler } from "hono";

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

  c.set("apiKey", apiKey);
  await next();
};
