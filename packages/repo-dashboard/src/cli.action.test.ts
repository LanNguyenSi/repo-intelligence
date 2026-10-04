// ============================================================================
// repo-dashboard/src/cli.ts: .action() handler behavior
//
// The GitHub client and display helpers are mocked; process.exit is replaced
// by a throwing stub so the handler stops where the real process would.
// Commander keeps option values on the Command between parses, so every test
// loads a fresh copy of cli.ts.
//
// MUTATION: remove the `if (!token)` guard -> token-guard tests fail
// MUTATION: flip `if (options.json)` -> --json test fails
// ============================================================================

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getRepos = vi.fn();
const getOpenPRs = vi.fn();
const getLatestWorkflowRuns = vi.fn();
const ctor = vi.fn();
const display = {
  displayHeader: vi.fn(),
  displayRepos: vi.fn(),
  displayPRs: vi.fn(),
  displayPipelines: vi.fn(),
  displaySummary: vi.fn(),
};

class ExitSignal extends Error {
  constructor(public code: number | string | null | undefined) {
    super(`exit ${code}`);
  }
}

async function runCli(args: string[]) {
  vi.resetModules();
  vi.doMock("./github.js", () => ({
    GitHubDashboard: class {
      constructor(token: string) {
        ctor(token);
      }
      getRepos = getRepos;
      getOpenPRs = getOpenPRs;
      getLatestWorkflowRuns = getLatestWorkflowRuns;
    },
  }));
  vi.doMock("./display.js", () => display);
  const { program } = await import("./cli.js");
  await program.parseAsync(["node", "repo-dash", ...args]);
}

let logSpy: ReturnType<typeof vi.spyOn>;
let errSpy: ReturnType<typeof vi.spyOn>;
let exitSpy: ReturnType<typeof vi.spyOn>;
const savedToken = process.env.GITHUB_TOKEN;

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.GITHUB_TOKEN;
  getRepos.mockResolvedValue([{ name: "rocket" }]);
  getOpenPRs.mockResolvedValue([{ number: 1 }]);
  getLatestWorkflowRuns.mockResolvedValue([{ id: 7 }]);
  logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
    throw new ExitSignal(code);
  }) as never);
});

afterEach(() => {
  vi.restoreAllMocks();
  if (savedToken === undefined) delete process.env.GITHUB_TOKEN;
  else process.env.GITHUB_TOKEN = savedToken;
});

describe("repo-dash CLI action: token guard", () => {
  it("exits 1 with a message and never builds the client when no token is given", async () => {
    await expect(runCli(["acme"])).rejects.toMatchObject({ code: 1 });

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining("GitHub token required"));
    expect(ctor).not.toHaveBeenCalled();
    expect(getRepos).not.toHaveBeenCalled();
  });

  it("accepts the token from GITHUB_TOKEN", async () => {
    process.env.GITHUB_TOKEN = "env-token";
    await runCli(["acme", "--json"]);

    expect(ctor).toHaveBeenCalledWith("env-token");
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("prefers --token over GITHUB_TOKEN", async () => {
    process.env.GITHUB_TOKEN = "env-token";
    await runCli(["acme", "--token", "flag-token", "--json"]);

    expect(ctor).toHaveBeenCalledWith("flag-token");
  });
});

describe("repo-dash CLI action: output", () => {
  it("--json prints the combined payload and skips the display helpers", async () => {
    await runCli(["acme", "--token", "t", "--json"]);

    expect(getRepos).toHaveBeenCalledWith("acme");
    expect(getOpenPRs).toHaveBeenCalledWith("acme");
    expect(getLatestWorkflowRuns).toHaveBeenCalledWith("acme");
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(JSON.parse(logSpy.mock.calls[0][0] as string)).toEqual({
      repos: [{ name: "rocket" }],
      prs: [{ number: 1 }],
      runs: [{ id: 7 }],
    });
    expect(display.displayHeader).not.toHaveBeenCalled();
    expect(display.displayRepos).not.toHaveBeenCalled();
  });

  it("without --json renders the full dashboard", async () => {
    await runCli(["acme", "--token", "t", "--repos", "3"]);

    expect(logSpy).not.toHaveBeenCalled();
    expect(display.displayHeader).toHaveBeenCalledWith("acme");
    expect(display.displayRepos).toHaveBeenCalledWith([{ name: "rocket" }], 3);
    expect(display.displayPRs).toHaveBeenCalledTimes(1);
    expect(display.displayPipelines).toHaveBeenCalledTimes(1);
    expect(display.displaySummary).toHaveBeenCalledTimes(1);
  });

  it("--prs shows only PRs", async () => {
    await runCli(["acme", "--token", "t", "--prs"]);

    expect(display.displayPRs).toHaveBeenCalledTimes(1);
    expect(display.displayRepos).not.toHaveBeenCalled();
    expect(display.displayPipelines).not.toHaveBeenCalled();
    expect(display.displaySummary).not.toHaveBeenCalled();
  });

  it("--ci shows only pipelines", async () => {
    await runCli(["acme", "--token", "t", "--ci"]);

    expect(display.displayPipelines).toHaveBeenCalledTimes(1);
    expect(display.displayPRs).not.toHaveBeenCalled();
    expect(display.displayRepos).not.toHaveBeenCalled();
  });
});

describe("repo-dash CLI action: error path", () => {
  it("prints the error message and exits 1 when a fetch fails", async () => {
    getOpenPRs.mockRejectedValue(new Error("rate limited"));

    await expect(runCli(["acme", "--token", "t"])).rejects.toMatchObject({ code: 1 });

    expect(errSpy).toHaveBeenCalledWith("Error:", "rate limited");
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(display.displayHeader).not.toHaveBeenCalled();
  });

  it("prints a non-Error rejection value as is", async () => {
    getRepos.mockRejectedValue("boom");

    await expect(runCli(["acme", "--token", "t"])).rejects.toMatchObject({ code: 1 });

    expect(errSpy).toHaveBeenCalledWith("Error:", "boom");
  });
});
