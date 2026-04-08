import { NextRequest, NextResponse } from "next/server";
import { ingestRepo } from "@/lib/ingestion/ingest";

/**
 * POST /api/v1/repos/:owner/:repo/sync
 * Trigger ingestion for a specific repo.
 * Body: { since?: string (ISO date), maxRunsPerWorkflow?: number, fetchJobs?: boolean }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  const { owner, repo } = await params;

  let body: {
    since?: string;
    maxRunsPerWorkflow?: number;
    fetchJobs?: boolean;
  } = {};

  try {
    body = await request.json();
  } catch {
    // empty body is fine
  }

  const since = body.since ? new Date(body.since) : undefined;

  try {
    const result = await ingestRepo(owner, repo, {
      since,
      maxRunsPerWorkflow: body.maxRunsPerWorkflow ?? 50,
      fetchJobs: body.fetchJobs ?? true,
      token: process.env.GITHUB_TOKEN,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Ingestion failed" },
      { status: 500 }
    );
  }
}
