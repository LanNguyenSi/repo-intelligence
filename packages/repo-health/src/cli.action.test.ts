// ============================================================================
// repo-health/src/cli.ts: .action() handler behavior
//
// runHealthCheck and the display helpers are mocked; process.exit is replaced
// by a throwing stub so the handler stops where the real process would.
// Commander keeps option values on the Command between parses, so every test
// loads a fresh copy of cli.ts.
//
// MUTATION: flip `if (options.json)` -> --json test fails
// MUTATION: flip `report.score < min` -> min-score gate tests fail
// ============================================================================

import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const runHealthCheck = vi.fn();
const displayReport = vi.fn();
const displayJSON = vi.fn();

class ExitSignal extends Error {
  constructor(public code: number | string | null | undefined) {
    super(`exit ${code}`);
  }
}

const report = { path: "/x", checks: [], score: 6, grade: "C", summary: "ok" };

async function runCli(args: string[]) {
  vi.resetModules();
  vi.doMock("./checks.js", () => ({ runHealthCheck }));
  vi.doMock("./display.js", () => ({ displayReport, displayJSON }));
  const { program } = await import("./cli.js");
  await program.parseAsync(["node", "repo-health", ...args]);
}

let errSpy: ReturnType<typeof vi.spyOn>;
let exitSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  runHealthCheck.mockReturnValue(report);
  errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
    throw new ExitSignal(code);
  }) as never);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("repo-health CLI action: output", () => {
  it("resolves the path argument and renders the text report by default", async () => {
    await runCli(["some/dir"]);

    expect(runHealthCheck).toHaveBeenCalledWith(resolve("some/dir"));
    expect(displayReport).toHaveBeenCalledWith(report);
    expect(displayJSON).not.toHaveBeenCalled();
  });

  it("--json renders the JSON report instead of the text report", async () => {
    await runCli(["some/dir", "--json"]);

    expect(displayJSON).toHaveBeenCalledWith(report);
    expect(displayReport).not.toHaveBeenCalled();
  });
});

describe("repo-health CLI action: --min-score gate", () => {
  it("exits 1 when the score is below the minimum", async () => {
    await expect(runCli([".", "--min-score", "7"])).rejects.toMatchObject({ code: 1 });

    expect(errSpy).toHaveBeenCalledWith("Score 6 is below minimum 7");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("does not exit when the score meets the minimum", async () => {
    await runCli([".", "--min-score", "6"]);

    expect(exitSpy).not.toHaveBeenCalled();
    expect(errSpy).not.toHaveBeenCalled();
  });
});

describe("repo-health CLI action: error path", () => {
  it("rejects an invalid --min-score value with its message and no exit call", async () => {
    await expect(runCli([".", "--min-score", "abc"])).rejects.toThrow(/Invalid --min-score value "abc"/);

    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("propagates a failure from the health check", async () => {
    runHealthCheck.mockImplementation(() => {
      throw new Error("unreadable repo");
    });

    await expect(runCli(["."])).rejects.toThrow("unreadable repo");
    expect(displayReport).not.toHaveBeenCalled();
  });
});
