import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    coverage: {
      provider: "v8",
      // Use natural coverage (files actually imported during tests).
      // Explicit include with app/**/*.ts over-counts untested routes.
      exclude: ["**/*.test.ts", "**/*.d.ts", "**/node_modules/**"],
      thresholds: {
        // Set a few points below the measured baseline (ci-insights: 88.9/77.1/89.1/91.3)
        // to allow headroom while still gating regressions.
        statements: 85,
        branches: 73,
        functions: 85,
        lines: 88,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
