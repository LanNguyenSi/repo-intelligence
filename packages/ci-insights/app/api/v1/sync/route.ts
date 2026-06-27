import { NextRequest, NextResponse } from "next/server";
import { syncAllRepos, syncRepo } from "@/lib/sync/scheduler";
import { requireApiKey } from "@/lib/auth";
import { isTrackedRepo } from "@/lib/sync/allowlist";
import { serverError } from "@/lib/utils/validation";

/**
 * POST /api/v1/sync
 * Trigger sync for all repos or a specific one.
 * Body: {
 *   repo?: string;           // owner/repo — if omitted, syncs all
 *   staleness?: number;      // skip repos synced within N minutes
 *   daysBack?: number;       // history window (default: unlimited)
 *   maxRunsPerWorkflow?: number;
 *   fetchJobs?: boolean;
 * }
 *
 * GET /api/v1/sync
 * Returns sync status (last sync times per repo).
 */
export async function POST(request: NextRequest) {
  const unauthorized = requireApiKey(request);
  if (unauthorized) return unauthorized;

  let body: {
    repo?: string;
    staleness?: number;
    daysBack?: number;
    maxRunsPerWorkflow?: number;
    fetchJobs?: boolean;
  } = {};

  try {
    body = await request.json();
  } catch {
    // empty body OK
  }

  try {
    if (body.repo) {
      if (!(await isTrackedRepo(body.repo))) {
        return NextResponse.json(
          { error: "Repo is not tracked" },
          { status: 404 }
        );
      }
      const result = await syncRepo(body.repo, body);
      return NextResponse.json(result);
    }
    const summary = await syncAllRepos(body);
    return NextResponse.json(summary);
  } catch (err: unknown) {
    return serverError(err);
  }
}

export async function GET() {
  const { prisma } = await import("@/lib/prisma");
  const repos = await prisma.repo.findMany({
    select: { fullName: true, lastSyncedAt: true, updatedAt: true },
    orderBy: { lastSyncedAt: "asc" },
  });
  return NextResponse.json({
    repos: repos.map((r) => ({
      fullName: r.fullName,
      lastSyncedAt: r.lastSyncedAt,
      staleMins: r.lastSyncedAt
        ? Math.round((Date.now() - r.lastSyncedAt.getTime()) / 60000)
        : null,
    })),
  });
}
