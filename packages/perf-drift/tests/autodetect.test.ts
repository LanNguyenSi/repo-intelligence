// ============================================================================
// Gap 7 (MED): perf-drift/src/lib/autodetect.ts — autoDetectMetrics
//
// Tests: detectBundleSize returns size when files exist, undefined when empty,
//        and skips dirs that throw.
//
// MUTATION: invert `if (files.length === 0) continue` to
//           `if (files.length !== 0) continue`
// KILLED BY: "returns total size when JS files are found" — expects a numeric
//   bundleSize; mutated code skips non-empty dirs and returns undefined
// ============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("glob", () => ({
  glob: vi.fn(),
}));

vi.mock("fs", () => ({
  statSync: vi.fn(),
}));

vi.mock("../src/lib/config.js", () => ({
  loadConfig: vi.fn(),
}));

import { glob } from "glob";
import { statSync } from "fs";
import { loadConfig } from "../src/lib/config.js";
import { autoDetectMetrics } from "../src/lib/autodetect.js";

const mockGlob = glob as ReturnType<typeof vi.fn>;
const mockStatSync = statSync as ReturnType<typeof vi.fn>;
const mockLoadConfig = loadConfig as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.resetAllMocks();
  // Default config with two directories
  mockLoadConfig.mockReturnValue({ threshold: 10, directories: ["dist", "build"] });
});

// ---------------------------------------------------------------------------
// Returns total bundle size when JS files are found
//
// MUTATION: invert the empty-files guard
// KILLED BY: expects numeric bundleSize; mutated code returns undefined
// ---------------------------------------------------------------------------
describe("autoDetectMetrics — JS files found", () => {
  it("returns bundleSize equal to total file sizes in the first matching dir", async () => {
    mockGlob
      .mockResolvedValueOnce(["dist/main.js", "dist/chunk.js"]) // first dir: dist
      .mockResolvedValueOnce([]); // build: unused because we return after first hit

    mockStatSync
      .mockReturnValueOnce({ size: 1024 })
      .mockReturnValueOnce({ size: 512 });

    const metrics = await autoDetectMetrics();

    expect(metrics.bundleSize).toBe(1536); // 1024 + 512
  });

  it("uses the first directory that has matching files (skips empty dirs)", async () => {
    mockGlob
      .mockResolvedValueOnce([]) // dist: empty → continue
      .mockResolvedValueOnce(["build/app.js"]); // build: has files

    mockStatSync.mockReturnValueOnce({ size: 2048 });

    const metrics = await autoDetectMetrics();

    expect(metrics.bundleSize).toBe(2048);
  });
});

// ---------------------------------------------------------------------------
// Returns undefined when no JS files exist in any directory
// ---------------------------------------------------------------------------
describe("autoDetectMetrics — no files found", () => {
  it("returns bundleSize as undefined when all directories are empty", async () => {
    mockGlob.mockResolvedValue([]); // all dirs return empty

    const metrics = await autoDetectMetrics();

    expect(metrics.bundleSize).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Handles errors gracefully (glob or statSync throws)
// ---------------------------------------------------------------------------
describe("autoDetectMetrics — error handling", () => {
  it("continues to next directory when glob throws", async () => {
    mockGlob
      .mockRejectedValueOnce(new Error("EACCES: permission denied")) // dist: error
      .mockResolvedValueOnce(["build/main.js"]); // build: ok

    mockStatSync.mockReturnValueOnce({ size: 3000 });

    const metrics = await autoDetectMetrics();

    expect(metrics.bundleSize).toBe(3000);
  });

  it("continues when all directories error or are empty and returns undefined", async () => {
    mockGlob.mockRejectedValue(new Error("ENOENT"));

    const metrics = await autoDetectMetrics();

    expect(metrics.bundleSize).toBeUndefined();
  });
});
