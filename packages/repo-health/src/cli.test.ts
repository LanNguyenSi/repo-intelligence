// ============================================================================
// Gap 9 (LOW): repo-health/src/cli.ts — CLI wiring
//
// Production seam: ESM entrypoint guard + exported `program` constant allow
// importing cli.ts without executing program.parse().
// ============================================================================

import { describe, it, expect } from "vitest";
import { program } from "./cli.js";

describe("repo-health CLI — program configuration", () => {
  it("has the correct name and version", () => {
    expect(program.name()).toBe("repo-health");
    expect(program.version()).toBe("0.1.0");
  });

  it("accepts an optional [path] argument defaulting to '.'", () => {
    const args = program.registeredArguments;
    expect(args).toHaveLength(1);
    expect(args[0].name()).toBe("path");
    expect(args[0].defaultValue).toBe(".");
  });

  it("has --json and --min-score options", () => {
    const optNames = program.options.map((o) => o.long);
    expect(optNames).toContain("--json");
    expect(optNames).toContain("--min-score");
  });

  it("--json defaults to false", () => {
    const jsonOpt = program.options.find((o) => o.long === "--json");
    expect(jsonOpt?.defaultValue).toBe(false);
  });
});
