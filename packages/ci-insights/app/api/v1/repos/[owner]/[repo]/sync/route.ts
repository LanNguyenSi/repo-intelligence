import { NextRequest, NextResponse } from "next/server";
import { ingestRepo } from "@/lib/ingestion/ingest";
import { requireApiKey } from "@/lib/auth";

/**
 * POST /api/v1/repos/:owner/:repo/sync
 * Trigger ingestion for a specific repo. This is the onboarding path: an
 * authenticated operator (holding SYNC_API_KEY) tracks a new repo here, which
 * upserts the repo row. It is therefore intentionally NOT gated by the
 * tracked-repo allowlist; the API key is the trust boundary.
 * Body: { since?: string (ISO date), maxRunsPerWorkflow?: number, fetchJobs?: boolean }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  const unauthorized = requireApiKey(request);
  if (unauthorized) return unauthorized;

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
