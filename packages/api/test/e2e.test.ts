import { describe, it, expect, vi } from "vitest";

// Mock @agora/db before importing anything that depends on it
vi.mock("@agora/db", () => ({
  db: {},
  products: {},
  productEmbeddings: {},
  categories: {},
}));

import app from "../src/index.js";

const AUTH = { Authorization: "Bearer ak_test_smoke_12345678" };

describe("e2e smoke tests", () => {
  it("health check works without auth", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });

  it("protected routes require auth", async () => {
    const res = await app.request("/v1/products/search?q=test");
    expect(res.status).toBe(401);
  });

  it("search requires q parameter", async () => {
    const res = await app.request("/v1/products/search", { headers: AUTH });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("BAD_REQUEST");
  });

  it("CORS headers are present", async () => {
    const res = await app.request("/health", {
      headers: { Origin: "https://example.com" },
    });
    expect(res.headers.get("access-control-allow-origin")).toBeTruthy();
  });
});
