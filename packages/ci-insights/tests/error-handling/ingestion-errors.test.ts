/**
 * Error handling tests for ingestion layer
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/github/workflows", () => ({
  listWorkflows: vi.fn(),
  listWorkflowRuns: vi.fn(),
  listJobsForRun: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    repo: {
      upsert: vi.fn().mockResolvedValue({ id: "repo-1", fullName: "owner/repo", owner: "owner", name: "repo" }),
      update: vi.fn().mockResolvedValue({}),
    },
    workflow: { upsert: vi.fn().mockResolvedValue({ id: "wf-1" }) },
    workflowRun: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "run-1" }),
    },
    jobRun: { create: vi.fn().mockResolvedValue({ id: "job-1" }) },
  },
}));

import { ingestRepo } from "@/lib/ingestion/ingest";
import { listWorkflows, listWorkflowRuns, listJobsForRun } from "@/lib/github/workflows";

const mockWf = listWorkflows as ReturnType<typeof vi.fn>;
const mockRuns = listWorkflowRuns as ReturnType<typeof vi.fn>;
const mockJobs = listJobsForRun as ReturnType<typeof vi.fn>;

const fakeWorkflow = { id: 1, name: "CI", path: ".github/workflows/ci.yml", state: "active" };
const fakeRun = {
  id: 1001, run_number: 1, workflow_id: 1, name: "CI", event: "push",
  status: "completed", conclusion: "success", head_branch: "main",
  head_sha: "abc", head_commit_message: "fix", run_started_at: "2026-03-28T10:00:00Z",
  created_at: "2026-03-28T10:00:00Z", updated_at: "2026-03-28T10:05:00Z",
};

beforeEach(() => vi.clearAllMocks());

describe("Ingestion error handling", () => {
  it("GitHub 403 (rate limit) → error in result.errors, does not throw", async () => {
    mockWf.mockRejectedValue(Object.assign(new Error("403 Forbidden"), { status: 403 }));
    const result = await ingestRepo("owner", "repo", { token: "test" });
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("403");
    expect(result.runsIngested).toBe(0);
  });

  it("GitHub 404 (repo not found) → clear error message", async () => {
    mockWf.mockRejectedValue(Object.assign(new Error("404 Not Found"), { status: 404 }));
    const result = await ingestRepo("owner", "notexist", { token: "test" });
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("404");
  });

  it("Run list fails for one workflow but others continue", async () => {
    mockWf.mockResolvedValue([fakeWorkflow, { id: 2, name: "Deploy", path: ".github/workflows/deploy.yml", state: "active" }]);
    mockRuns
      .mockResolvedValueOnce([fakeRun])
      .mockRejectedValueOnce(new Error("Rate limit exceeded"));
    mockJobs.mockResolvedValue([]);
    const result = await ingestRepo("owner", "repo", { token: "test", fetchJobs: false });
    expect(result.runsIngested).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("Rate limit");
  });

  it("Job fetch fails → error collected, run still counted as ingested", async () => {
    mockWf.mockResolvedValue([fakeWorkflow]);
    mockRuns.mockResolvedValue([fakeRun]);
    mockJobs.mockRejectedValue(new Error("Job API error"));
    const result = await ingestRepo("owner", "repo", { token: "test", fetchJobs: true });
    expect(result.runsIngested).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("Job API error");
  });

  it("Empty workflow list → returns result with 0 runs, no errors", async () => {
    mockWf.mockResolvedValue([]);
    const result = await ingestRepo("owner", "repo", { token: "test" });
    expect(result.workflowsProcessed).toBe(0);
    expect(result.runsIngested).toBe(0);
    expect(result.errors).toHaveLength(0);
  });
});
