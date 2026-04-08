import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { closeDb, insertMetric, getMetrics } from "../src/lib/db.js";
import { resetData } from "../src/commands/reset.js";

describe("Reset Command", () => {
  beforeEach(() => {
    closeDb();
  });

  afterEach(() => {
    closeDb();
    vi.restoreAllMocks();
  });

  it("clears all metrics with --force", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});

    insertMetric({ timestamp: Date.now(), buildTime: 40.0, baseline: false });
    insertMetric({ timestamp: Date.now() + 1000, buildTime: 42.0, baseline: false });

    expect(getMetrics()).toHaveLength(2);

    await resetData({ force: true });

    expect(getMetrics()).toHaveLength(0);
  });
});
