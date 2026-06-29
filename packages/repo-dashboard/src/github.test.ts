// ============================================================================
// Gap 5 (MED): repo-dashboard/src/github.ts — GitHubDashboard
//
// Tests: getRepos, getOpenPRs, getLatestWorkflowRuns
// Mocks the Octokit REST client injected via dependency.
// ============================================================================

import { describe, it, expect, vi } from "vitest";
import { GitHubDashboard } from "./github.js";

// ---------------------------------------------------------------------------
// Octokit mock factory
// ---------------------------------------------------------------------------

function makeOctokit(overrides: Record<string, unknown> = {}) {
  return {
    repos: {
      listForUser: vi.fn().mockResolvedValue({
        data: [
          {
            name: "rocket",
            full_name: "acme/rocket",
            description: "A fast rocket",
            language: "TypeScript",
            private: false,
            default_branch: "main",
            updated_at: "2024-01-15T12:00:00Z",
            open_issues_count: 3,
            stargazers_count: 42,
            html_url: "https://github.com/acme/rocket",
          },
        ],
      }),
    },
    pulls: {
      list: vi.fn().mockResolvedValue({ data: [] }),
    },
    actions: {
      listWorkflowRunsForRepo: vi.fn().mockResolvedValue({
        data: { workflow_runs: [] },
      }),
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// getRepos
// ---------------------------------------------------------------------------
describe("GitHubDashboard.getRepos", () => {
  it("returns mapped RepoInfo array from Octokit response", async () => {
    const octokit = makeOctokit();
    const dashboard = new GitHubDashboard("token", octokit as never);

    const repos = await dashboard.getRepos("acme");

    expect(octokit.repos.listForUser).toHaveBeenCalledWith({
      username: "acme",
      sort: "updated",
      per_page: 100,
    });

    expect(repos).toHaveLength(1);
    expect(repos[0]).toMatchObject({
      name: "rocket",
      fullName: "acme/rocket",
      description: "A fast rocket",
      language: "TypeScript",
      isPrivate: false,
      defaultBranch: "main",
      openIssues: 3,
      stars: 42,
      url: "https://github.com/acme/rocket",
    });
  });

  it("maps null description and language correctly", async () => {
    const octokit = makeOctokit({
      repos: {
        listForUser: vi.fn().mockResolvedValue({
          data: [
            {
              name: "minimal",
              full_name: "acme/minimal",
              description: null,
              language: null,
              private: true,
              default_branch: "master",
              updated_at: "2024-01-01T00:00:00Z",
              open_issues_count: 0,
              stargazers_count: 0,
              html_url: "https://github.com/acme/minimal",
            },
          ],
        }),
      },
    });
    const dashboard = new GitHubDashboard("token", octokit as never);
    const repos = await dashboard.getRepos("acme");

    expect(repos[0].description).toBeNull();
    expect(repos[0].language).toBeNull();
    expect(repos[0].isPrivate).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getOpenPRs
// ---------------------------------------------------------------------------
describe("GitHubDashboard.getOpenPRs", () => {
  it("returns mapped PRInfo for each open PR across repos", async () => {
    const octokit = makeOctokit({
      pulls: {
        list: vi.fn().mockResolvedValue({
          data: [
            {
              number: 7,
              title: "feat: add pagination",
              user: { login: "dev" },
              draft: false,
              created_at: "2024-02-01T10:00:00Z",
              updated_at: "2024-02-02T10:00:00Z",
              html_url: "https://github.com/acme/rocket/pull/7",
            },
          ],
        }),
      },
    });
    const dashboard = new GitHubDashboard("token", octokit as never);

    const prs = await dashboard.getOpenPRs("acme", ["rocket"]);

    expect(prs).toHaveLength(1);
    expect(prs[0]).toMatchObject({
      number: 7,
      title: "feat: add pagination",
      repo: "rocket",
      author: "dev",
      state: "open",
      draft: false,
    });
  });

  it("marks draft PRs with state draft", async () => {
    const octokit = makeOctokit({
      pulls: {
        list: vi.fn().mockResolvedValue({
          data: [
            {
              number: 8,
              title: "WIP: draft pr",
              user: { login: "dev" },
              draft: true,
              created_at: "2024-02-01T10:00:00Z",
              updated_at: "2024-02-01T10:00:00Z",
              html_url: "https://github.com/acme/rocket/pull/8",
            },
          ],
        }),
      },
    });
    const dashboard = new GitHubDashboard("token", octokit as never);
    const prs = await dashboard.getOpenPRs("acme", ["rocket"]);
    expect(prs[0].state).toBe("draft");
    expect(prs[0].draft).toBe(true);
  });

  it("skips repos that throw (e.g. no access)", async () => {
    const octokit = makeOctokit({
      pulls: {
        list: vi.fn().mockRejectedValue(new Error("403 Forbidden")),
      },
    });
    const dashboard = new GitHubDashboard("token", octokit as never);
    // Should not throw — just skips the failing repo
    const prs = await dashboard.getOpenPRs("acme", ["private-repo"]);
    expect(prs).toHaveLength(0);
  });

  it("uses null as author when user is absent", async () => {
    const octokit = makeOctokit({
      pulls: {
        list: vi.fn().mockResolvedValue({
          data: [
            {
              number: 9,
              title: "bot pr",
              user: null,
              draft: false,
              created_at: "2024-02-01T10:00:00Z",
              updated_at: "2024-02-01T10:00:00Z",
              html_url: "https://github.com/acme/rocket/pull/9",
            },
          ],
        }),
      },
    });
    const dashboard = new GitHubDashboard("token", octokit as never);
    const prs = await dashboard.getOpenPRs("acme", ["rocket"]);
    expect(prs[0].author).toBe("unknown");
  });
});

// ---------------------------------------------------------------------------
// getLatestWorkflowRuns
// ---------------------------------------------------------------------------
describe("GitHubDashboard.getLatestWorkflowRuns", () => {
  it("returns mapped WorkflowRunInfo for repos that have runs", async () => {
    const octokit = makeOctokit({
      actions: {
        listWorkflowRunsForRepo: vi.fn().mockResolvedValue({
          data: {
            workflow_runs: [
              {
                name: "CI",
                status: "completed",
                conclusion: "success",
                head_branch: "main",
                head_commit: { message: "fix: a bug\n\nLong body here" },
                updated_at: "2024-03-01T12:00:00Z",
                html_url: "https://github.com/acme/rocket/actions/runs/1",
              },
            ],
          },
        }),
      },
    });
    const dashboard = new GitHubDashboard("token", octokit as never);
    const runs = await dashboard.getLatestWorkflowRuns("acme", ["rocket"]);

    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({
      repo: "rocket",
      name: "CI",
      status: "completed",
      conclusion: "success",
      branch: "main",
      commitMessage: "fix: a bug", // only the first line
    });
  });

  it("returns empty array when no workflow runs exist for a repo", async () => {
    const octokit = makeOctokit({
      actions: {
        listWorkflowRunsForRepo: vi.fn().mockResolvedValue({
          data: { workflow_runs: [] },
        }),
      },
    });
    const dashboard = new GitHubDashboard("token", octokit as never);
    const runs = await dashboard.getLatestWorkflowRuns("acme", ["rocket"]);
    expect(runs).toHaveLength(0);
  });

  it("skips repos whose actions API throws", async () => {
    const octokit = makeOctokit({
      actions: {
        listWorkflowRunsForRepo: vi.fn().mockRejectedValue(new Error("no actions")),
      },
    });
    const dashboard = new GitHubDashboard("token", octokit as never);
    const runs = await dashboard.getLatestWorkflowRuns("acme", ["private"]);
    expect(runs).toHaveLength(0);
  });
});
