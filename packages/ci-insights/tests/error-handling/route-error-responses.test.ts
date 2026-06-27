/**
 * Mutation-valid guard: route handlers must return a generic 500 body, never
 * leaking raw internal error messages to clients.
 *
 * Each test throws a distinctive secret string from the underlying lib and
 * asserts it does not appear in the response body. The test FAILS if the
 * route reverts to `err.message`.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Shared mocks
// ---------------------------------------------------------------------------

vi.mock("@/lib/prisma", () => ({
  prisma: {
    repo: { findMany: vi.fn(), findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/analytics/bottleneck", () => ({
  getBottlenecks: vi.fn(),
}));

vi.mock("@/lib/analytics/build-times", () => ({
  getWorkflowBuildTimes: vi.fn(),
}));

vi.mock("@/lib/analytics/flaky", () => ({
  detectFlakyJobs: vi.fn(),
}));

vi.mock("@/lib/analytics/cross-repo", () => ({
  getAllRepoHealthSummaries: vi.fn(),
  getRepoHealthSummary: vi.fn(),
}));

vi.mock("@/lib/ingestion/ingest", () => ({
  ingestRepo: vi.fn(),
}));

vi.mock("@/lib/sync/scheduler", () => ({
  syncAllRepos: vi.fn(),
  syncRepo: vi.fn(),
}));

vi.mock("@/lib/sync/allowlist", () => ({
  isTrackedRepo: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/auth", () => ({
  requireApiKey: vi.fn().mockReturnValue(null), // null = authorized
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SECRET = "POSTGRES_CREDENTIALS_LEAKED://user:pass@internal-db/prod";

function makeGetRequest(url = "http://localhost/api/v1/test"): NextRequest {
  return new NextRequest(url);
}

async function assertGenericError(response: Response): Promise<void> {
  expect(response.status).toBe(500);
  const body = await response.json();
  expect(body.error).toBe("Internal server error");
  expect(JSON.stringify(body)).not.toContain(SECRET);
}

beforeEach(() => vi.clearAllMocks());

// ---------------------------------------------------------------------------
// bottleneck route
// ---------------------------------------------------------------------------

describe("bottleneck route: error response does not leak internals", () => {
  it("returns generic 500 when getBottlenecks throws", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { getBottlenecks } = await import("@/lib/analytics/bottleneck");
    (getBottlenecks as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error(SECRET)
    );
    const { prisma } = await import("@/lib/prisma");
    (prisma.repo.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { fullName: "owner/repo" },
    ]);

    const { GET } = await import(
      "@/app/api/v1/analytics/bottleneck/route"
    );
    const response = await GET(makeGetRequest());
    await assertGenericError(response);
    spy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// build-times route
// ---------------------------------------------------------------------------

describe("build-times route: error response does not leak internals", () => {
  it("returns generic 500 when getWorkflowBuildTimes throws", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { getWorkflowBuildTimes } = await import(
      "@/lib/analytics/build-times"
    );
    (getWorkflowBuildTimes as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error(SECRET)
    );
    const { prisma } = await import("@/lib/prisma");
    (prisma.repo.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { fullName: "owner/repo" },
    ]);

    const { GET } = await import(
      "@/app/api/v1/analytics/build-times/route"
    );
    const response = await GET(makeGetRequest());
    await assertGenericError(response);
    spy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// flaky route
// ---------------------------------------------------------------------------

describe("flaky route: error response does not leak internals", () => {
  it("returns generic 500 when detectFlakyJobs throws", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { detectFlakyJobs } = await import("@/lib/analytics/flaky");
    (detectFlakyJobs as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error(SECRET)
    );
    const { prisma } = await import("@/lib/prisma");
    (prisma.repo.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { fullName: "owner/repo" },
    ]);

    const { GET } = await import("@/app/api/v1/analytics/flaky/route");
    const response = await GET(makeGetRequest());
    await assertGenericError(response);
    spy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// overview route
// ---------------------------------------------------------------------------

describe("overview route: error response does not leak internals", () => {
  it("returns generic 500 when getAllRepoHealthSummaries throws", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { getAllRepoHealthSummaries } = await import(
      "@/lib/analytics/cross-repo"
    );
    (
      getAllRepoHealthSummaries as ReturnType<typeof vi.fn>
    ).mockRejectedValueOnce(new Error(SECRET));

    const { GET } = await import("@/app/api/v1/analytics/overview/route");
    const response = await GET(makeGetRequest());
    await assertGenericError(response);
    spy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// repos/[owner]/[repo]/sync route
// ---------------------------------------------------------------------------

describe("repos sync route: error response does not leak internals", () => {
  it("returns generic 500 when ingestRepo throws", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { ingestRepo } = await import("@/lib/ingestion/ingest");
    (ingestRepo as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error(SECRET)
    );

    const { POST } = await import(
      "@/app/api/v1/repos/[owner]/[repo]/sync/route"
    );
    const request = new NextRequest("http://localhost/api/v1/repos/owner/repo/sync", {
      method: "POST",
    });
    const params = Promise.resolve({ owner: "owner", repo: "testrepo" });
    const response = await POST(request, { params });
    await assertGenericError(response);
    spy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// sync route
// ---------------------------------------------------------------------------

describe("sync route: error response does not leak internals", () => {
  it("returns generic 500 when syncAllRepos throws", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { syncAllRepos } = await import("@/lib/sync/scheduler");
    (syncAllRepos as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error(SECRET)
    );

    const { POST } = await import("@/app/api/v1/sync/route");
    const request = new NextRequest("http://localhost/api/v1/sync", {
      method: "POST",
    });
    const response = await POST(request);
    await assertGenericError(response);
    spy.mockRestore();
  });
});
