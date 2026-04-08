import { NextRequest, NextResponse } from "next/server";
import { getHistoricalContext, getBranchPipelineState } from "@/lib/analytics/historical";
import { serializeBigInt } from "@/lib/utils/json";

/**
 * GET /api/v1/analytics/historical/:runId
 * Get historical context for a specific workflow run (GitHub run ID).
 * Query: repo=owner/repo (required)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;
  const repo = request.nextUrl.searchParams.get("repo");
  if (!repo) {
    return NextResponse.json({ error: "repo query param required" }, { status: 400 });
  }

  const context = await getHistoricalContext(repo, BigInt(runId));
  if (!context) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  return NextResponse.json(serializeBigInt(context));
}
