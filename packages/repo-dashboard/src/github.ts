// ============================================================================
// repo-dashboard — GitHub API Client
// ============================================================================

import { Octokit } from "@octokit/rest";

export interface RepoInfo {
  name: string;
  fullName: string;
  description: string | null;
  language: string | null;
  isPrivate: boolean;
  defaultBranch: string;
  updatedAt: string;
  openIssues: number;
  stars: number;
  url: string;
}

export interface PRInfo {
  number: number;
  title: string;
  repo: string;
  author: string;
  state: string;
  draft: boolean;
  createdAt: string;
  updatedAt: string;
  url: string;
}

export interface WorkflowRunInfo {
  repo: string;
  name: string;
  status: string;
  conclusion: string | null;
  branch: string;
  commitMessage: string;
  updatedAt: string;
  url: string;
}

export class GitHubDashboard {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  async getRepos(owner: string): Promise<RepoInfo[]> {
    const repos = await this.octokit.repos.listForUser({
      username: owner,
      sort: "updated",
      per_page: 100,
    });

    return repos.data.map((r) => ({
      name: r.name,
      fullName: r.full_name,
      description: r.description ?? null,
      language: r.language ?? null,
      isPrivate: r.private,
      defaultBranch: r.default_branch ?? "main",
      updatedAt: r.updated_at ?? "",
      openIssues: r.open_issues_count ?? 0,
      stars: r.stargazers_count ?? 0,
      url: r.html_url,
    }));
  }

  async getOpenPRs(owner: string, repos?: string[]): Promise<PRInfo[]> {
    const allPRs: PRInfo[] = [];
    const repoList = repos || (await this.getRepos(owner)).map((r) => r.name);

    for (const repo of repoList.slice(0, 30)) {
      try {
        const prs = await this.octokit.pulls.list({
          owner,
          repo,
          state: "open",
          per_page: 10,
        });

        for (const pr of prs.data) {
          allPRs.push({
            number: pr.number,
            title: pr.title,
            repo,
            author: pr.user?.login || "unknown",
            state: pr.draft ? "draft" : "open",
            draft: pr.draft || false,
            createdAt: pr.created_at,
            updatedAt: pr.updated_at,
            url: pr.html_url,
          });
        }
      } catch {
        // Skip repos without access
      }
    }

    return allPRs;
  }

  async getLatestWorkflowRuns(owner: string, repos?: string[]): Promise<WorkflowRunInfo[]> {
    const runs: WorkflowRunInfo[] = [];
    const repoList = repos || (await this.getRepos(owner)).map((r) => r.name);

    for (const repo of repoList.slice(0, 20)) {
      try {
        const result = await this.octokit.actions.listWorkflowRunsForRepo({
          owner,
          repo,
          per_page: 1,
        });

        if (result.data.workflow_runs.length > 0) {
          const run = result.data.workflow_runs[0];
          runs.push({
            repo,
            name: run.name || "CI",
            status: run.status || "unknown",
            conclusion: run.conclusion,
            branch: run.head_branch || "unknown",
            commitMessage: run.head_commit?.message?.split("\n")[0] || "",
            updatedAt: run.updated_at,
            url: run.html_url,
          });
        }
      } catch {
        // Skip repos without actions
      }
    }

    return runs;
  }
}
