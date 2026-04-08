import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { insertMetric, getMetrics, getBaseline, setMetricAsBaseline, closeDb, type Metric } from "../src/lib/db.js";

describe("Database", () => {
  beforeEach(() => {
    // Close database before each test (in-memory DB is recreated)
    closeDb();
  });

  afterEach(() => {
    // Clean up after tests
    closeDb();
  });

  it("inserts and retrieves metrics", () => {
    const metric: Metric = {
      timestamp: Date.now(),
      buildTime: 45.2,
      bundleSize: 1500000,
      testTime: 12.3,
      message: "Test metric",
      baseline: false,
    };

    const id = insertMetric(metric);
    expect(id).toBeGreaterThan(0);

    const metrics = getMetrics(1);
    expect(metrics).toHaveLength(1);
    expect(metrics[0].buildTime).toBe(45.2);
    expect(metrics[0].bundleSize).toBe(1500000);
    expect(metrics[0].testTime).toBe(12.3);
    expect(metrics[0].message).toBe("Test metric");
  });

  it("sets and retrieves baseline", () => {
    const metric1: Metric = {
      timestamp: Date.now(),
      buildTime: 45.2,
      baseline: false,
    };

    const metric2: Metric = {
      timestamp: Date.now() + 1000,
      buildTime: 50.0,
      baseline: false,
    };

    const id1 = insertMetric(metric1);
    insertMetric(metric2);

    setMetricAsBaseline(id1);

    const baseline = getBaseline();
    expect(baseline).not.toBeNull();
    expect(baseline?.buildTime).toBe(45.2);
    expect(baseline?.baseline).toBe(true);
  });

  it("handles multiple metrics", () => {
    for (let i = 0; i < 5; i++) {
      insertMetric({
        timestamp: Date.now() + i * 1000,
        buildTime: 40 + i,
        baseline: false,
      });
    }

    const metrics = getMetrics(5);
    expect(metrics).toHaveLength(5);
    // Most recent first
    expect(metrics[0].buildTime).toBe(44);
    expect(metrics[4].buildTime).toBe(40);
  });

  it("handles null values", () => {
    const metric: Metric = {
      timestamp: Date.now(),
      buildTime: 45.2,
      // bundleSize and testTime are undefined
      baseline: false,
    };

    const id = insertMetric(metric);
    const retrieved = getMetrics(1)[0];

    expect(retrieved.buildTime).toBe(45.2);
    // SQLite returns null for NULL values, not undefined
    expect(retrieved.bundleSize).toBeNull();
    expect(retrieved.testTime).toBeNull();
  });
});
