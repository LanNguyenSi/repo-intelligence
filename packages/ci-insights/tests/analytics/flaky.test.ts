import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    repo: { findUnique: vi.fn() },
  },
}));

import { detectFlakyJobs } from "@/lib/analytics/flaky";
import { prisma } from "@/lib/prisma";

const mp = prisma as unknown as { repo: { findUnique: ReturnType<typeof vi.fn> } };

const makeRun = (sha: string, jobs: { name: string; conclusion: string }[]) => ({
  headSha: sha,
  jobs,
});

const makeRepo = (runs: ReturnType<typeof makeRun>[]) => ({
  fullName: "owner/repo",
  workflows: [{ id: "wf-1", name: "CI", runs }],
});

beforeEach(() => vi.clearAllMocks());

describe("detectFlakyJobs", () => {
  it("returns empty when repo not found", async () => {
    mp.repo.findUnique.mockResolvedValue(null);
    const result = await detectFlakyJobs("owner/missing");
    expect(result).toEqual([]);
  });

  it("returns empty when all jobs succeed consistently", async () => {
    mp.repo.findUnique.mockResolvedValue(makeRepo(
      Array.from({ length: 10 }, (_, i) => makeRun(`sha${i}`, [{ name: "build", conclusion: "success" }]))
    ));
    const result = await detectFlakyJobs("owner/repo");
    expect(result).toHaveLength(0);
  });

  it("detects high-fail-rate signal (>20%)", async () => {
    // 3 failures out of 10 = 30%
    const runs = [
      ...Array.from({ length: 7 }, (_, i) => makeRun(`sha${i}`, [{ name: "test", conclusion: "success" }])),
      ...Array.from({ length: 3 }, (_, i) => makeRun(`fail${i}`, [{ name: "test", conclusion: "failure" }])),
    ];
    mp.repo.findUnique.mockResolvedValue(makeRepo(runs));
    const result = await detectFlakyJobs("owner/repo");
    expect(result).toHaveLength(1);
    expect(result[0].signal).toBe("high-fail-rate");
    expect(result[0].failRatePct).toBe(30);
    expect(result[0].jobName).toBe("test");
  });

  it("detects sha-retry signal (same SHA, mixed conclusions)", async () => {
    // 4 successes + same SHA runs twice with success + failure
    const runs = [
      ...Array.from({ length: 4 }, (_, i) => makeRun(`sha${i}`, [{ name: "lint", conclusion: "success" }])),
      makeRun("flakySha", [{ name: "lint", conclusion: "success" }]),
      makeRun("flakySha", [{ name: "lint", conclusion: "failure" }]),
    ];
    mp.repo.findUnique.mockResolvedValue(makeRepo(runs));
    const result = await detectFlakyJobs("owner/repo", { failRateThreshold: 0.5 }); // high threshold to isolate sha-retry
    expect(result).toHaveLength(1);
    expect(result[0].signal).toBe("sha-retry");
    expect(result[0].shaRetryCount).toBe(1);
    expect(result[0].shaRetryExamples[0]).toBe("flakySha".substring(0, 8));
  });

  it("detects both signal when sha-retry AND high-fail-rate", async () => {
    const runs = [
      ...Array.from({ length: 3 }, (_, i) => makeRun(`sha${i}`, [{ name: "e2e", conclusion: "success" }])),
      ...Array.from({ length: 3 }, (_, i) => makeRun(`fail${i}`, [{ name: "e2e", conclusion: "failure" }])),
      makeRun("sharedSha", [{ name: "e2e", conclusion: "success" }]),
      makeRun("sharedSha", [{ name: "e2e", conclusion: "failure" }]),
    ];
    mp.repo.findUnique.mockResolvedValue(makeRepo(runs));
    const result = await detectFlakyJobs("owner/repo", { minRuns: 5 });
    expect(result[0].signal).toBe("both");
  });

  it("filters out jobs below minRuns threshold", async () => {
    mp.repo.findUnique.mockResolvedValue(makeRepo([
      makeRun("sha1", [{ name: "rare-job", conclusion: "failure" }]),
      makeRun("sha2", [{ name: "rare-job", conclusion: "failure" }]),
      makeRun("sha3", [{ name: "rare-job", conclusion: "failure" }]),
    ]));
    // only 3 runs, default minRuns = 5
    const result = await detectFlakyJobs("owner/repo");
    expect(result).toHaveLength(0);
  });

  it("sorts: both > high-fail-rate > sha-retry", async () => {
    // Build a scenario with multiple flaky jobs
    const base = Array.from({ length: 5 }, (_, i) => makeRun(`sha${i}`, [
      { name: "fast-flaky", conclusion: i < 4 ? "success" : "failure" }, // 20% fail → just at threshold, won't trigger with >0.2
      { name: "very-flaky", conclusion: i < 2 ? "success" : "failure" },  // 60% fail → high-fail-rate
    ]));
    // Add sha-retry for very-flaky
    base.push(makeRun("mixedSha", [{ name: "very-flaky", conclusion: "success" }]));
    base.push(makeRun("mixedSha", [{ name: "very-flaky", conclusion: "failure" }]));

    mp.repo.findUnique.mockResolvedValue(makeRepo(base));
    const result = await detectFlakyJobs("owner/repo", { failRateThreshold: 0.2, minRuns: 5 });
    // very-flaky should be first (has both signals)
    expect(result[0].jobName).toBe("very-flaky");
  });

  it("truncates shaRetryExamples to max 3", async () => {
    const runs = [
      ...Array.from({ length: 5 }, (_, i) => makeRun(`ok${i}`, [{ name: "job", conclusion: "success" }])),
      ...["s1", "s2", "s3", "s4", "s5"].flatMap((sha) => [
        makeRun(sha, [{ name: "job", conclusion: "success" }]),
        makeRun(sha, [{ name: "job", conclusion: "failure" }]),
      ]),
    ];
    mp.repo.findUnique.mockResolvedValue(makeRepo(runs));
    const result = await detectFlakyJobs("owner/repo", { failRateThreshold: 0.9 }); // only sha-retry
    expect(result[0].shaRetryExamples.length).toBeLessThanOrEqual(3);
  });
});
