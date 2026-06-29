// ============================================================================
// Gap 4 (MED): ci-insights/lib/sync/allowlist.ts — isTrackedRepo
//
// Tests the REAL function (not the vi.fn mock used in route tests).
//
// Guards tested:
//   - empty/no-slash input → false (early return, no DB call)
//   - repo not found in DB → prisma returns null → false
//   - repo found → prisma returns { id } → true
//
// MUTATION: invert `return repo !== null` to `return repo === null`
// KILLED BY: "repo found → true" test (expects true; gets false with mutation)
// ============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    repo: {
      findUnique: vi.fn(),
    },
  },
}));

import { isTrackedRepo } from "@/lib/sync/allowlist";
import { prisma } from "@/lib/prisma";

const mockFindUnique = prisma.repo.findUnique as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.resetAllMocks(); // drain mockResolvedValueOnce queues
});

// ---------------------------------------------------------------------------
// Early-return guards (no DB call)
// ---------------------------------------------------------------------------
describe("isTrackedRepo — early returns (no DB call)", () => {
  it("returns false for an empty string", async () => {
    const result = await isTrackedRepo("");
    expect(result).toBe(false);
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("returns false for a string without a slash", async () => {
    const result = await isTrackedRepo("justarepo");
    expect(result).toBe(false);
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("returns false for a string that is only a slash", async () => {
    // '/' contains a slash but has no owner or repo name
    // The check is only `!fullName.includes('/')`, so '/' passes the guard
    // and hits the DB. This documents the existing behavior.
    mockFindUnique.mockResolvedValueOnce(null);
    const result = await isTrackedRepo("/");
    expect(result).toBe(false);
    expect(mockFindUnique).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// DB lookup: repo not found
// ---------------------------------------------------------------------------
describe("isTrackedRepo — repo not found", () => {
  it("returns false when prisma.repo.findUnique returns null", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const result = await isTrackedRepo("owner/repo");
    expect(result).toBe(false);
  });

  it("passes the correct fullName to findUnique", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    await isTrackedRepo("acme/rocket");
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { fullName: "acme/rocket" },
      select: { id: true },
    });
  });
});

// ---------------------------------------------------------------------------
// DB lookup: repo found
//
// MUTATION: `return repo === null` instead of `repo !== null`
// KILLED BY: expects true; mutated code returns false
// ---------------------------------------------------------------------------
describe("isTrackedRepo — repo found", () => {
  it("returns true when prisma.repo.findUnique returns a record", async () => {
    mockFindUnique.mockResolvedValueOnce({ id: 1 });
    const result = await isTrackedRepo("owner/repo");
    expect(result).toBe(true);
  });

  it("returns true for any truthy record (regardless of id value)", async () => {
    mockFindUnique.mockResolvedValueOnce({ id: 999 });
    const result = await isTrackedRepo("LanNguyenSi/repo-intelligence");
    expect(result).toBe(true);
  });
});
