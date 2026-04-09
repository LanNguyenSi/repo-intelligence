import { describe, it, expect } from "vitest";
import { Scorer } from "./scorer.js";
import type { PRContext } from "../types.js";
import { DEFAULT_CONFIG } from "../types.js";

function makePR(overrides: Partial<PRContext> = {}): PRContext {
  return {
    owner: "test",
    repo: "test-repo",
    prNumber: 1,
    title: "feat: Add feature",
    description: "A test PR",
    files: [],
    commits: 3,
    additions: 50,
    deletions: 10,
    ...overrides,
  };
}

describe("Scorer", () => {
  const scorer = new Scorer(DEFAULT_CONFIG);

  describe("calculateOverall", () => {
    it("returns weighted average", () => {
      const scores = {
        codeQuality: 10,
        architecture: 10,
        testing: 10,
        documentation: 10,
        bestPractices: 10,
      };
      expect(scorer.calculateOverall(scores)).toBe(10);
    });

    it("weights code quality highest (30%)", () => {
      const high = { codeQuality: 10, architecture: 5, testing: 5, documentation: 5, bestPractices: 5 };
      const low = { codeQuality: 5, architecture: 10, testing: 5, documentation: 5, bestPractices: 5 };
      expect(scorer.calculateOverall(high)).toBeGreaterThan(scorer.calculateOverall(low));
    });

    it("rounds to 1 decimal", () => {
      const scores = { codeQuality: 7, architecture: 8, testing: 6, documentation: 9, bestPractices: 7 };
      const result = scorer.calculateOverall(scores);
      expect(result.toString()).toMatch(/^\d+(\.\d)?$/);
    });
  });

  describe("scoreCodeQuality", () => {
    it("starts at 10 for clean PR", () => {
      const score = scorer.scoreCodeQuality(makePR());
      expect(score).toBeGreaterThanOrEqual(9);
    });

    it("penalizes large files", () => {
      const pr = makePR({
        files: [{ filename: "big.ts", status: "added", additions: 500, deletions: 0, patch: "" }],
      });
      const score = scorer.scoreCodeQuality(pr);
      expect(score).toBeLessThan(10);
    });

    it("penalizes many commits", () => {
      const pr = makePR({ commits: 25 });
      const score = scorer.scoreCodeQuality(pr);
      expect(score).toBeLessThan(10);
    });
  });

  describe("scoreTesting", () => {
    it("scores high with matching test files", () => {
      const pr = makePR({
        files: [
          { filename: "src/feature.ts", status: "added", additions: 50, deletions: 0 },
          { filename: "tests/feature.test.ts", status: "added", additions: 30, deletions: 0 },
        ],
      });
      const score = scorer.scoreTesting(pr);
      expect(score).toBeGreaterThanOrEqual(8);
    });

    it("scores low without tests", () => {
      const pr = makePR({
        files: [
          { filename: "src/feature.ts", status: "added", additions: 100, deletions: 0 },
        ],
      });
      const score = scorer.scoreTesting(pr);
      expect(score).toBeLessThanOrEqual(3);
    });

    it("enforces stricter minimum when tests are required", () => {
      const strictScorer = new Scorer({
        ...DEFAULT_CONFIG,
        rules: { ...DEFAULT_CONFIG.rules, requireTests: true },
      });
      const pr = makePR({
        files: [
          { filename: "src/feature.ts", status: "added", additions: 100, deletions: 0 },
        ],
      });

      expect(strictScorer.scoreTesting(pr)).toBe(1);
    });
  });

  describe("scoreArchitecture", () => {
    it("recognizes source files in src/ paths", () => {
      const pr = makePR({
        files: [
          { filename: "src/feature.ts", status: "added", additions: 40, deletions: 0 },
          { filename: "tests/feature.test.ts", status: "added", additions: 20, deletions: 0 },
        ],
      });

      expect(scorer.scoreArchitecture(pr)).toBeGreaterThan(9.5);
    });
  });

  describe("scoreDocumentation", () => {
    it("rewards README updates", () => {
      const withReadme = makePR({
        files: [{ filename: "README.md", status: "modified", additions: 10, deletions: 2 }],
      });
      const without = makePR();
      expect(scorer.scoreDocumentation(withReadme)).toBeGreaterThan(scorer.scoreDocumentation(without));
    });

    it("penalizes larger undocumented changes when docs are required", () => {
      const strictScorer = new Scorer({
        ...DEFAULT_CONFIG,
        rules: { ...DEFAULT_CONFIG.rules, requireDocs: true },
      });
      const pr = makePR({
        additions: 120,
        files: [{ filename: "src/feature.ts", status: "modified", additions: 120, deletions: 10 }],
      });

      expect(strictScorer.scoreDocumentation(pr)).toBe(6);
    });
  });

  describe("scoreBestPractices", () => {
    it("penalizes eval usage", () => {
      const pr = makePR({
        files: [{ filename: "bad.ts", status: "added", additions: 10, deletions: 0, patch: "+eval(input)" }],
      });
      const score = scorer.scoreBestPractices(pr);
      expect(score).toBeLessThanOrEqual(8);
    });

    it("rewards type definitions", () => {
      const pr = makePR({
        files: [{ filename: "types.ts", status: "added", additions: 20, deletions: 0, patch: "+interface User {\n+type Config = {" }],
      });
      const score = scorer.scoreBestPractices(pr);
      expect(score).toBeGreaterThanOrEqual(10);
    });
  });

  describe("scorePR (full)", () => {
    it("returns all categories + overall", () => {
      const result = scorer.scorePR(makePR());
      expect(result).toHaveProperty("codeQuality");
      expect(result).toHaveProperty("architecture");
      expect(result).toHaveProperty("testing");
      expect(result).toHaveProperty("documentation");
      expect(result).toHaveProperty("bestPractices");
      expect(result).toHaveProperty("overall");
      expect(result.overall).toBeGreaterThanOrEqual(0);
      expect(result.overall).toBeLessThanOrEqual(10);
    });
  });
});
