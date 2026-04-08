import { prisma } from "@/lib/prisma";

export interface HistoricalContext {
  repoFullName: string;
  workflowName: string;
  headSha: string | null;
  headBranch: string | null;
  /** Was the pipeline already failing before this commit? */
  wasAlreadyRed: boolean;
  /** Number of consecutive failing runs before this commit (same branch) */
  priorConsecutiveFailures: number;
  /** Last successful run before this commit (same branch) */
  lastSuccessBeforeSha: {
    runNumber: number;
    headSha: string | null;
    runCreatedAt: Date;
  } | null;
  /** The run we're providing context for */
  targetRun: {
    runNumber: number;
    conclusion: string | null;
    runCreatedAt: Date;
    durationMs: number | null;
  };
}

const FAILURE_CONCLUSIONS = ["failure", "timed_out", "action_required"];

/**
 * Get historical context for a specific workflow run.
 * Answers: "Was this pipeline already red before this commit landed?"
 */
export async function getHistoricalContext(
  repoFullName: string,
  workflowRunGithubId: bigint
): Promise<HistoricalContext | null> {
  const run = await prisma.workflowRun.findUnique({
    where: { githubRunId: workflowRunGithubId },
    include: { workflow: { include: { repo: true } } },
  });

  if (!run || run.workflow.repo.fullName !== repoFullName) return null;

  // Get recent runs on the same branch, before this run's creation time
  const priorRuns = await prisma.workflowRun.findMany({
    where: {
      workflowId: run.workflowId,
      headBranch: run.headBranch,
      runCreatedAt: { lt: run.runCreatedAt },
      status: "completed",
    },
    orderBy: { runCreatedAt: "desc" },
    take: 20,
    select: {
      runNumber: true,
      headSha: true,
      conclusion: true,
      runCreatedAt: true,
    },
  });

  // Count consecutive failures before this run
  let priorConsecutiveFailures = 0;
  for (const prior of priorRuns) {
    if (prior.conclusion && FAILURE_CONCLUSIONS.includes(prior.conclusion)) {
      priorConsecutiveFailures++;
    } else {
      break;
    }
  }

  const wasAlreadyRed = priorConsecutiveFailures > 0;

  // Find last success before this run
  const lastSuccess = priorRuns.find(
    (r) => r.conclusion === "success"
  ) ?? null;

  return {
    repoFullName,
    workflowName: run.workflow.name,
    headSha: run.headSha,
    headBranch: run.headBranch,
    wasAlreadyRed,
    priorConsecutiveFailures,
    lastSuccessBeforeSha: lastSuccess
      ? { runNumber: lastSuccess.runNumber, headSha: lastSuccess.headSha, runCreatedAt: lastSuccess.runCreatedAt }
      : null,
    targetRun: {
      runNumber: run.runNumber,
      conclusion: run.conclusion,
      runCreatedAt: run.runCreatedAt,
      durationMs: run.durationMs,
    },
  };
}

/**
 * Get the current pipeline state for a branch.
 * Quick answer to "is this branch red right now?"
 */
export async function getBranchPipelineState(
  repoFullName: string,
  workflowId: string,
  branch: string
): Promise<{
  branch: string;
  isRed: boolean;
  consecutiveFailures: number;
  lastRun: { runNumber: number; conclusion: string | null; runCreatedAt: Date } | null;
}> {
  const runs = await prisma.workflowRun.findMany({
    where: {
      workflowId,
      headBranch: branch,
      status: "completed",
    },
    orderBy: { runCreatedAt: "desc" },
    take: 10,
    select: { runNumber: true, conclusion: true, runCreatedAt: true },
  });

  let consecutiveFailures = 0;
  for (const run of runs) {
    if (run.conclusion && FAILURE_CONCLUSIONS.includes(run.conclusion)) {
      consecutiveFailures++;
    } else {
      break;
    }
  }

  return {
    branch,
    isRed: consecutiveFailures > 0,
    consecutiveFailures,
    lastRun: runs[0] ?? null,
  };
}
