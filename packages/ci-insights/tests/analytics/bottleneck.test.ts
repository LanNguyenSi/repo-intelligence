import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { repo: { findUnique: vi.fn() } },
}));

import { getBottlenecks } from "@/lib/analytics/bottleneck";
import { prisma } from "@/lib/prisma";

const mp = prisma as unknown as { repo: { findUnique: ReturnType<typeof vi.fn> } };

const makeRepo = (jobs: { name: string; durations: number[] }[]) => ({
  fullName: "owner/repo",
  workflows: [{
    id: "wf-1", name: "CI",
    runs: jobs[0]?.durations.map((_, i) => ({
      durationMs: jobs.reduce((s, j) => s + (j.durations[i] ?? 0), 0),
      jobs: jobs.map((j) => ({ name: j.name, durationMs: j.durations[i] ?? null })),
    })) ?? [],
  }],
});

beforeEach(() => vi.clearAllMocks());

describe("getBottlenecks", () => {
  it("returns empty when repo not found", async () => {
    mp.repo.findUnique.mockResolvedValue(null);
    expect(await getBottlenecks("owner/missing")).toEqual([]);
  });

  it("ranks jobs by average duration (slowest first)", async () => {
    mp.repo.findUnique.mockResolvedValue(makeRepo([
      { name: "fast", durations: [1000, 1000, 1000] },
      { name: "slow", durations: [5000, 5000, 5000] },
      { name: "medium", durations: [2000, 2000, 2000] },
    ]));
    const result = await getBottlenecks("owner/repo");
    expect(result[0].jobName).toBe("slow");
    expect(result[0].rank).toBe(1);
    expect(result[1].jobName).toBe("medium");
    expect(result[2].jobName).toBe("fast");
  });

  it("computes durationShare correctly", async () => {
    mp.repo.findUnique.mockResolvedValue(makeRepo([
      { name: "a", durations: [3000, 3000] },
      { name: "b", durations: [1000, 1000] },
    ]));
    const result = await getBottlenecks("owner/repo");
    const a = result.find((r) => r.jobName === "a");
    const b = result.find((r) => r.jobName === "b");
    expect(a?.durationShare).toBeCloseTo(0.75, 2);
    expect(b?.durationShare).toBeCloseTo(0.25, 2);
  });

  it("includes p50 and p95", async () => {
    mp.repo.findUnique.mockResolvedValue(makeRepo([
      { name: "job", durations: [1000, 2000, 3000, 4000, 5000] },
    ]));
    const [result] = await getBottlenecks("owner/repo");
    expect(result.p50DurationMs).toBe(3000);
    expect(result.p95DurationMs).toBe(5000);
    expect(result.avgDurationMs).toBe(3000);
  });

  it("sampleSize reflects number of runs with data", async () => {
    mp.repo.findUnique.mockResolvedValue(makeRepo([
      { name: "job", durations: [1000, 2000, 3000] },
    ]));
    const [result] = await getBottlenecks("owner/repo");
    expect(result.sampleSize).toBe(3);
  });
});
