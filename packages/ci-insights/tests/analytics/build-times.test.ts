import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    repo: { findUnique: vi.fn() },
  },
}));

import { getWorkflowBuildTimes } from "@/lib/analytics/build-times";
import { prisma } from "@/lib/prisma";

const mp = prisma as unknown as { repo: { findUnique: ReturnType<typeof vi.fn> } };

const makeRun = (durationMs: number | null, branch = "main", jobDurations: number[] = []) => ({
  durationMs,
  headBranch: branch,
  status: "completed",
  jobs: jobDurations.map((d, i) => ({ name: `job-${i}`, durationMs: d })),
});

const makeRepo = (runs: ReturnType<typeof makeRun>[]) => ({
  fullName: "owner/repo",
  workflows: [{ id: "wf-1", name: "CI", runs }],
});

beforeEach(() => vi.clearAllMocks());

describe("getWorkflowBuildTimes", () => {
  it("returns empty when repo not found", async () => {
    mp.repo.findUnique.mockResolvedValue(null);
    const result = await getWorkflowBuildTimes("owner/missing");
    expect(result).toEqual([]);
  });

  it("returns null percentiles when no completed runs", async () => {
    mp.repo.findUnique.mockResolvedValue(makeRepo([]));
    const [wf] = await getWorkflowBuildTimes("owner/repo");
    expect(wf.overall.p50).toBeNull();
    expect(wf.overall.p95).toBeNull();
    expect(wf.overall.sampleSize).toBe(0);
  });

  it("computes correct P50 for single value", async () => {
    mp.repo.findUnique.mockResolvedValue(makeRepo([makeRun(60000)]));
    const [wf] = await getWorkflowBuildTimes("owner/repo");
    expect(wf.overall.p50).toBe(60000);
    expect(wf.overall.sampleSize).toBe(1);
  });

  it("computes correct P50 for odd-length array", async () => {
    // [1000, 2000, 3000, 4000, 5000] → P50 = 3000
    mp.repo.findUnique.mockResolvedValue(
      makeRepo([1000, 2000, 3000, 4000, 5000].map((d) => makeRun(d)))
    );
    const [wf] = await getWorkflowBuildTimes("owner/repo");
    expect(wf.overall.p50).toBe(3000);
  });

  it("computes correct P50 for even-length array (interpolation)", async () => {
    // [1000, 2000, 3000, 4000] → P50 = 2500 (interpolated)
    mp.repo.findUnique.mockResolvedValue(
      makeRepo([1000, 2000, 3000, 4000].map((d) => makeRun(d)))
    );
    const [wf] = await getWorkflowBuildTimes("owner/repo");
    expect(wf.overall.p50).toBe(2500);
  });

  it("computes P95 correctly", async () => {
    // 20 values: 100, 200, ..., 2000 → P95 ≈ 1905ms
    const durations = Array.from({ length: 20 }, (_, i) => (i + 1) * 100);
    mp.repo.findUnique.mockResolvedValue(makeRepo(durations.map((d) => makeRun(d))));
    const [wf] = await getWorkflowBuildTimes("owner/repo");
    expect(wf.overall.p95).toBeGreaterThan(1800);
    expect(wf.overall.p95).toBeLessThanOrEqual(2000);
  });

  it("skips null durationMs runs", async () => {
    mp.repo.findUnique.mockResolvedValue(
      makeRepo([makeRun(null), makeRun(5000), makeRun(null)])
    );
    const [wf] = await getWorkflowBuildTimes("owner/repo");
    expect(wf.overall.sampleSize).toBe(1);
    expect(wf.overall.p50).toBe(5000);
  });

  it("groups runs by branch", async () => {
    mp.repo.findUnique.mockResolvedValue(makeRepo([
      makeRun(1000, "main"),
      makeRun(2000, "main"),
      makeRun(5000, "feature"),
    ]));
    const [wf] = await getWorkflowBuildTimes("owner/repo");
    expect(wf.byBranch["main"].sampleSize).toBe(2);
    expect(wf.byBranch["feature"].sampleSize).toBe(1);
    expect(wf.byBranch["main"].p50).toBe(1500);
  });

  it("computes per-job percentiles", async () => {
    mp.repo.findUnique.mockResolvedValue(makeRepo([
      makeRun(5000, "main", [1000, 2000]),
      makeRun(7000, "main", [1500, 2500]),
    ]));
    const [wf] = await getWorkflowBuildTimes("owner/repo");
    const job0 = wf.jobs.find((j) => j.jobName === "job-0");
    expect(job0?.percentiles.p50).toBe(1250); // interpolated between 1000 and 1500
    expect(job0?.percentiles.sampleSize).toBe(2);
  });

  it("includes min, max, avg", async () => {
    mp.repo.findUnique.mockResolvedValue(
      makeRepo([1000, 2000, 3000].map((d) => makeRun(d)))
    );
    const [wf] = await getWorkflowBuildTimes("owner/repo");
    expect(wf.overall.min).toBe(1000);
    expect(wf.overall.max).toBe(3000);
    expect(wf.overall.avg).toBe(2000);
  });
});
