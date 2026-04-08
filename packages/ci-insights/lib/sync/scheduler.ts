import { prisma } from "@/lib/prisma";
import { ingestRepo } from "@/lib/ingestion/ingest";
import type { IngestionResult } from "@/lib/github/types";

export interface SyncOptions {
  /** Only sync repos not synced within this many minutes (0 = always sync) */
  staleness?: number;
  /** Days of history to fetch */
  daysBack?: number;
  /** Max runs per workflow */
  maxRunsPerWorkflow?: number;
  /** Include job-level data */
  fetchJobs?: boolean;
}

export interface SyncSummary {
  reposAttempted: number;
  reposSucceeded: number;
  reposFailed: number;
  totalRunsIngested: number;
  totalRunsSkipped: number;
  totalJobsIngested: number;
  errors: { repo: string; error: string }[];
  results: IngestionResult[];
  durationMs: number;
}

/**
 * Sync a single repo by fullName (owner/repo).
 */
export async function syncRepo(
  fullName: string,
  options: SyncOptions = {}
): Promise<IngestionResult> {
  const [owner, repo] = fullName.split("/");
  const since = options.daysBack
    ? new Date(Date.now() - options.daysBack * 24 * 60 * 60 * 1000)
    : undefined;

  return ingestRepo(owner, repo, {
    since,
    maxRunsPerWorkflow: options.maxRunsPerWorkflow ?? 100,
    fetchJobs: options.fetchJobs ?? true,
    token: process.env.GITHUB_TOKEN,
  });
}

/**
 * Sync all tracked repos, with optional staleness check.
 */
export async function syncAllRepos(options: SyncOptions = {}): Promise<SyncSummary> {
  const startMs = Date.now();
  const summary: SyncSummary = {
    reposAttempted: 0,
    reposSucceeded: 0,
    reposFailed: 0,
    totalRunsIngested: 0,
    totalRunsSkipped: 0,
    totalJobsIngested: 0,
    errors: [],
    results: [],
    durationMs: 0,
  };

  const repos = await prisma.repo.findMany({
    select: { fullName: true, lastSyncedAt: true },
  });

  const stalenessMs = (options.staleness ?? 0) * 60 * 1000;
  const now = Date.now();

  const toSync = repos.filter((r) => {
    if (stalenessMs === 0) return true;
    if (!r.lastSyncedAt) return true;
    return now - r.lastSyncedAt.getTime() > stalenessMs;
  });

  summary.reposAttempted = toSync.length;

  // Sync in parallel (max 3 concurrent to avoid rate limiting)
  const CONCURRENCY = 3;
  for (let i = 0; i < toSync.length; i += CONCURRENCY) {
    const batch = toSync.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((r) => syncRepo(r.fullName, options))
    );

    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      const repo = batch[j];
      if (result.status === "fulfilled") {
        summary.reposSucceeded++;
        summary.totalRunsIngested += result.value.runsIngested;
        summary.totalRunsSkipped += result.value.runsSkipped;
        summary.totalJobsIngested += result.value.jobsIngested;
        summary.results.push(result.value);
        if (result.value.errors.length > 0) {
          summary.errors.push(...result.value.errors.map((e) => ({ repo: repo.fullName, error: e })));
        }
      } else {
        summary.reposFailed++;
        summary.errors.push({ repo: repo.fullName, error: result.reason?.message ?? "Unknown error" });
      }
    }
  }

  summary.durationMs = Date.now() - startMs;
  return summary;
}
