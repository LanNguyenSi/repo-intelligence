import { NextRequest, NextResponse } from "next/server";
import { getBottlenecks } from "@/lib/analytics/bottleneck";
import { prisma } from "@/lib/prisma";
import type { Period } from "@/lib/analytics/fail-rate";

/**
 * GET /api/v1/analytics/bottleneck
 * Query: repo=owner/repo (optional), period=1|7|30 (default 30), limit=N (default all)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const repo = searchParams.get("repo");
  const periodParam = searchParams.get("period");
  const limitParam = searchParams.get("limit");
  const period = (["1", "7", "30"].includes(periodParam ?? "") ? parseInt(periodParam!) : 30) as Period;
  const limit = limitParam ? parseInt(limitParam) : undefined;

  try {
    let data;
    if (repo) {
      data = await getBottlenecks(repo, period);
    } else {
      const repos = await prisma.repo.findMany({ select: { fullName: true } });
      const all = await Promise.all(repos.map((r) => getBottlenecks(r.fullName, period)));
      data = all.flat().sort((a, b) => b.avgDurationMs - a.avgDurationMs);
    }
    if (limit) data = data.slice(0, limit);
    return NextResponse.json({ period, data });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Query failed" }, { status: 500 });
  }
}
