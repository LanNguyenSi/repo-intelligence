import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    workflowRun: { findUnique: vi.fn(), findMany: vi.fn() },
  },
}));

import { getHistoricalContext, getBranchPipelineState } from "@/lib/analytics/historical";
import { prisma } from "@/lib/prisma";

const mp = prisma as unknown as {
  workflowRun: { findUnique: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };
};

const now = new Date("2026-03-28T12:00:00Z");
const fakeRun = {
  githubRunId: BigInt(1001),
  workflowId: "wf-1",
  runNumber: 10,
  headSha: "abc123",
  headBranch: "main",
  conclusion: "failure",
  runCreatedAt: now,
  durationMs: 120000,
  workflow: { id: "wf-1", name: "CI", repo: { fullName: "owner/repo" } },
};

beforeEach(() => vi.clearAllMocks());

describe("getHistoricalContext", () => {
  it("returns null when run not found", async () => {
    mp.workflowRun.findUnique.mockResolvedValue(null);
    expect(await getHistoricalContext("owner/repo", BigInt(9999))).toBeNull();
  });

  it("returns null when repo fullName mismatches", async () => {
    mp.workflowRun.findUnique.mockResolvedValue({
      ...fakeRun,
      workflow: { ...fakeRun.workflow, repo: { fullName: "other/repo" } },
    });
    mp.workflowRun.findMany.mockResolvedValue([]);
    expect(await getHistoricalContext("owner/repo", BigInt(1001))).toBeNull();
  });

  it("wasAlreadyRed=false when no prior failures", async () => {
    mp.workflowRun.findUnique.mockResolvedValue(fakeRun);
    mp.workflowRun.findMany.mockResolvedValue([
      { runNumber: 9, headSha: "prev1", conclusion: "success", runCreatedAt: new Date() },
    ]);
    const ctx = await getHistoricalContext("owner/repo", BigInt(1001));
    expect(ctx?.wasAlreadyRed).toBe(false);
    expect(ctx?.priorConsecutiveFailures).toBe(0);
  });

  it("wasAlreadyRed=true with consecutive prior failures", async () => {
    mp.workflowRun.findUnique.mockResolvedValue(fakeRun);
    mp.workflowRun.findMany.mockResolvedValue([
      { runNumber: 9, headSha: "p1", conclusion: "failure", runCreatedAt: new Date() },
      { runNumber: 8, headSha: "p2", conclusion: "failure", runCreatedAt: new Date() },
      { runNumber: 7, headSha: "p3", conclusion: "success", runCreatedAt: new Date() },
    ]);
    const ctx = await getHistoricalContext("owner/repo", BigInt(1001));
    expect(ctx?.wasAlreadyRed).toBe(true);
    expect(ctx?.priorConsecutiveFailures).toBe(2);
  });

  it("finds lastSuccessBeforeSha correctly", async () => {
    mp.workflowRun.findUnique.mockResolvedValue(fakeRun);
    mp.workflowRun.findMany.mockResolvedValue([
      { runNumber: 9, headSha: "fail1", conclusion: "failure", runCreatedAt: new Date() },
      { runNumber: 8, headSha: "ok1", conclusion: "success", runCreatedAt: new Date() },
    ]);
    const ctx = await getHistoricalContext("owner/repo", BigInt(1001));
    expect(ctx?.lastSuccessBeforeSha?.headSha).toBe("ok1");
    expect(ctx?.lastSuccessBeforeSha?.runNumber).toBe(8);
  });

  it("lastSuccessBeforeSha is null when no prior success", async () => {
    mp.workflowRun.findUnique.mockResolvedValue(fakeRun);
    mp.workflowRun.findMany.mockResolvedValue([
      { runNumber: 9, headSha: "f1", conclusion: "failure", runCreatedAt: new Date() },
      { runNumber: 8, headSha: "f2", conclusion: "timed_out", runCreatedAt: new Date() },
    ]);
    const ctx = await getHistoricalContext("owner/repo", BigInt(1001));
    expect(ctx?.lastSuccessBeforeSha).toBeNull();
  });
});

describe("getBranchPipelineState", () => {
  it("isRed=false when last run succeeded", async () => {
    mp.workflowRun.findMany.mockResolvedValue([
      { runNumber: 5, conclusion: "success", runCreatedAt: new Date() },
    ]);
    const state = await getBranchPipelineState("owner/repo", "wf-1", "main");
    expect(state.isRed).toBe(false);
    expect(state.consecutiveFailures).toBe(0);
  });

  it("isRed=true with consecutive failures", async () => {
    mp.workflowRun.findMany.mockResolvedValue([
      { runNumber: 5, conclusion: "failure", runCreatedAt: new Date() },
      { runNumber: 4, conclusion: "timed_out", runCreatedAt: new Date() },
      { runNumber: 3, conclusion: "success", runCreatedAt: new Date() },
    ]);
    const state = await getBranchPipelineState("owner/repo", "wf-1", "main");
    expect(state.isRed).toBe(true);
    expect(state.consecutiveFailures).toBe(2);
  });
});
