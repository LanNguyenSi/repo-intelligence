// ============================================================================
// autoDetectMetrics against the real glob package (no module mocks).
//
// tests/autodetect.test.ts replaces `glob` with a mock, so it cannot notice a
// change in glob's own matching. These tests run the real pattern
// `<dir>/**/*.{js,mjs,cjs}` with `ignore: ["**/node_modules/**"]` on a
// fixture directory, so a glob major bump that changes brace expansion,
// globstar, ignore handling or the shape of the result shows up here.
//
// MUTATION: drop the ignore option in src/lib/autodetect.ts
// KILLED BY: "skips files below node_modules" (counts the vendored file)
// MUTATION: shrink the brace set from {js,mjs,cjs} to {js,mjs}
// KILLED BY: "counts .js, .mjs and .cjs files at any depth" (misses c.cjs)
// ============================================================================

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

import { autoDetectMetrics } from "../src/lib/autodetect.js";

let originalCwd: string;
let fixture: string;

function write(rel: string, bytes: number): number {
  const file = join(fixture, rel);
  mkdirSync(join(file, ".."), { recursive: true });
  writeFileSync(file, "x".repeat(bytes));
  return statSync(file).size;
}

beforeEach(() => {
  originalCwd = process.cwd();
  fixture = mkdtempSync(join(tmpdir(), "perf-drift-glob-"));
  process.chdir(fixture);
});

afterEach(() => {
  process.chdir(originalCwd);
  rmSync(fixture, { recursive: true, force: true });
});

describe("autoDetectMetrics with the real glob", () => {
  it("counts .js, .mjs and .cjs files at any depth", async () => {
    const sizes = [
      write("dist/a.js", 10),
      write("dist/b.mjs", 20),
      write("dist/c.cjs", 40),
      write("dist/sub/deeper/e.js", 80),
    ];
    // Not matched by the extension set.
    write("dist/style.css", 1000);
    write("dist/types.d.ts", 2000);

    const metrics = await autoDetectMetrics();

    expect(metrics.bundleSize).toBe(sizes.reduce((a, b) => a + b, 0));
  });

  it("skips files below node_modules", async () => {
    const kept = write("dist/app.js", 7);
    write("dist/node_modules/pkg/index.js", 5000);
    write("dist/sub/node_modules/pkg/index.cjs", 6000);

    const metrics = await autoDetectMetrics();

    expect(metrics.bundleSize).toBe(kept);
  });

  it("does not descend into dot directories", async () => {
    const kept = write("dist/app.js", 9);
    write("dist/.cache/hidden.js", 4000);

    const metrics = await autoDetectMetrics();

    expect(metrics.bundleSize).toBe(kept);
  });

  it("uses the first configured directory that has matching files", async () => {
    writeFileSync(
      join(fixture, ".perfdriftrc.json"),
      JSON.stringify({ directories: ["missing", "empty", "out", "dist"] }),
    );
    mkdirSync(join(fixture, "empty"));
    write("empty/readme.md", 100);
    const outSize = write("out/main.js", 33);
    write("dist/other.js", 999);

    const metrics = await autoDetectMetrics();

    expect(metrics.bundleSize).toBe(outSize);
  });

  it("accepts a trailing slash and a ./ prefix on the directory", async () => {
    const size = write("dist/a.js", 12) + write("dist/b.js", 13);

    for (const dir of ["dist/", "./dist"]) {
      writeFileSync(join(fixture, ".perfdriftrc.json"), JSON.stringify({ directories: [dir] }));
      const metrics = await autoDetectMetrics();
      expect(metrics.bundleSize, `directory ${dir}`).toBe(size);
    }
  });

  it("accepts an absolute directory", async () => {
    const size = write("abs-dist/a.js", 21) + write("abs-dist/n/b.mjs", 22);
    writeFileSync(
      join(fixture, ".perfdriftrc.json"),
      JSON.stringify({ directories: [join(fixture, "abs-dist")] }),
    );

    const metrics = await autoDetectMetrics();

    expect(metrics.bundleSize).toBe(size);
  });

  it("returns undefined when no configured directory has matching files", async () => {
    write("dist/style.css", 10);

    const metrics = await autoDetectMetrics();

    expect(metrics.bundleSize).toBeUndefined();
  });
});
