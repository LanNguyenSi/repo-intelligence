import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { closeDb, getMetrics } from "../src/lib/db.js";
import { trackMetrics } from "../src/commands/track.js";

describe("Track Command", () => {
  beforeEach(() => {
    closeDb();
  });

  afterEach(() => {
    closeDb();
  });

  it("tracks build time", async () => {
    // Suppress console output
    vi.spyOn(console, "log").mockImplementation(() => {});

    await trackMetrics({ buildTime: 42.5 });

    const metrics = getMetrics(1);
    expect(metrics).toHaveLength(1);
    expect(metrics[0].buildTime).toBe(42.5);

    vi.restoreAllMocks();
  });

  it("tracks all metrics together", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});

    await trackMetrics({
      buildTime: 10.5,
      bundleSize: 500000,
      testTime: 5.2,
      message: "test run",
    });

    const metrics = getMetrics(1);
    expect(metrics).toHaveLength(1);
    expect(metrics[0].buildTime).toBe(10.5);
    expect(metrics[0].bundleSize).toBe(500000);
    expect(metrics[0].testTime).toBe(5.2);
    expect(metrics[0].message).toBe("test run");

    vi.restoreAllMocks();
  });

  it("auto-detects metrics when --auto is set", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});

    // Auto-detect won't find anything in test env, but should not crash
    // We also pass a manual metric so the command doesn't exit
    await trackMetrics({ buildTime: 30, auto: true });

    const metrics = getMetrics(1);
    expect(metrics).toHaveLength(1);
    expect(metrics[0].buildTime).toBe(30);

    vi.restoreAllMocks();
  });
});
