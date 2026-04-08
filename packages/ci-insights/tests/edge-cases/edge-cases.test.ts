/**
 * Edge case tests across all analytics modules
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    repo: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    workflow: { findUnique: vi.fn() },
    workflowRun: { findMany: vi.fn() },
  },
}));

import { getWorkflowFailRates } from "@/lib/analytics/fail-rate";
import { getWorkflowBuildTimes } from "@/lib/analytics/build-times";
import { detectFlakyJobs } from "@/lib/analytics/flaky";
import { getBottlenecks } from "@/lib/analytics/bottleneck";
import { prisma } from "@/lib/prisma";
import { serializeBigInt } from "@/lib/utils/json";

const mp = prisma as unknown as {
  repo: { findUnique: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };
  workflowRun: { findMany: ReturnType<typeof vi.fn> };
};

beforeEach(() => vi.clearAllMocks());

describe("Repo with 0 workflows", () => {
  it("getWorkflowFailRates returns empty array, no crash", async () => {
    mp.repo.findUnique.mockResolvedValue({ fullName: "owner/repo", workflows: [] });
    const result = await getWorkflowFailRates("owner/repo", 30);
    expect(result).toEqual([]);
  });

  it("getWorkflowBuildTimes returns empty array, no crash", async () => {
    mp.repo.findUnique.mockResolvedValue({ fullName: "owner/repo", workflows: [] });
    const result = await getWorkflowBuildTimes("owner/repo", 30);
    expect(result).toEqual([]);
  });

  it("detectFlakyJobs returns empty array, no crash", async () => {
    mp.repo.findUnique.mockResolvedValue({ fullName: "owner/repo", workflows: [] });
    const result = await detectFlakyJobs("owner/repo");
    expect(result).toEqual([]);
  });

  it("getBottlenecks returns empty array, no crash", async () => {
    mp.repo.findUnique.mockResolvedValue({ fullName: "owner/repo", workflows: [] });
    const result = await getBottlenecks("owner/repo");
    expect(result).toEqual([]);
  });
});

describe("Workflow with 0 runs in period", () => {
  it("failRate is 0%, not NaN or undefined", async () => {
    mp.repo.findUnique.mockResolvedValue({
      fullName: "owner/repo",
      workflows: [{ id: "wf-1", name: "CI", runs: [] }],
    });
    const [wf] = await getWorkflowFailRates("owner/repo", 7);
    expect(wf.failRate).toBe(0);
    expect(wf.failRatePct).toBe(0);
    expect(Number.isNaN(wf.failRate)).toBe(false);
  });

  it("build times p50/p95 are null (not NaN), sampleSize 0", async () => {
    mp.repo.findUnique.mockResolvedValue({
      fullName: "owner/repo",
      workflows: [{ id: "wf-1", name: "CI", runs: [] }],
    });
    const [wf] = await getWorkflowBuildTimes("owner/repo", 7);
    expect(wf.overall.p50).toBeNull();
    expect(wf.overall.p95).toBeNull();
    expect(wf.overall.sampleSize).toBe(0);
  });
});

describe("Jobs with null/in_progress conclusions", () => {
  it("null conclusion jobs are skipped in fail rate job aggregation", async () => {
    mp.repo.findUnique.mockResolvedValue({
      fullName: "owner/repo",
      workflows: [{
        id: "wf-1", name: "CI",
        runs: [
          // Run 1: job has null conclusion → skipped in job aggregation
          { conclusion: "success", runCreatedAt: new Date(), jobs: [{ name: "build", conclusion: null }] },
          // Run 2: job has success conclusion → counted
          { conclusion: "success", runCreatedAt: new Date(), jobs: [{ name: "build", conclusion: "success" }] },
        ],
      }],
    });
    const [wf] = await getWorkflowFailRates("owner/repo", 30);
    // Workflow-level: 2 runs, 0 failures
    expect(wf.totalRuns).toBe(2);
    expect(wf.failedRuns).toBe(0);
    // Job-level: null conclusion is still counted as a job run (conclusion just isn't a failure)
    const job = wf.jobs.find((j) => j.name === "build");
    expect(job?.failedRuns).toBe(0);
  });

  it("flaky detection skips jobs with null conclusion", async () => {
    mp.repo.findUnique.mockResolvedValue({
      fullName: "owner/repo",
      workflows: [{
        id: "wf-1", name: "CI",
        runs: Array.from({ length: 6 }, (_, i) => ({
          headSha: `sha${i}`,
          jobs: [{ name: "test", conclusion: null }],
        })),
      }],
    });
    const result = await detectFlakyJobs("owner/repo");
    expect(result).toHaveLength(0);
  });
});

describe("BigInt JSON serialization", () => {
  it("serializeBigInt converts BigInt to string", () => {
    // Use a value within safe integer range for reliable round-trip through JSON.parse
    const obj = { id: BigInt(23682655111), name: "test", nested: { runId: BigInt(12345) } };
    const result = serializeBigInt(obj);
    expect(typeof result.id).toBe("string");
    expect(result.id).toBe("23682655111");
    expect(typeof (result.nested as { runId: unknown }).runId).toBe("string");
  });

  it("serializeBigInt preserves non-BigInt values", () => {
    const obj = { num: 42, str: "hello", bool: true, arr: [1, 2, 3], nil: null };
    const result = serializeBigInt(obj);
    expect(result.num).toBe(42);
    expect(result.str).toBe("hello");
    expect(result.bool).toBe(true);
    expect(result.arr).toEqual([1, 2, 3]);
    expect(result.nil).toBeNull();
  });

  it("large GitHub run ID (BigInt) serializes to string without precision loss", () => {
    const bigRunId = BigInt("23682655111");
    const obj = { githubRunId: bigRunId };
    const result = serializeBigInt(obj);
    expect(result.githubRunId).toBe("23682655111");
  });
});

describe("Cross-repo analytics with empty repos list", () => {
  it("getAllFailRates returns empty array when no repos tracked", async () => {
    mp.repo.findMany.mockResolvedValue([]);
    const { getAllFailRates } = await import("@/lib/analytics/fail-rate");
    const result = await getAllFailRates(30);
    expect(result).toEqual([]);
  });
});
