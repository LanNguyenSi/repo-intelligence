import { describe, it, expect } from "vitest";
import { loadConfig } from "../src/lib/config.js";

describe("Config", () => {
  it("returns default config when no config file exists", () => {
    const config = loadConfig();
    expect(config.threshold).toBe(10);
    expect(config.directories).toContain("dist");
    expect(config.directories).toContain("build");
  });
});
