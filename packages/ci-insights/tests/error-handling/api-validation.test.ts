/**
 * API route input validation tests
 */
import { describe, it, expect } from "vitest";
import { parsePeriod, requireParam } from "@/lib/utils/validation";

describe("parsePeriod", () => {
  it("returns period 30 when param is null (default)", () => {
    const result = parsePeriod(null);
    expect("period" in result).toBe(true);
    if ("period" in result) expect(result.period).toBe(30);
  });

  it("parses valid periods", () => {
    for (const p of ["1", "7", "30"]) {
      const result = parsePeriod(p);
      expect("period" in result).toBe(true);
    }
  });

  it("returns 400 error for invalid period", () => {
    const result = parsePeriod("999");
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error.status).toBe(400);
    }
  });

  it("returns 400 for non-numeric period", () => {
    const result = parsePeriod("abc");
    expect("error" in result).toBe(true);
  });

  it("returns 400 for period 0", () => {
    const result = parsePeriod("0");
    expect("error" in result).toBe(true);
  });
});

describe("requireParam", () => {
  it("returns value when present", () => {
    const result = requireParam("owner/repo", "repo");
    expect("value" in result).toBe(true);
    if ("value" in result) expect(result.value).toBe("owner/repo");
  });

  it("returns 400 when param is null", () => {
    const result = requireParam(null, "repo");
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error.status).toBe(400);
  });

  it("returns 400 when param is empty string", () => {
    const result = requireParam("", "repo");
    expect("error" in result).toBe(true);
  });

  it("includes field name in error", async () => {
    const result = requireParam(null, "workflowId");
    if ("error" in result) {
      const body = await result.error.json();
      expect(body.error).toContain("workflowId");
    }
  });
});
