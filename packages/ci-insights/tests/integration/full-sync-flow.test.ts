/**
 * Integration test: Full sync flow
 * Mock GitHub API → ingestRepo → analytics queries → verify results
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock GitHub API layer
vi.mock("@/lib/github/workflows", () => ({
  listWorkflows: vi.fn(),
  listWorkflowRuns: vi.fn(),
  listJobsForRun: vi.fn(),
}));

// Mock Prisma with in-memory store
const store = {
  repos: new Map<string, object>(),
  workflows: new Map<string, object>(),
  runs: new Map<string, object>(),
  jobs: new Map<string, object>(),
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    repo: {
      upsert: vi.fn(({ create }: { create: object }) => {
        const repo = { id: "repo-1", ...create };
        store.repos.set("owner/repo", repo);
        return Promise.resolve(repo);
      }),
      update: vi.fn((args: { where: { id: string }; data?: object }) => {
        const repo = store.repos.get("owner/repo");
        return Promise.resolve({ ...repo, ...(args.data ?? {}) });
      }),
      findUnique: vi.fn(({ where }: { where: { fullName?: string } }) => {
        if (where.fullName) return Promise.resolve(store.repos.get(where.fullName) ?? null);
        return Promise.resolve(null);
      }),
      findMany: vi.fn(() => Promise.resolve([...store.repos.values()])),
    },
    workflow: {
      upsert: vi.fn(({ create }: { create: object }) => {
        const wf = { id: "wf-1", ...create };
        store.workflows.set("wf-1", wf);
        return Promise.resolve(wf);
      }),
    },
    workflowRun: {
      findUnique: vi.fn(() => Promise.resolve(null)), // not stored yet
      create: vi.fn((args: { data: object }) => {
        const run = { id: `run-${store.runs.size + 1}`, ...args.data };
        store.runs.set((run as { id: string }).id, run);
        return Promise.resolve(run);
      }),
      findMany: vi.fn(() => Promise.resolve([...store.runs.values()])),
    },
    jobRun: {
      create: vi.fn((args: { data: object }) => {
        const job = { id: `job-${store.jobs.size + 1}`, ...args.data };
        store.jobs.set((job as { id: string }).id, job);
        return Promise.resolve(job);
      }),
    },
  },
}));

import { ingestRepo } from "@/lib/ingestion/ingest";
import { listWorkflows, listWorkflowRuns, listJobsForRun } from "@/lib/github/workflows";

const mockWorkflows = listWorkflows as ReturnType<typeof vi.fn>;
const mockRuns = listWorkflowRuns as ReturnType<typeof vi.fn>;
const mockJobs = listJobsForRun as ReturnType<typeof vi.fn>;

const githubWorkflow = { id: 1, name: "CI", path: ".github/workflows/ci.yml", state: "active" };

const makeGitHubRun = (id: number, conclusion: string, branch = "main", sha = `sha${id}`) => ({
  id,
  run_number: id,
  workflow_id: 1,
  name: "CI",
  event: "push",
  status: "completed",
  conclusion,
  head_branch: branch,
  head_sha: sha,
  head_commit_message: `commit ${id}`,
  run_started_at: "2026-03-28T10:00:00Z",
  created_at: "2026-03-28T10:00:00Z",
  updated_at: "2026-03-28T10:05:00Z",
});

const makeGitHubJob = (id: number, runId: number, conclusion: string) => ({
  id,
  run_id: runId,
  name: "build",
  status: "completed",
  conclusion,
  started_at: "2026-03-28T10:00:30Z",
  completed_at: "2026-03-28T10:04:30Z",
  runner_name: "ubuntu-latest",
  steps: [],
});

beforeEach(() => {
  vi.clearAllMocks();
  store.repos.clear();
  store.workflows.clear();
  store.runs.clear();
  store.jobs.clear();
});

describe("Full sync flow", () => {
  it("ingests workflows + runs + jobs end-to-end", async () => {
    mockWorkflows.mockResolvedValue([githubWorkflow]);
    mockRuns.mockResolvedValue([
      makeGitHubRun(101, "success"),
      makeGitHubRun(102, "failure"),
      makeGitHubRun(103, "success"),
    ]);
    mockJobs.mockResolvedValue([makeGitHubJob(201, 101, "success")]);

    const result = await ingestRepo("owner", "repo", { token: "test" });

    expect(result.workflowsProcessed).toBe(1);
    expect(result.runsIngested).toBe(3);
    expect(result.runsSkipped).toBe(0);
    expect(result.jobsIngested).toBe(3); // 1 job per run (mock returns same job)
    expect(result.errors).toHaveLength(0);
  });

  it("second sync skips already-stored runs (idempotency)", async () => {
    const { prisma } = await import("@/lib/prisma");
    const mp = prisma as unknown as { workflowRun: { findUnique: ReturnType<typeof vi.fn> } };

    mockWorkflows.mockResolvedValue([githubWorkflow]);
    mockRuns.mockResolvedValue([makeGitHubRun(101, "success")]);
    mockJobs.mockResolvedValue([]);

    // First sync: not stored
    mp.workflowRun.findUnique.mockResolvedValueOnce(null);
    const first = await ingestRepo("owner", "repo", { token: "test", fetchJobs: false });
    expect(first.runsIngested).toBe(1);

    // Second sync: already stored
    mp.workflowRun.findUnique.mockResolvedValue({ id: "run-1" });
    const second = await ingestRepo("owner", "repo", { token: "test", fetchJobs: false });
    expect(second.runsIngested).toBe(0);
    expect(second.runsSkipped).toBe(1);
  });

  it("handles multiple workflows in one repo — workflowsProcessed counts correctly", async () => {
    mockWorkflows.mockResolvedValue([
      githubWorkflow,
      { id: 2, name: "Deploy", path: ".github/workflows/deploy.yml", state: "active" },
    ]);
    mockRuns.mockResolvedValue([]); // no runs — just test workflow counting
    mockJobs.mockResolvedValue([]);

    const result = await ingestRepo("owner", "repo", { token: "test", fetchJobs: false });
    expect(result.workflowsProcessed).toBe(2);
    expect(result.errors).toHaveLength(0);
  });

  it("collects partial errors without aborting full sync", async () => {
    mockWorkflows.mockResolvedValue([
      githubWorkflow,
      { id: 2, name: "Deploy", path: ".github/workflows/deploy.yml", state: "active" },
    ]);
    // First workflow: no runs. Second workflow: fails on listWorkflowRuns
    mockRuns
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error("GitHub 404: workflow not found"));
    mockJobs.mockResolvedValue([]);

    const result = await ingestRepo("owner", "repo", { token: "test", fetchJobs: false });
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("GitHub 404");
  });
});
