import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/v1/repos
 * List all tracked repos with sync status.
 */
export async function GET() {
  const repos = await prisma.repo.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { workflows: true } },
    },
  });

  return NextResponse.json(
    repos.map((r) => ({
      id: r.id,
      fullName: r.fullName,
      owner: r.owner,
      name: r.name,
      lastSyncedAt: r.lastSyncedAt,
      workflowCount: r._count.workflows,
    }))
  );
}
