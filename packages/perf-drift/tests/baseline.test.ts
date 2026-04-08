import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { closeDb, insertMetric, getBaseline } from "../src/lib/db.js";
import { setBaseline } from "../src/commands/baseline.js";

describe("Baseline Command", () => {
  beforeEach(() => {
    closeDb();
  });

  afterEach(() => {
    closeDb();
    vi.restoreAllMocks();
  });

  it("sets most recent metric as baseline", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});

    insertMetric({ timestamp: Date.now(), buildTime: 40.0, baseline: false });

    await setBaseline({});

    const baseline = getBaseline();
    expect(baseline).not.toBeNull();
    expect(baseline!.buildTime).toBe(40.0);
    expect(baseline!.baseline).toBe(true);
  });

  it("creates new baseline with message", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});

    insertMetric({ timestamp: Date.now(), buildTime: 40.0, bundleSize: 100000, baseline: false });

    await setBaseline({ message: "v1.0.0" });

    const baseline = getBaseline();
    expect(baseline).not.toBeNull();
    expect(baseline!.message).toBe("v1.0.0");
    expect(baseline!.buildTime).toBe(40.0);
    expect(baseline!.bundleSize).toBe(100000);
  });

  it("handles no metrics gracefully", async () => {
    const logs: string[] = [];
    vi.spyOn(console, "log").mockImplementation((...args: any[]) => {
      logs.push(args.join(" "));
    });

    await setBaseline({});

    expect(logs.some((l) => l.includes("No metrics"))).toBe(true);
  });
});
