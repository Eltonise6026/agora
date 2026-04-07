import { describe, it, expect, vi } from "vitest";

// Mock @agora/db before importing anything that depends on it
vi.mock("@agora/db", () => {
  const mockSelect = vi.fn();
  const mockFrom = vi.fn();
  const mockWhere = vi.fn();
  const mockLimit = vi.fn();

  // Chain: db.select().from().where().limit()
  mockLimit.mockResolvedValue([{ key: "ak_test_valid_key_1234567890", tier: "free", revokedAt: null }]);
  mockWhere.mockReturnValue({ limit: mockLimit });
  mockFrom.mockReturnValue({ where: mockWhere });
  mockSelect.mockReturnValue({ from: mockFrom });

  const mockInsert = vi.fn().mockReturnValue({
    values: vi.fn().mockReturnValue({
      then: vi.fn().mockReturnValue({ catch: vi.fn() }),
    }),
  });

  const mockUpdate = vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
  });

  return {
    db: {
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
    },
    apiKeys: {},
    usageLogs: {},
  };
});

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

  it("accepts requests with valid API key found in database", async () => {
    const app = createTestApp();
    const res = await app.request("/v1/test", {
      headers: { Authorization: "Bearer ak_test_valid_key_1234567890" },
    });
    expect(res.status).toBe(200);
  });
});
