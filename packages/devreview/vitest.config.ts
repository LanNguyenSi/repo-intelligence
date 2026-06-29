import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/**/*.d.ts"],
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
