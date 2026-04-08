import { describe, it, expect, beforeEach } from "vitest";
import { getOctokit, resetOctokit } from "@/lib/github/client";

describe("getOctokit", () => {
  beforeEach(() => {
    resetOctokit();
  });

  it("returns an Octokit instance", () => {
    const client = getOctokit("test-token");
    expect(client).toBeDefined();
    expect(typeof client.rest.actions.listRepoWorkflows).toBe("function");
  });

  it("returns the same instance on subsequent calls (singleton)", () => {
    const a = getOctokit("test-token");
    const b = getOctokit("test-token");
    expect(a).toBe(b);
  });

  it("returns a new instance after reset", () => {
    const a = getOctokit("test-token");
    resetOctokit();
    const b = getOctokit("test-token");
    expect(a).not.toBe(b);
  });
});
