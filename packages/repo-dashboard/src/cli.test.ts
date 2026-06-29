// ============================================================================
// Gap 5 (MED): repo-dashboard/src/cli.ts — arg/command dispatch
//
// The cli.ts has an ESM entrypoint guard so it can be imported safely.
// Tests verify the program is configured correctly (name, commands, options).
// The guard itself is the production seam: without it, importing cli.ts
// would immediately call program.parse() and crash the test runner.
// ============================================================================

import { describe, it, expect } from "vitest";
import { program } from "./cli.js";

describe("repo-dash CLI — program configuration", () => {
  it("has the correct name and version", () => {
    expect(program.name()).toBe("repo-dash");
    expect(program.version()).toBe("0.1.0");
  });

  it("accepts [owner] argument with LanNguyenSi default", () => {
    const argDefs = program.registeredArguments;
    expect(argDefs).toHaveLength(1);
    expect(argDefs[0].name()).toBe("owner");
    expect(argDefs[0].defaultValue).toBe("LanNguyenSi");
  });

  it("has --token, --repos, --prs, --ci, and --json options", () => {
    const optNames = program.options.map((o) => o.long);
    expect(optNames).toContain("--token");
    expect(optNames).toContain("--repos");
    expect(optNames).toContain("--prs");
    expect(optNames).toContain("--ci");
    expect(optNames).toContain("--json");
  });

  it("--repos defaults to '10'", () => {
    const reposOpt = program.options.find((o) => o.long === "--repos");
    expect(reposOpt?.defaultValue).toBe("10");
  });
});
