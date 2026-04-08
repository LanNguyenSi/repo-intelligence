import { prisma } from "@/lib/prisma";
import { getWorkflowFailRates } from "./fail-rate";
import { getWorkflowBuildTimes } from "./build-times";
import { getBottlenecks } from "./bottleneck";
import type { Period } from "./fail-rate";

export interface RepoHealthSummary {
  repoFullName: string;
  owner: string;
  name: string;
  lastSyncedAt: Date | null;
  period: Period;
  // Aggregated metrics
  totalWorkflows: number;
  totalRunsInPeriod: number;
  overallFailRatePct: number;
  avgBuildTimeMs: number | null;
  p95BuildTimeMs: number | null;
  flakyJobCount: number;
  topBottleneck: string | null; // job name
  // Status
  healthScore: number; // 0–100 (higher = healthier)
  healthStatus: "healthy" | "warning" | "critical";
}

/**
 * Aggregate health summary for a single repo.
 */
export async function getRepoHealthSummary(
  repoFullName: string,
  period: Period = 30
): Promise<RepoHealthSummary | null> {
  const since = new Date();
  since.setDate(since.getDate() - period);

  const repo = await prisma.repo.findUnique({
    where: { fullName: repoFullName },
    include: {
      _count: { select: { workflows: true } },
      workflows: {
        include: {
          _count: { select: { runs: true } },
          runs: {
            where: { runCreatedAt: { gte: since }, status: "completed" },
            select: { conclusion: true, durationMs: true },
          },
        },
      },
    },
  });

  if (!repo) return null;

  // Aggregate across all workflows
  let totalRuns = 0;
  let failedRuns = 0;
  const allDurations: number[] = [];

  for (const wf of repo.workflows) {
    for (const run of wf.runs) {
      totalRuns++;
      if (run.conclusion && ["failure", "timed_out", "action_required"].includes(run.conclusion)) {
        failedRuns++;
      }
      if (run.durationMs != null) allDurations.push(run.durationMs);
    }
  }

  const overallFailRatePct = totalRuns > 0
    ? Math.round((failedRuns / totalRuns) * 1000) / 10
    : 0;

  // Build times
  const buildTimes = await getWorkflowBuildTimes(repoFullName, period);
  const allP95 = buildTimes.map((b) => b.overall.p95).filter((v): v is number => v !== null);
  const avgBuildTimeMs = allDurations.length > 0
    ? Math.round(allDurations.reduce((a, b) => a + b, 0) / allDurations.length)
    : null;
  const p95BuildTimeMs = allP95.length > 0
    ? Math.round(allP95.reduce((a, b) => a + b, 0) / allP95.length)
    : null;

  // Bottleneck
  const bottlenecks = await getBottlenecks(repoFullName, period);
  const topBottleneck = bottlenecks.find((b) => b.rank === 1)?.jobName ?? null;

  // Health score: 100 - penalties
  // -40 for fail rate (scaled to 0-40)
  // -30 for slow P95 (>10min = full penalty)
  // -30 reserved for future (flaky, etc.)
  const failPenalty = Math.min(40, overallFailRatePct * 0.8);
  const slowPenalty = p95BuildTimeMs != null
    ? Math.min(30, (p95BuildTimeMs / 600000) * 30)
    : 0;
  const healthScore = Math.max(0, Math.round(100 - failPenalty - slowPenalty));

  const healthStatus: RepoHealthSummary["healthStatus"] =
    healthScore >= 70 ? "healthy" : healthScore >= 40 ? "warning" : "critical";

  return {
    repoFullName,
    owner: repo.owner,
    name: repo.name,
    lastSyncedAt: repo.lastSyncedAt,
    period,
    totalWorkflows: repo._count.workflows,
    totalRunsInPeriod: totalRuns,
    overallFailRatePct,
    avgBuildTimeMs,
    p95BuildTimeMs,
    flakyJobCount: 0, // populated by caller if needed
    topBottleneck,
    healthScore,
    healthStatus,
  };
}

/**
 * Get health summaries for all repos — cross-repo aggregated view.
 */
export async function getAllRepoHealthSummaries(
  period: Period = 30
): Promise<RepoHealthSummary[]> {
  const repos = await prisma.repo.findMany({ select: { fullName: true } });

  const summaries = await Promise.all(
    repos.map((r) => getRepoHealthSummary(r.fullName, period))
  );

  return summaries
    .filter((s): s is RepoHealthSummary => s !== null)
    .sort((a, b) => a.healthScore - b.healthScore); // worst first
}
