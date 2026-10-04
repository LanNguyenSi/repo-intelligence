import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    env: {
      NODE_ENV: "test",
    },
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/**/*.d.ts", "src/test-support/**"],
      thresholds: {
        // Ratcheted a few points below the measured baseline so a real
        // regression fails `npm test` while normal churn has headroom.
        statements: 67,
        branches: 59,
        functions: 63,
        lines: 66,
      },
    },
  },
});
