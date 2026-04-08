import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { insertMetric, setMetricAsBaseline, closeDb } from "../src/lib/db.js";
import { checkDrift } from "../src/commands/check.js";

describe("Regression Detection", () => {
  beforeEach(() => {
    closeDb();
  });

  afterEach(() => {
    closeDb();
  });

  it("detects build time regression", async () => {
    // Baseline: 40s
    const baselineId = insertMetric({
      timestamp: Date.now() - 1000,
      buildTime: 40.0,
      baseline: false,
    });
    setMetricAsBaseline(baselineId);

    // Recent: 45s (+12.5%, > 10% threshold)
    insertMetric({
      timestamp: Date.now(),
      buildTime: 45.0,
      baseline: false,
    });

    const hasRegression = await checkDrift({ threshold: 10 });
    expect(hasRegression).toBe(true);
  });

  it("no regression within threshold", async () => {
    // Baseline: 40s
    const baselineId = insertMetric({
      timestamp: Date.now() - 1000,
      buildTime: 40.0,
      baseline: false,
    });
    setMetricAsBaseline(baselineId);

    // Recent: 43s (+7.5%, < 10% threshold)
    insertMetric({
      timestamp: Date.now(),
      buildTime: 43.0,
      baseline: false,
    });

    const hasRegression = await checkDrift({ threshold: 10 });
    expect(hasRegression).toBe(false);
  });

  it("detects bundle size regression", async () => {
    const baselineId = insertMetric({
      timestamp: Date.now() - 1000,
      bundleSize: 1000000,
      baseline: false,
    });
    setMetricAsBaseline(baselineId);

    // +15% larger
    insertMetric({
      timestamp: Date.now(),
      bundleSize: 1150000,
      baseline: false,
    });

    const hasRegression = await checkDrift({ threshold: 10 });
    expect(hasRegression).toBe(true);
  });

  it("uses custom threshold", async () => {
    const baselineId = insertMetric({
      timestamp: Date.now() - 1000,
      buildTime: 40.0,
      baseline: false,
    });
    setMetricAsBaseline(baselineId);

    // +12.5%
    insertMetric({
      timestamp: Date.now(),
      buildTime: 45.0,
      baseline: false,
    });

    // With 15% threshold, no regression
    const hasRegression = await checkDrift({ threshold: 15 });
    expect(hasRegression).toBe(false);
  });
});
