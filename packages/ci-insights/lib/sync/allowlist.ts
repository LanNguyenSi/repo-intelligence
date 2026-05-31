import { prisma } from "@/lib/prisma";

/**
 * Whether a repo is tracked, i.e. already present in the `repo` table.
 *
 * Sync/ingestion endpoints accept an attacker-controllable `owner/repo`, which
 * would otherwise let any caller point the server's GITHUB_TOKEN at an
 * arbitrary repository (token abuse / SSRF-like). Restrict callers to the set
 * of repos an operator has already chosen to track.
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
