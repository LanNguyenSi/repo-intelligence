import { defineConfig } from 'vitest/config';
export default defineConfig({
  cacheDir: '.vitest-cache',
  test: {
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.d.ts', 'src/test-support/**'],
      thresholds: {
        // Ratcheted a few points below the measured baseline so a real
        // regression fails `npm test` while normal churn has headroom.
        statements: 80,
        branches: 66,
        functions: 93,
        lines: 82,
      },
    },
  },
});
