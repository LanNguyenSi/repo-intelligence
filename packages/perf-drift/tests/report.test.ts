import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { closeDb, insertMetric } from "../src/lib/db.js";
import { showReport } from "../src/commands/report.js";

describe("Report Command", () => {
  beforeEach(() => {
    closeDb();
  });

  afterEach(() => {
    closeDb();
    vi.restoreAllMocks();
  });

  it("handles empty database gracefully", async () => {
    const logs: string[] = [];
    vi.spyOn(console, "log").mockImplementation((...args: any[]) => {
      logs.push(args.join(" "));
    });

    await showReport({});

    expect(logs.some((l) => l.includes("No metrics"))).toBe(true);
  });

  it("shows metrics in report", async () => {
    const logs: string[] = [];
    vi.spyOn(console, "log").mockImplementation((...args: any[]) => {
      logs.push(args.join(" "));
    });

    insertMetric({ timestamp: Date.now(), buildTime: 40.0, bundleSize: 100000, testTime: 10, baseline: false });
    insertMetric({ timestamp: Date.now() + 1000, buildTime: 42.0, bundleSize: 110000, testTime: 11, baseline: false });

    await showReport({ limit: 10 });

    const output = logs.join("\n");
    expect(output).toContain("Performance Report");
    expect(output).toContain("2 measurements");
    expect(output).toContain("avg");
  });

  it("outputs JSON when --json flag is set", async () => {
    const logs: string[] = [];
    vi.spyOn(console, "log").mockImplementation((...args: any[]) => {
      logs.push(args.join(" "));
    });

    insertMetric({ timestamp: Date.now(), buildTime: 40.0, baseline: false });

    await showReport({ json: true });

    const parsed = JSON.parse(logs[0]);
    expect(parsed.metrics).toHaveLength(1);
    expect(parsed.stats.buildTime).toBeDefined();
    expect(parsed.stats.buildTime.avg).toBe(40);
  });

  it("handles empty JSON output", async () => {
    const logs: string[] = [];
    vi.spyOn(console, "log").mockImplementation((...args: any[]) => {
      logs.push(args.join(" "));
    });

    await showReport({ json: true });

    const parsed = JSON.parse(logs[0]);
    expect(parsed.metrics).toHaveLength(0);
    expect(parsed.stats).toEqual({});
  });
});
