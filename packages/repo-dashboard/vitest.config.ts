import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Restrict collection to source tests. Without this, once `dist/`
    // exists (any local or CI build), vitest's default glob also picks up
    // the tsc-compiled dist/*.test.js copies next to src/*.test.ts and
    // runs every test twice.
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/**/*.d.ts", "src/test-support/**"],
      thresholds: {
        // Ratcheted a few points below the measured baseline so a real
        // regression fails `npm test` while normal churn has headroom.
        // Low floor: src/display.ts has no real tests yet; raise it when they land.
        statements: 33,
        branches: 39,
        functions: 30,
        lines: 37,
      },
    },
  },
});
