import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Restrict collection to source tests. Without this, once `dist/`
    // exists (any local or CI build), vitest's default glob also picks up
    // the tsc-compiled dist/*.test.js copies next to src/*.test.ts and
    // runs every test twice.
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      // test-support/ is build tooling for the entry-guard test, not
      // product code; excluded so it does not shift the measured
      // percentages the thresholds below were set against.
      exclude: ["src/**/*.test.ts", "src/**/*.d.ts", "src/test-support/**"],
      thresholds: {
        // A few points below the measured baseline (devreview ~72.3/63/85/76) for headroom
        // to allow headroom while still gating regressions.
        statements: 70,
        branches: 60,
        functions: 82,
        lines: 72,
      },
    },
  },
});
