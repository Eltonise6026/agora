import { describe, it, expect } from "vitest";
import { computeConfidence, computeFreshness } from "../src/lib/confidence.js";

describe("confidence scoring", () => {
  it("returns high confidence for recently crawled products", () => {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    expect(computeConfidence(tenMinutesAgo)).toBeGreaterThan(0.95);
  });

  it("returns medium confidence for day-old data", () => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const confidence = computeConfidence(oneDayAgo);
    expect(confidence).toBeGreaterThan(0.5);
    expect(confidence).toBeLessThan(0.9);
  });

  it("returns low confidence for week-old data", () => {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    expect(computeConfidence(oneWeekAgo)).toBeLessThan(0.5);
  });

  it("returns human-readable freshness string", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    expect(computeFreshness(twoHoursAgo)).toBe("2h ago");
  });

  it("returns minutes for recent data", () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    expect(computeFreshness(fiveMinutesAgo)).toBe("5m ago");
  });

  it("returns days for old data", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    expect(computeFreshness(threeDaysAgo)).toBe("3d ago");
  });
});
