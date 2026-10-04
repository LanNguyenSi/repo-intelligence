// Behaviour tests for src/display.ts: each exported renderer is called and the
// text it prints is asserted, covering the formatting branches and empty states.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  displayHeader,
  displayPipelines,
  displayPRs,
  displayRepos,
  displaySummary,
} from "./display.js";
import type { PRInfo, RepoInfo, WorkflowRunInfo } from "./github.js";

const NOW = new Date("2024-06-01T12:00:00Z");

// Strip ANSI colour codes so assertions do not depend on chalk's colour level.
// eslint-disable-next-line no-control-regex
const ANSI = /\u001b\[[0-9;]*m/g;

function capture(fn: () => void): string[] {
  const spy = vi.spyOn(console, "log").mockImplementation(() => {});
  try {
    fn();
    return spy.mock.calls.map((args) => args.map(String).join(" ").replace(ANSI, ""));
  } finally {
    spy.mockRestore();
  }
}

function ago(ms: number): string {
  return new Date(NOW.getTime() - ms).toISOString();
}
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

function repo(overrides: Partial<RepoInfo> = {}): RepoInfo {
  return {
    name: "rocket",
    fullName: "acme/rocket",
    description: null,
    language: "TypeScript",
    isPrivate: false,
    defaultBranch: "main",
    updatedAt: ago(5 * MIN),
    openIssues: 0,
    stars: 0,
    url: "https://github.com/acme/rocket",
    ...overrides,
  };
}

function pr(overrides: Partial<PRInfo> = {}): PRInfo {
  return {
    number: 7,
    title: "feat: add thing",
    repo: "rocket",
    author: "alice",
    state: "open",
    draft: false,
    createdAt: ago(2 * HOUR),
    updatedAt: ago(HOUR),
    url: "https://github.com/acme/rocket/pull/7",
    ...overrides,
  };
}

function run(overrides: Partial<WorkflowRunInfo> = {}): WorkflowRunInfo {
  return {
    repo: "rocket",
    name: "CI",
    status: "completed",
    conclusion: "success",
    branch: "main",
    commitMessage: "fix: something",
    updatedAt: ago(10 * MIN),
    url: "https://github.com/acme/rocket/actions/runs/1",
    ...overrides,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("displayHeader", () => {
  it("prints the owner in the title between blank lines", () => {
    const out = capture(() => displayHeader("acme"));
    expect(out).toHaveLength(4);
    expect(out[0]).toBe("");
    expect(out[1]).toBe("  📊 repo-dashboard — acme");
    expect(out[2]).toBe(`  ${NOW.toLocaleString()}`);
    expect(out[3]).toBe("");
  });
});

describe("displayRepos", () => {
  it("prints the totals line with the shown count capped by the limit", () => {
    const repos = Array.from({ length: 4 }, (_, i) => repo({ name: `r${i}` }));
    const out = capture(() => displayRepos(repos, 2));
    expect(out[0]).toBe("  Repositories (4 total, showing 2 most recent)");
    const rows = out.filter((l) => l.includes("TypeScript"));
    expect(rows).toHaveLength(2);
    expect(out.join("\n")).not.toContain("r2");
  });

  it("shows all repos when fewer than the default limit of 10", () => {
    const out = capture(() => displayRepos([repo({ name: "only" })]));
    expect(out[0]).toBe("  Repositories (1 total, showing 1 most recent)");
  });

  it("defaults the limit to 10", () => {
    const repos = Array.from({ length: 12 }, (_, i) => repo({ name: `r${i}` }));
    const out = capture(() => displayRepos(repos));
    expect(out[0]).toBe("  Repositories (12 total, showing 10 most recent)");
    expect(out.filter((l) => l.includes("TypeScript"))).toHaveLength(10);
  });

  it("marks private and public repos with different icons", () => {
    const out = capture(() =>
      displayRepos([repo({ name: "priv", isPrivate: true }), repo({ name: "pub", isPrivate: false })]),
    );
    expect(out.find((l) => l.includes("priv"))).toContain("🔒");
    expect(out.find((l) => l.includes("pub"))).toContain("🔓");
  });

  it("shows issues and stars only when positive", () => {
    const out = capture(() =>
      displayRepos([
        repo({ name: "busy", openIssues: 3, stars: 42 }),
        repo({ name: "quiet", openIssues: 0, stars: 0 }),
      ]),
    );
    const busy = out.find((l) => l.includes("busy"))!;
    const quiet = out.find((l) => l.includes("quiet"))!;
    expect(busy).toContain(" 3 issues");
    expect(busy).toContain(" ⭐42");
    expect(quiet).not.toContain("issues");
    expect(quiet).not.toContain("⭐");
  });

  it("renders a dash for a missing language and the name for known and unknown ones", () => {
    const out = capture(() =>
      displayRepos([
        repo({ name: "nolang", language: null }),
        repo({ name: "ts", language: "Python" }),
        repo({ name: "odd", language: "Rust" }),
      ]),
    );
    expect(out.find((l) => l.includes("nolang"))).toContain("—");
    expect(out.find((l) => l.includes("ts"))).toContain("Python");
    expect(out.find((l) => l.includes("odd"))).toContain("Rust");
  });

  it("prints a description truncated to 70 chars, and none when absent", () => {
    const long = "x".repeat(100);
    const out = capture(() =>
      displayRepos([repo({ name: "withdesc", description: long }), repo({ name: "nodesc", description: null })]),
    );
    expect(out).toContain(`     ${"x".repeat(70)}`);
    expect(out.join("\n")).not.toContain("x".repeat(71));
    // 2 repo rows + 1 description row + header, blank, trailing blank
    expect(out).toHaveLength(6);
  });

  it("prints only the heading for an empty list", () => {
    const out = capture(() => displayRepos([]));
    expect(out[0]).toBe("  Repositories (0 total, showing 0 most recent)");
    expect(out).toHaveLength(3);
  });

  it("formats relative ages in minutes, hours and days", () => {
    const out = capture(() =>
      displayRepos([
        repo({ name: "m", updatedAt: ago(5 * MIN) }),
        repo({ name: "h", updatedAt: ago(3 * HOUR) }),
        repo({ name: "d", updatedAt: ago(2 * DAY + HOUR) }),
        repo({ name: "boundary-h", updatedAt: ago(60 * MIN) }),
        repo({ name: "boundary-d", updatedAt: ago(24 * HOUR) }),
      ]),
    );
    expect(out.find((l) => l.includes(" m "))).toMatch(/5m ago$/);
    expect(out.find((l) => l.includes(" h "))).toMatch(/3h ago$/);
    expect(out.find((l) => l.includes(" d "))).toMatch(/2d ago$/);
    expect(out.find((l) => l.includes("boundary-h"))).toMatch(/1h ago$/);
    expect(out.find((l) => l.includes("boundary-d"))).toMatch(/1d ago$/);
  });
});

describe("displayPRs", () => {
  it("prints the empty state when there are no PRs", () => {
    const out = capture(() => displayPRs([]));
    expect(out).toEqual(["  Open Pull Requests (0)", "", "  No open PRs 🎉", ""]);
  });

  it("prints number, title, repo, author and age for each PR", () => {
    const out = capture(() => displayPRs([pr(), pr({ number: 8, title: "fix: bug", author: "bob", createdAt: ago(3 * DAY) })]));
    expect(out[0]).toBe("  Open Pull Requests (2)");
    expect(out).toContain("  #7 feat: add thing");
    expect(out).toContain("     rocket by alice 2h ago");
    expect(out).toContain("  #8 fix: bug");
    expect(out).toContain("     rocket by bob 3d ago");
    expect(out.join("\n")).not.toContain("No open PRs");
  });

  it("flags only draft PRs", () => {
    const out = capture(() => displayPRs([pr({ title: "wip", draft: true }), pr({ number: 9, title: "ready", draft: false })]));
    expect(out).toContain("  #7 wip [draft]");
    expect(out).toContain("  #9 ready");
  });
});

describe("displayPipelines", () => {
  it("prints the empty state when there are no runs", () => {
    const out = capture(() => displayPipelines([]));
    expect(out).toEqual(["  Pipeline Status", "", "  No CI pipelines found", ""]);
  });

  it("counts passing, failed and running runs", () => {
    const out = capture(() =>
      displayPipelines([
        run({ repo: "a", conclusion: "success" }),
        run({ repo: "b", conclusion: "success" }),
        run({ repo: "c", conclusion: "failure" }),
        run({ repo: "d", status: "in_progress", conclusion: null }),
      ]),
    );
    expect(out).toContain("  2 passing · 1 failed · 1 running");
  });

  it("orders failed first, then running, then passing, with matching icons", () => {
    const out = capture(() =>
      displayPipelines([
        run({ repo: "pass", conclusion: "success" }),
        run({ repo: "run", status: "in_progress", conclusion: null }),
        run({ repo: "fail", conclusion: "failure" }),
      ]),
    );
    const rows = out.filter((l) => /^ {2}\S+ (pass|run|fail) /.test(l));
    expect(rows).toHaveLength(3);
    expect(rows[0]).toContain("❌");
    expect(rows[0]).toContain("fail");
    expect(rows[1]).toContain("⏳");
    expect(rows[1]).toContain("run");
    expect(rows[2]).toContain("✅");
    expect(rows[2]).toContain("pass");
  });

  it("shows at most five passing runs", () => {
    const runs = Array.from({ length: 8 }, (_, i) => run({ repo: `ok${i}` }));
    const out = capture(() => displayPipelines(runs));
    expect(out.filter((l) => l.includes("✅"))).toHaveLength(5);
    expect(out.join("\n")).toContain("8 passing");
    expect(out.join("\n")).not.toContain("ok5");
  });

  it("shows the in-progress icon even when a conclusion is present", () => {
    // Only failed, running and passing runs are listed, so the cancelled and
    // neutral icons are unreachable through the public API.
    const out = capture(() =>
      displayPipelines([run({ repo: "x", status: "in_progress", conclusion: "success" })]),
    );
    const row = out.find((l) => l.includes("x CI") || l.includes(" x "))!;
    expect(row).toContain("⏳");
  });

  it("truncates the commit message to 50 chars and prints its age", () => {
    const out = capture(() =>
      displayPipelines([run({ commitMessage: "c".repeat(80), updatedAt: ago(2 * DAY) })]),
    );
    const row = out.find((l) => l.includes("✅"))!;
    expect(row).toContain("c".repeat(50));
    expect(row).not.toContain("c".repeat(51));
    expect(row).toMatch(/2d ago$/);
  });
});

describe("displaySummary", () => {
  it("reports all green with no PR or failure lines", () => {
    const out = capture(() => displaySummary([repo()], [], [run()]));
    expect(out[0]).toBe("─".repeat(50));
    expect(out[1]).toBe("  Summary: 1 repos · 0 open PRs · all green");
    expect(out.join("\n")).not.toContain("waiting for review");
    expect(out.join("\n")).not.toContain("need attention");
    expect(out).toHaveLength(3);
  });

  it("reports failures and open PRs with their follow-up lines", () => {
    const out = capture(() =>
      displaySummary(
        [repo(), repo({ name: "b" })],
        [pr(), pr({ number: 8 }), pr({ number: 9 })],
        [run({ conclusion: "failure" }), run({ conclusion: "failure" }), run()],
      ),
    );
    expect(out[1]).toBe("  Summary: 2 repos · 3 open PRs · 2 failed");
    expect(out).toContain("  → 3 PR(s) waiting for review");
    expect(out).toContain("  → 2 pipeline(s) need attention");
  });

  it("prints only the PR line when PRs are open but nothing failed", () => {
    const out = capture(() => displaySummary([], [pr()], []));
    expect(out[1]).toContain("all green");
    expect(out).toContain("  → 1 PR(s) waiting for review");
    expect(out.join("\n")).not.toContain("need attention");
  });

  it("prints only the failure line when a pipeline failed but no PRs are open", () => {
    const out = capture(() => displaySummary([], [], [run({ conclusion: "failure" })]));
    expect(out[1]).toContain("1 failed");
    expect(out).toContain("  → 1 pipeline(s) need attention");
    expect(out.join("\n")).not.toContain("waiting for review");
  });
});
