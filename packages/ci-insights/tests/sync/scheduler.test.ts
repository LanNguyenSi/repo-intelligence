import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/ingestion/ingest", () => ({
  ingestRepo: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    repo: { findMany: vi.fn() },
  },
}));

import { syncRepo, syncAllRepos } from "@/lib/sync/scheduler";
import { ingestRepo } from "@/lib/ingestion/ingest";
import { prisma } from "@/lib/prisma";

const mockIngest = ingestRepo as ReturnType<typeof vi.fn>;
const mp = prisma as unknown as { repo: { findMany: ReturnType<typeof vi.fn> } };

const fakeResult = {
  repoFullName: "owner/repo",
  workflowsProcessed: 2,
  runsIngested: 10,
  runsSkipped: 5,
  jobsIngested: 30,
  errors: [],
};

beforeEach(() => vi.clearAllMocks());

describe("syncRepo", () => {
  it("calls ingestRepo with correct owner/repo", async () => {
    mockIngest.mockResolvedValue(fakeResult);
    await syncRepo("owner/repo");
    expect(mockIngest).toHaveBeenCalledWith("owner", "repo", expect.objectContaining({}));
  });

  it("passes daysBack as since date", async () => {
    mockIngest.mockResolvedValue(fakeResult);
    await syncRepo("owner/repo", { daysBack: 7 });
    const call = mockIngest.mock.calls[0][2];
    expect(call.since).toBeInstanceOf(Date);
  });
});

describe("syncAllRepos", () => {
  it("syncs all repos and aggregates results", async () => {
    mp.repo.findMany.mockResolvedValue([
      { fullName: "owner/a", lastSyncedAt: null },
      { fullName: "owner/b", lastSyncedAt: null },
    ]);
    mockIngest.mockResolvedValue(fakeResult);
    const summary = await syncAllRepos();
    expect(summary.reposAttempted).toBe(2);
    expect(summary.reposSucceeded).toBe(2);
    expect(summary.totalRunsIngested).toBe(20);
    expect(summary.totalJobsIngested).toBe(60);
    expect(summary.errors).toHaveLength(0);
  });

  it("skips fresh repos when staleness is set", async () => {
    const recentSync = new Date(Date.now() - 5 * 60 * 1000); // 5 min ago
    mp.repo.findMany.mockResolvedValue([
      { fullName: "owner/fresh", lastSyncedAt: recentSync },
      { fullName: "owner/stale", lastSyncedAt: new Date(Date.now() - 120 * 60 * 1000) },
    ]);
    mockIngest.mockResolvedValue(fakeResult);
    const summary = await syncAllRepos({ staleness: 30 }); // skip if <30 min old
    expect(summary.reposAttempted).toBe(1); // only stale repo
    expect(mockIngest).toHaveBeenCalledTimes(1);
  });

  it("handles individual repo failures gracefully", async () => {
    mp.repo.findMany.mockResolvedValue([
      { fullName: "owner/a", lastSyncedAt: null },
      { fullName: "owner/b", lastSyncedAt: null },
    ]);
    mockIngest
      .mockResolvedValueOnce(fakeResult)
      .mockRejectedValueOnce(new Error("GitHub 403"));
    const summary = await syncAllRepos();
    expect(summary.reposSucceeded).toBe(1);
    expect(summary.reposFailed).toBe(1);
    expect(summary.errors[0].error).toContain("GitHub 403");
  });

  it("includes durationMs in summary", async () => {
    mp.repo.findMany.mockResolvedValue([{ fullName: "owner/a", lastSyncedAt: null }]);
    mockIngest.mockResolvedValue(fakeResult);
    const summary = await syncAllRepos();
    expect(summary.durationMs).toBeGreaterThanOrEqual(0);
  });
});
