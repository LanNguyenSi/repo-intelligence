import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/**/*.d.ts"],
      thresholds: {
        // Set a few points below the measured baseline (devreview: 75.7/65.9/87.6/77.5)
        // to allow headroom while still gating regressions.
        statements: 72,
        branches: 62,
        functions: 84,
        lines: 74,
      },
    },
  },
});
