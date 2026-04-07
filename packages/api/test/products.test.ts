import { describe, it, expect, vi } from "vitest";

// Mock @agora/db before importing anything that depends on it
vi.mock("@agora/db", () => {
  const mockCount = [{ count: 0 }];
  const mockKey = [{ key: "ak_test_key_12345678", tier: "free", revokedAt: null }];

  const mockLimit = vi.fn().mockImplementation(function (this: unknown) {
    // Return key result for apiKeys queries, empty for others
    return Promise.resolve(mockKey);
  });
  const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
  const mockFrom = vi.fn().mockImplementation((table: unknown) => {
    // If querying usageLogs, return count result
    if (table === "usageLogs_mock") {
      return { where: vi.fn().mockResolvedValue(mockCount) };
    }
    return { where: mockWhere };
  });
  const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

  // For usage count query (select with object arg)
  const selectWithCount = vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(mockCount),
    }),
  });

  // We need select to handle both cases. Use a smarter mock.
  let selectCallCount = 0;
  const smartSelect = vi.fn().mockImplementation((arg?: unknown) => {
    selectCallCount++;
    if (arg && typeof arg === "object") {
      // This is the count query: db.select({ count: sql`count(*)` })
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 0 }]),
        }),
      };
    }
    // This is the key lookup: db.select().from(apiKeys).where(...).limit(1)
    return {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(mockKey),
        }),
      }),
    };
  });

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
      select: smartSelect,
      insert: mockInsert,
      update: mockUpdate,
    },
    products: {},
    productEmbeddings: {},
    categories: {},
    apiKeys: {},
    usageLogs: {},
  };
});

import app from "../src/index.js";

const AUTH_HEADER = { Authorization: "Bearer ak_test_key_12345678" };

describe("product endpoints", () => {
  it("GET /v1/products/search returns 400 without query", async () => {
    const res = await app.request("/v1/products/search", {
      headers: AUTH_HEADER,
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("BAD_REQUEST");
  });

  it("GET /health returns 200 without auth", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
  });

  it("GET /v1/products/search returns 401 without auth", async () => {
    const res = await app.request("/v1/products/search?q=boots");
    expect(res.status).toBe(401);
  });
});
