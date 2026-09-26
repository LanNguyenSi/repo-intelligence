import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Restrict collection to source tests. Without this, once `dist/`
    // exists (any local or CI build), vitest's default glob also picks up
    // the tsc-compiled dist/*.test.js copies next to src/*.test.ts and
    // runs every test twice.
    include: ["src/**/*.test.ts"],
  },
});
