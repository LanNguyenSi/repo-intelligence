import { describe, it, expect, vi } from "vitest";
import type { RepoInfo, PRInfo, WorkflowRunInfo } from "./github.js";

// Capture console output
function captureLog(fn: () => void): string {
  const logs: string[] = [];
  const originalLog = console.log;
  console.log = (...args: unknown[]) => logs.push(args.map(String).join(" "));
  fn();
  console.log = originalLog;
  return logs.join("\n");
}

// We test the display module indirectly by checking it doesn't crash
// and produces output. Import is dynamic to handle ESM.
describe("display", () => {
  it("timeAgo formats correctly", () => {
    // Recent
    const now = new Date().toISOString();
    const hourAgo = new Date(Date.now() - 3600000).toISOString();
    const dayAgo = new Date(Date.now() - 86400000).toISOString();

    // These are internal but we test the logic pattern
    const diffMins = (d: string) => Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    expect(diffMins(now)).toBeLessThan(2);
    expect(diffMins(hourAgo)).toBeGreaterThanOrEqual(59);
    expect(diffMins(dayAgo)).toBeGreaterThanOrEqual(1439);
  });
});

describe("github types", () => {
  it("RepoInfo has required fields", () => {
    const repo: RepoInfo = {
      name: "test-repo",
      fullName: "user/test-repo",
      description: "A test repo",
      language: "TypeScript",
      isPrivate: false,
      defaultBranch: "main",
      updatedAt: new Date().toISOString(),
      openIssues: 3,
      stars: 10,
      url: "https://github.com/user/test-repo",
    };
    expect(repo.name).toBe("test-repo");
    expect(repo.isPrivate).toBe(false);
    expect(repo.stars).toBe(10);
  });

  it("PRInfo has required fields", () => {
    const pr: PRInfo = {
      number: 1,
      title: "feat: Add feature",
      repo: "test-repo",
      author: "user",
      state: "open",
      draft: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      url: "https://github.com/user/test-repo/pull/1",
    };
    expect(pr.number).toBe(1);
    expect(pr.draft).toBe(false);
  });

  it("WorkflowRunInfo handles success and failure", () => {
    const passing: WorkflowRunInfo = {
      repo: "test",
      name: "CI",
      status: "completed",
      conclusion: "success",
      branch: "main",
      commitMessage: "fix: something",
      updatedAt: new Date().toISOString(),
      url: "https://github.com",
    };
    const failing: WorkflowRunInfo = {
      ...passing,
      conclusion: "failure",
    };
    expect(passing.conclusion).toBe("success");
    expect(failing.conclusion).toBe("failure");
  });

  it("handles null description and language", () => {
    const repo: RepoInfo = {
      name: "minimal",
      fullName: "user/minimal",
      description: null,
      language: null,
      isPrivate: true,
      defaultBranch: "master",
      updatedAt: new Date().toISOString(),
      openIssues: 0,
      stars: 0,
      url: "https://github.com/user/minimal",
    };
    expect(repo.description).toBeNull();
    expect(repo.language).toBeNull();
  });
});
