import { prisma } from "@/lib/prisma";

/**
 * Whether a repo is tracked, i.e. already present in the `repo` table.
 *
 * The `repo` body field on `POST /api/v1/sync` is a convenience for re-syncing
 * one already-tracked repo, so it is restricted to the known set as defense in
 * depth. Onboarding a brand-new repo goes through
 * `POST /api/v1/repos/:owner/:repo/sync` (API-key authenticated), which is not
 * allowlisted because that route is how an operator starts tracking a repo.
 *
 * @param fullName `owner/repo`
 */
export async function isTrackedRepo(fullName: string): Promise<boolean> {
  if (!fullName || !fullName.includes("/")) return false;
  const repo = await prisma.repo.findUnique({
    where: { fullName },
    select: { id: true },
  });
  return repo !== null;
}
