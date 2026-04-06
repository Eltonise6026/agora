import { describe, it, expect, vi } from "vitest";

// Mock @agora/db before importing anything that depends on it
vi.mock("@agora/db", () => ({
  db: {},
  products: {},
  productEmbeddings: {},
  categories: {},
}));

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
