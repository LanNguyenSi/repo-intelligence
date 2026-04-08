import { NextRequest, NextResponse } from "next/server";
import { detectFlakyJobs } from "@/lib/analytics/flaky";
import { prisma } from "@/lib/prisma";
import type { Period } from "@/lib/analytics/fail-rate";

/**
 * GET /api/v1/analytics/flaky
 * Query params:
 *   - repo: owner/repo (optional — if omitted, scans all repos)
 *   - period: 1 | 7 | 30 (default: 30)
 *   - threshold: fail rate threshold 0-1 (default: 0.2)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const repo = searchParams.get("repo");
  const periodParam = searchParams.get("period");
  const thresholdParam = searchParams.get("threshold");

  const period = (
    periodParam && ["1", "7", "30"].includes(periodParam)
      ? parseInt(periodParam)
      : 30
  ) as Period;

  const threshold = thresholdParam ? parseFloat(thresholdParam) : 0.2;

  try {
    let data;
    if (repo) {
      data = await detectFlakyJobs(repo, { period, failRateThreshold: threshold });
    } else {
      const repos = await prisma.repo.findMany({ select: { fullName: true } });
      const results = await Promise.all(
        repos.map((r) => detectFlakyJobs(r.fullName, { period, failRateThreshold: threshold }))
      );
      data = results.flat();
    }

    return NextResponse.json({ period, threshold, totalFlaky: data.length, data });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Query failed" },
      { status: 500 }
    );
  }
}
