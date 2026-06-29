// ============================================================================
// Gap 9 (LOW): repo-health/src/display.ts — displayReport and displayJSON
// ============================================================================

import { describe, it, expect, vi, afterEach } from "vitest";
import { displayReport, displayJSON } from "./display.js";
import type { HealthReport } from "./checks.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function captureLog(fn: () => void): string {
  const lines: string[] = [];
  const orig = console.log;
  console.log = (...args: unknown[]) => lines.push(args.map(String).join(" "));
  fn();
  console.log = orig;
  return lines.join("\n");
}

function makeReport(overrides: Partial<HealthReport> = {}): HealthReport {
  return {
    path: "/tmp/test-repo",
    score: 8,
    grade: "B",
    summary: "Decent health",
    checks: [
      {
        name: "README exists",
        category: "docs",
        passed: true,
        score: 10,
        message: "README.md found",
        suggestion: undefined,
      },
      {
        name: "Tests exist",
        category: "testing",
        passed: false,
        score: 0,
        message: "No test directory found",
        suggestion: "Add a tests/ or __tests__/ directory",
      },
    ],
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// displayReport
// ---------------------------------------------------------------------------
describe("displayReport", () => {
  it("outputs the repository path in the header", () => {
    const output = captureLog(() => displayReport(makeReport({ path: "/my/repo" })));
    expect(output).toContain("/my/repo");
  });

  it("outputs the grade", () => {
    const output = captureLog(() => displayReport(makeReport({ grade: "A", score: 9 })));
    expect(output).toContain("A");
  });

  it("outputs the score as X/10", () => {
    const output = captureLog(() => displayReport(makeReport({ score: 7 })));
    expect(output).toContain("7/10");
  });

  it("outputs check names", () => {
    const output = captureLog(() => displayReport(makeReport()));
    expect(output).toContain("README exists");
    expect(output).toContain("Tests exist");
  });

  it("outputs the suggestion for failed checks", () => {
    const output = captureLog(() => displayReport(makeReport()));
    expect(output).toContain("Add a tests/");
  });

  it("handles a report where all checks pass (no suggestions section)", () => {
    const report = makeReport({
      checks: [
        { name: "Check A", category: "docs", passed: true, score: 10, message: "ok" },
      ],
    });
    const output = captureLog(() => displayReport(report));
    expect(output).toContain("Check A");
    // No suggestion lines when all pass
    expect(output).not.toContain("→");
  });
});

// ---------------------------------------------------------------------------
// displayJSON
// ---------------------------------------------------------------------------
describe("displayJSON", () => {
  it("outputs valid JSON", () => {
    const report = makeReport();
    const lines: string[] = [];
    const orig = console.log;
    console.log = (...args: unknown[]) => lines.push(args.map(String).join(" "));
    displayJSON(report);
    console.log = orig;

    const parsed = JSON.parse(lines.join("\n"));
    expect(parsed).toHaveProperty("score", 8);
    expect(parsed).toHaveProperty("grade", "B");
    expect(parsed).toHaveProperty("checks");
    expect(parsed.checks).toHaveLength(2);
  });

  it("includes check details in JSON output", () => {
    const report = makeReport();
    const lines: string[] = [];
    const orig = console.log;
    console.log = (...args: unknown[]) => lines.push(args.map(String).join(" "));
    displayJSON(report);
    console.log = orig;

    const parsed = JSON.parse(lines.join("\n"));
    expect(parsed.checks[0].name).toBe("README exists");
    expect(parsed.checks[1].passed).toBe(false);
  });
});
