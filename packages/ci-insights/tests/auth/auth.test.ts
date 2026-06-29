// ============================================================================
// Gap 2 (HIGH): ci-insights/lib/auth.ts — requireApiKey
//
// Guards tested:
//   - line 25: if (!expected) → fail-closed 401 with specific message
//   - wrong-length token (timingSafeEqual length guard via safeEqual)
//   - correct token → returns null (authorized)
//
// MUTATION: invert `!expected` to `expected`
// KILLED BY: the "SYNC_API_KEY unset → specific error message" assertion
//   (mutated code falls through and returns "Unauthorized" instead of
//   "Sync API is not configured", causing the error-text assertion to fail)
// ============================================================================

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { requireApiKey } from "@/lib/auth";

function makeRequest(authHeader?: string): Request {
  const headers: Record<string, string> = {};
  if (authHeader !== undefined) {
    headers["authorization"] = authHeader;
  }
  return new Request("http://localhost/api/v1/test", { headers });
}

const VALID_TOKEN = "supersecrettoken123";

beforeEach(() => {
  delete process.env.SYNC_API_KEY;
});

afterEach(() => {
  delete process.env.SYNC_API_KEY;
});

// ---------------------------------------------------------------------------
// Guard: SYNC_API_KEY unset → fail-closed 401
//
// MUTATION: `if (expected)` instead of `if (!expected)`
// KILLED BY: the body.error assertion below — mutated path returns "Unauthorized"
// ---------------------------------------------------------------------------
describe("requireApiKey — SYNC_API_KEY unset", () => {
  it("returns 401 with fail-closed message when SYNC_API_KEY is not set", async () => {
    const result = requireApiKey(makeRequest(`Bearer ${VALID_TOKEN}`));
    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
    const body = await result!.json();
    // Specific message distinguishes the fail-closed path from the token-mismatch path
    expect(body.error).toBe("Sync API is not configured");
  });

  it("returns 401 even when a Bearer token is provided but key is unconfigured", async () => {
    const result = requireApiKey(makeRequest("Bearer anytoken"));
    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Missing / malformed Bearer header
// ---------------------------------------------------------------------------
describe("requireApiKey — missing or malformed header", () => {
  beforeEach(() => {
    process.env.SYNC_API_KEY = VALID_TOKEN;
  });

  it("returns 401 when Authorization header is absent", async () => {
    const result = requireApiKey(makeRequest());
    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
    const body = await result!.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 when Authorization header is not Bearer scheme", async () => {
    const result = requireApiKey(makeRequest("Basic dXNlcjpwYXNz"));
    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
  });

  it("returns 401 for an empty Bearer value", async () => {
    const result = requireApiKey(makeRequest("Bearer "));
    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Wrong-length token — timingSafeEqual length guard
// ---------------------------------------------------------------------------
describe("requireApiKey — wrong-length token", () => {
  beforeEach(() => {
    process.env.SYNC_API_KEY = VALID_TOKEN;
  });

  it("returns 401 for a token that is shorter than the expected key", async () => {
    const result = requireApiKey(makeRequest("Bearer short"));
    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
  });

  it("returns 401 for a token that is longer than the expected key", async () => {
    const result = requireApiKey(makeRequest(`Bearer ${VALID_TOKEN}extra`));
    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Correct token → authorized (returns null)
// ---------------------------------------------------------------------------
describe("requireApiKey — valid token", () => {
  beforeEach(() => {
    process.env.SYNC_API_KEY = VALID_TOKEN;
  });

  it("returns null when the Bearer token matches SYNC_API_KEY", () => {
    const result = requireApiKey(makeRequest(`Bearer ${VALID_TOKEN}`));
    expect(result).toBeNull();
  });

  it("accepts tokens with extra whitespace trimmed", () => {
    // The regex trims trailing whitespace via match?.[1]?.trim()
    const result = requireApiKey(makeRequest(`Bearer ${VALID_TOKEN}  `));
    expect(result).toBeNull();
  });
});
