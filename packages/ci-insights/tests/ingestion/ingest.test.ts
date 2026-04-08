import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    repo: {
      upsert: vi.fn(),
      update: vi.fn(),
    },
    workflow: {
      upsert: vi.fn(),
    },
    workflowRun: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    jobRun: {
      create: vi.fn(),
    },
  },
}));

// Mock GitHub API
vi.mock("@/lib/github/workflows", () => ({
  listWorkflows: vi.fn(),
  listWorkflowRuns: vi.fn(),
  listJobsForRun: vi.fn(),
}));

import { ingestRepo } from "@/lib/ingestion/ingest";
import { prisma } from "@/lib/prisma";
import { listWorkflows, listWorkflowRuns, listJobsForRun } from "@/lib/github/workflows";

const mockPrisma = prisma as unknown as {
  repo: { upsert: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  workflow: { upsert: ReturnType<typeof vi.fn> };
  workflowRun: { findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  jobRun: { create: ReturnType<typeof vi.fn> };
};

const mockListWorkflows = listWorkflows as ReturnType<typeof vi.fn>;
const mockListRuns = listWorkflowRuns as ReturnType<typeof vi.fn>;
const mockListJobs = listJobsForRun as ReturnType<typeof vi.fn>;

const fakeRepo = { id: "repo-1", fullName: "owner/repo", owner: "owner", name: "repo" };
const fakeWorkflow = { id: "wf-1", repoId: "repo-1", githubId: 42 };
const fakeRun = {
  id: 1001,
  run_number: 5,
  workflow_id: 42,
  name: "CI",
  event: "push",
  status: "completed",
  conclusion: "success",
  head_branch: "main",
  head_sha: "abc123",
  head_commit_message: "fix: something",
  run_started_at: "2026-03-28T10:00:00Z",
  created_at: "2026-03-28T10:00:00Z",
  updated_at: "2026-03-28T10:05:00Z",
};
const fakeJob = {
  id: 2001,
  run_id: 1001,
  name: "build",
  status: "completed",
  conclusion: "success",
  started_at: "2026-03-28T10:00:30Z",
  completed_at: "2026-03-28T10:04:30Z",
  runner_name: "ubuntu-latest",
  steps: [
    { name: "Checkout", status: "completed", conclusion: "success", number: 1, started_at: null, completed_at: null },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.repo.upsert.mockResolvedValue(fakeRepo);
  mockPrisma.repo.update.mockResolvedValue(fakeRepo);
  mockPrisma.workflow.upsert.mockResolvedValue(fakeWorkflow);
  mockPrisma.workflowRun.findUnique.mockResolvedValue(null); // not yet stored
  mockPrisma.workflowRun.create.mockResolvedValue({ id: "run-1" });
  mockPrisma.jobRun.create.mockResolvedValue({ id: "job-1" });
  mockListWorkflows.mockResolvedValue([{ id: 42, name: "CI", path: ".github/workflows/ci.yml", state: "active" }]);
  mockListRuns.mockResolvedValue([fakeRun]);
  mockListJobs.mockResolvedValue([fakeJob]);
});

describe("ingestRepo", () => {
  it("returns ingestion result with correct counts", async () => {
    const result = await ingestRepo("owner", "repo", { token: "test" });
    expect(result.repoFullName).toBe("owner/repo");
    expect(result.workflowsProcessed).toBe(1);
    expect(result.runsIngested).toBe(1);
    expect(result.runsSkipped).toBe(0);
    expect(result.jobsIngested).toBe(1);
    expect(result.errors).toHaveLength(0);
  });

  it("skips already-stored runs", async () => {
    mockPrisma.workflowRun.findUnique.mockResolvedValue({ id: "existing-run" });
    const result = await ingestRepo("owner", "repo", { token: "test" });
    expect(result.runsSkipped).toBe(1);
    expect(result.runsIngested).toBe(0);
    expect(mockPrisma.workflowRun.create).not.toHaveBeenCalled();
  });

  it("records error when workflow list fails", async () => {
    mockListWorkflows.mockRejectedValue(new Error("API rate limit"));
    const result = await ingestRepo("owner", "repo", { token: "test" });
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("API rate limit");
  });

  it("records error when run list fails but continues", async () => {
    mockListRuns.mockRejectedValue(new Error("404 Not Found"));
    const result = await ingestRepo("owner", "repo", { token: "test" });
    expect(result.errors).toHaveLength(1);
    expect(result.runsIngested).toBe(0);
  });

  it("skips job fetching when fetchJobs=false", async () => {
    await ingestRepo("owner", "repo", { token: "test", fetchJobs: false });
    expect(mockListJobs).not.toHaveBeenCalled();
    expect(mockPrisma.jobRun.create).not.toHaveBeenCalled();
  });

  it("upserts repo and workflow records", async () => {
    await ingestRepo("owner", "repo", { token: "test" });
    expect(mockPrisma.repo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { fullName: "owner/repo" } })
    );
    expect(mockPrisma.workflow.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { repoId_githubId: { repoId: "repo-1", githubId: 42 } } })
    );
  });

  it("computes durationMs correctly", async () => {
    await ingestRepo("owner", "repo", { token: "test" });
    const createCall = mockPrisma.workflowRun.create.mock.calls[0][0];
    // 10:00 → 10:05 = 300000ms
    expect(createCall.data.durationMs).toBe(300000);
  });

  it("updates lastSyncedAt after ingestion", async () => {
    await ingestRepo("owner", "repo", { token: "test" });
    expect(mockPrisma.repo.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ lastSyncedAt: expect.any(Date) }) })
    );
  });
});
