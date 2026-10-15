import { prisma } from "@/lib/prisma";
import { listWorkflows, listWorkflowRuns, listJobsForRun } from "@/lib/github/workflows";
import type { IngestionResult } from "@/lib/github/types";

/** Compute duration in ms between two ISO strings */
function durationMs(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return diff >= 0 ? diff : null;
}

/**
 * Ingest workflow runs + jobs for a single repo into PostgreSQL.
 * Idempotent: runs already stored (by githubRunId) with status "completed"
 * are skipped. A stored run that was not completed at an earlier sync is
 * refreshed from the run list already fetched (status, conclusion, timestamps,
 * duration), and its jobs are re-fetched once, when it has now completed.
 */
export async function ingestRepo(
  owner: string,
  repo: string,
  options: {
    since?: Date;
    maxRunsPerWorkflow?: number;
    token?: string;
    fetchJobs?: boolean;
  } = {}
): Promise<IngestionResult> {
  const fullName = `${owner}/${repo}`;
  const result: IngestionResult = {
    repoFullName: fullName,
    workflowsProcessed: 0,
    runsIngested: 0,
    runsSkipped: 0,
    jobsIngested: 0,
    errors: [],
  };

  // Upsert repo record
  const dbRepo = await prisma.repo.upsert({
    where: { fullName },
    create: { owner, name: repo, fullName },
    update: { updatedAt: new Date() },
  });

  // Fetch and upsert workflows
  let workflows;
  try {
    workflows = await listWorkflows(owner, repo, options.token);
  } catch (err: unknown) {
    result.errors.push(`Failed to list workflows: ${err instanceof Error ? err.message : String(err)}`);
    return result;
  }

  result.workflowsProcessed = workflows.length;

  for (const wf of workflows) {
    const dbWorkflow = await prisma.workflow.upsert({
      where: { repoId_githubId: { repoId: dbRepo.id, githubId: wf.id } },
      create: {
        repoId: dbRepo.id,
        githubId: wf.id,
        name: wf.name,
        path: wf.path,
        state: wf.state,
      },
      update: { name: wf.name, state: wf.state },
    });

    // Fetch runs
    let runs;
    try {
      runs = await listWorkflowRuns(
        owner,
        repo,
        wf.id,
        {
          since: options.since,
          maxRuns: options.maxRunsPerWorkflow ?? 100,
        },
        options.token
      );
    } catch (err: unknown) {
      result.errors.push(
        `Workflow ${wf.name}: failed to list runs: ${err instanceof Error ? err.message : String(err)}`
      );
      continue;
    }

    for (const run of runs) {
      // Check if already stored
      const existing = await prisma.workflowRun.findUnique({
        where: { githubRunId: BigInt(run.id) },
        select: { id: true, status: true },
      });

      const runDurationMs = durationMs(run.run_started_at, run.updated_at);

      if (existing) {
        if (existing.status === "completed") {
          result.runsSkipped++;
          continue;
        }

        // Stored while queued or in progress: take the latest state from the
        // run list (no extra API call).
        await prisma.workflowRun.update({
          where: { id: existing.id },
          data: {
            status: run.status ?? "unknown",
            conclusion: run.conclusion,
            runStartedAt: run.run_started_at ? new Date(run.run_started_at) : null,
            runUpdatedAt: new Date(run.updated_at),
            durationMs: runDurationMs,
          },
        });

        // Jobs are re-fetched only on the transition to completed, so at most
        // one extra jobs call per run over its lifetime.
        if (options.fetchJobs !== false && run.status === "completed") {
          try {
            const jobs = await listJobsForRun(owner, repo, run.id, options.token);
            for (const job of jobs) {
              const data = {
                name: job.name,
                status: job.status,
                conclusion: job.conclusion,
                startedAt: job.started_at ? new Date(job.started_at) : null,
                completedAt: job.completed_at ? new Date(job.completed_at) : null,
                durationMs: durationMs(job.started_at, job.completed_at),
                runnerName: job.runner_name,
                steps: job.steps.length > 0 ? JSON.parse(JSON.stringify(job.steps)) : undefined,
              };
              await prisma.jobRun.upsert({
                where: { githubJobId: BigInt(job.id) },
                create: { workflowRunId: existing.id, githubJobId: BigInt(job.id), ...data },
                update: data,
              });
              result.jobsIngested++;
            }
          } catch (err: unknown) {
            result.errors.push(
              `Run ${run.id}: failed to refresh jobs: ${err instanceof Error ? err.message : String(err)}`
            );
          }
        }
        continue;
      }

      const dbRun = await prisma.workflowRun.create({
        data: {
          workflowId: dbWorkflow.id,
          githubRunId: BigInt(run.id),
          runNumber: run.run_number,
          event: run.event,
          status: run.status ?? "unknown",
          conclusion: run.conclusion,
          headBranch: run.head_branch,
          headSha: run.head_sha,
          headCommitMsg: run.head_commit_message,
          runStartedAt: run.run_started_at ? new Date(run.run_started_at) : null,
          runCreatedAt: new Date(run.created_at),
          runUpdatedAt: new Date(run.updated_at),
          durationMs: runDurationMs,
        },
      });

      result.runsIngested++;

      // Fetch + store jobs
      if (options.fetchJobs !== false) {
        try {
          const jobs = await listJobsForRun(owner, repo, run.id, options.token);
          for (const job of jobs) {
            const jobDurationMs = durationMs(job.started_at, job.completed_at);
            await prisma.jobRun.create({
              data: {
                workflowRunId: dbRun.id,
                githubJobId: BigInt(job.id),
                name: job.name,
                status: job.status,
                conclusion: job.conclusion,
                startedAt: job.started_at ? new Date(job.started_at) : null,
                completedAt: job.completed_at ? new Date(job.completed_at) : null,
                durationMs: jobDurationMs,
                runnerName: job.runner_name,
                steps: job.steps.length > 0 ? JSON.parse(JSON.stringify(job.steps)) : undefined,
              },
            });
            result.jobsIngested++;
          }
        } catch (err: unknown) {
          result.errors.push(
            `Run ${run.id}: failed to fetch jobs: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }
    }
  }

  // Update lastSyncedAt
  await prisma.repo.update({
    where: { id: dbRepo.id },
    data: { lastSyncedAt: new Date() },
  });

  return result;
}
