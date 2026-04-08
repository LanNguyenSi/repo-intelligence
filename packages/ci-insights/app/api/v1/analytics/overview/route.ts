import { NextRequest, NextResponse } from "next/server";
import { getAllRepoHealthSummaries, getRepoHealthSummary } from "@/lib/analytics/cross-repo";
import type { Period } from "@/lib/analytics/fail-rate";

/**
 * GET /api/v1/analytics/overview
 * Cross-repo health dashboard.
 * Query: repo=owner/repo (optional — single repo summary), period=1|7|30 (default 30)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const repo = searchParams.get("repo");
  const periodParam = searchParams.get("period");
  const period = (["1", "7", "30"].includes(periodParam ?? "") ? parseInt(periodParam!) : 30) as Period;

  try {
    if (repo) {
      const summary = await getRepoHealthSummary(repo, period);
      if (!summary) return NextResponse.json({ error: "Repo not found" }, { status: 404 });
      return NextResponse.json(summary);
    }
    const summaries = await getAllRepoHealthSummaries(period);
    return NextResponse.json({ period, total: summaries.length, repos: summaries });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Query failed" }, { status: 500 });
  }
}
