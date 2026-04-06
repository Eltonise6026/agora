import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { authMiddleware } from "../src/middleware/auth.js";

function createTestApp() {
  const app = new Hono();
  app.use("/v1/*", authMiddleware);
  app.get("/v1/test", (c) => c.json({ ok: true }));
  return app;
}

describe("auth middleware", () => {
  it("rejects requests without an API key", async () => {
    const app = createTestApp();
    const res = await app.request("/v1/test");
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects requests with invalid API key format", async () => {
    const app = createTestApp();
    const res = await app.request("/v1/test", {
      headers: { Authorization: "Bearer not-a-valid-key" },
    });
    expect(res.status).toBe(401);
  });

  it("accepts requests with valid API key format", async () => {
    const app = createTestApp();
    const res = await app.request("/v1/test", {
      headers: { Authorization: "Bearer ak_test_valid_key_1234567890" },
    });
    expect(res.status).toBe(200);
  });
});
