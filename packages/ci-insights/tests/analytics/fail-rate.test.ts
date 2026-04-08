import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    repo: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    workflow: {
      findUnique: vi.fn(),
    },
    workflowRun: {
      findMany: vi.fn(),
    },
  },
}));

import { getWorkflowFailRates, getAllFailRates, getWorkflowFailRateMultiPeriod } from "@/lib/analytics/fail-rate";
import { prisma } from "@/lib/prisma";

const mp = prisma as unknown as {
  repo: { findUnique: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };
  workflow: { findUnique: ReturnType<typeof vi.fn> };
  workflowRun: { findMany: ReturnType<typeof vi.fn> };
};

const makeRun = (conclusion: string | null, jobConclusions: string[] = []) => ({
  conclusion,
  runCreatedAt: new Date(),
  jobs: jobConclusions.map((c, i) => ({ name: `job-${i}`, conclusion: c })),
});

const makeRepo = (workflows: object[]) => ({
  fullName: "owner/repo",
  workflows,
});

beforeEach(() => vi.clearAllMocks());

describe("getWorkflowFailRates", () => {
  it("returns empty array when repo not found", async () => {
    mp.repo.findUnique.mockResolvedValue(null);
    const result = await getWorkflowFailRates("owner/missing", 7);
    expect(result).toEqual([]);
  });

  it("calculates 0% fail rate with all successes", async () => {
    mp.repo.findUnique.mockResolvedValue(makeRepo([{
      id: "wf-1", name: "CI",
      runs: [makeRun("success"), makeRun("success"), makeRun("success")],
    }]));
    const [wf] = await getWorkflowFailRates("owner/repo", 7);
    expect(wf.failRate).toBe(0);
    expect(wf.failRatePct).toBe(0);
    expect(wf.totalRuns).toBe(3);
    expect(wf.failedRuns).toBe(0);
  });

  it("calculates 100% fail rate with all failures", async () => {
    mp.repo.findUnique.mockResolvedValue(makeRepo([{
      id: "wf-1", name: "CI",
      runs: [makeRun("failure"), makeRun("failure")],
    }]));
    const [wf] = await getWorkflowFailRates("owner/repo", 7);
    expect(wf.failRate).toBe(1);
    expect(wf.failRatePct).toBe(100);
  });

  it("calculates correct mixed fail rate (1/4 = 25%)", async () => {
    mp.repo.findUnique.mockResolvedValue(makeRepo([{
      id: "wf-1", name: "CI",
      runs: [makeRun("failure"), makeRun("success"), makeRun("success"), makeRun("success")],
    }]));
    const [wf] = await getWorkflowFailRates("owner/repo", 7);
    expect(wf.failRatePct).toBe(25);
  });

  it("counts timed_out and action_required as failures", async () => {
    mp.repo.findUnique.mockResolvedValue(makeRepo([{
      id: "wf-1", name: "CI",
      runs: [makeRun("timed_out"), makeRun("action_required"), makeRun("success")],
    }]));
    const [wf] = await getWorkflowFailRates("owner/repo", 7);
    expect(wf.failedRuns).toBe(2);
  });

  it("returns 0% fail rate when no runs", async () => {
    mp.repo.findUnique.mockResolvedValue(makeRepo([{ id: "wf-1", name: "CI", runs: [] }]));
    const [wf] = await getWorkflowFailRates("owner/repo", 7);
    expect(wf.failRate).toBe(0);
    expect(wf.totalRuns).toBe(0);
  });

  it("aggregates per-job fail rates", async () => {
    mp.repo.findUnique.mockResolvedValue(makeRepo([{
      id: "wf-1", name: "CI",
      runs: [
        { conclusion: "failure", runCreatedAt: new Date(), jobs: [{ name: "build", conclusion: "failure" }, { name: "test", conclusion: "success" }] },
        { conclusion: "success", runCreatedAt: new Date(), jobs: [{ name: "build", conclusion: "success" }, { name: "test", conclusion: "success" }] },
      ],
    }]));
    const [wf] = await getWorkflowFailRates("owner/repo", 7);
    const build = wf.jobs.find((j) => j.name === "build");
    const test = wf.jobs.find((j) => j.name === "test");
    expect(build?.failRatePct).toBe(50);
    expect(test?.failRatePct).toBe(0);
  });
});

describe("getAllFailRates", () => {
  it("returns combined results for all repos", async () => {
    mp.repo.findMany.mockResolvedValue([{ fullName: "owner/a" }, { fullName: "owner/b" }]);
    mp.repo.findUnique
      .mockResolvedValueOnce(makeRepo([{ id: "wf-1", name: "CI-A", runs: [makeRun("success")] }]))
      .mockResolvedValueOnce(makeRepo([{ id: "wf-2", name: "CI-B", runs: [makeRun("failure")] }]));
    const results = await getAllFailRates(7);
    expect(results).toHaveLength(2);
    expect(results[0].name).toBe("CI-A");
    expect(results[1].failRatePct).toBe(100);
  });
});

describe("getWorkflowFailRateMultiPeriod", () => {
  it("returns fail rates for 1/7/30 day periods", async () => {
    mp.workflow.findUnique.mockResolvedValue({
      id: "wf-1", name: "CI", repo: { fullName: "owner/repo" },
    });
    mp.workflowRun.findMany.mockResolvedValue([
      { conclusion: "failure" }, { conclusion: "success" },
    ]);
    const result = await getWorkflowFailRateMultiPeriod("wf-1");
    expect(result[1]).toBeDefined();
    expect(result[7]).toBeDefined();
    expect(result[30]).toBeDefined();
    expect(result[30].failRatePct).toBe(50);
  });

  it("throws when workflow not found", async () => {
    mp.workflow.findUnique.mockResolvedValue(null);
    await expect(getWorkflowFailRateMultiPeriod("missing")).rejects.toThrow("not found");
  });
});
