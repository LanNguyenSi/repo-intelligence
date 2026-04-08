import { NextRequest, NextResponse } from "next/server";
import { getWorkflowBuildTimes, type WorkflowBuildTimes } from "@/lib/analytics/build-times";
import { prisma } from "@/lib/prisma";
import type { Period } from "@/lib/analytics/fail-rate";

/**
 * GET /api/v1/analytics/build-times
 * Query params:
 *   - repo: owner/repo (optional — if omitted, returns all repos)
 *   - period: 1 | 7 | 30 (default: 30)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const repo = searchParams.get("repo");
  const periodParam = searchParams.get("period");
  const period = (
    periodParam && ["1", "7", "30"].includes(periodParam)
      ? parseInt(periodParam)
      : 30
  ) as Period;

  try {
    let data: WorkflowBuildTimes[];

    if (repo) {
      data = await getWorkflowBuildTimes(repo, period);
    } else {
      const repos = await prisma.repo.findMany({ select: { fullName: true } });
      const results = await Promise.all(
        repos.map((r) => getWorkflowBuildTimes(r.fullName, period))
      );
      data = results.flat();
    }

    return NextResponse.json({ period, data });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Query failed" },
      { status: 500 }
    );
  }
}
