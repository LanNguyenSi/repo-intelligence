import { describe, it, expect } from "vitest";
import { ReviewFormatter } from "./formatter.js";
import type { ReviewResult, PRContext } from "../types.js";

const formatter = new ReviewFormatter();

const mockContext: PRContext = {
  owner: "test",
  repo: "test-repo",
  prNumber: 42,
  title: "feat: Add dashboard",
  description: "Dashboard implementation",
  files: [
    { filename: "src/dashboard.ts", status: "added", additions: 100, deletions: 0 },
    { filename: "tests/dashboard.test.ts", status: "added", additions: 50, deletions: 0 },
  ],
  commits: 3,
  additions: 150,
  deletions: 0,
};

const mockResult: ReviewResult = {
  score: {
    codeQuality: 9,
    architecture: 8.5,
    testing: 10,
    documentation: 7,
    bestPractices: 9,
    overall: 8.8,
  },
  strengths: ["Good test coverage", "Clean architecture"],
  improvements: ["Add README section"],
  recommendations: ["Consider adding .ai/ARCHITECTURE.md"],
  details: [
    { category: "Code Quality", score: 9, notes: ["TypeScript used"] },
  ],
};

describe("ReviewFormatter", () => {
  describe("formatReview (GitHub Markdown)", () => {
    it("includes score and verdict", () => {
      const output = formatter.formatReview(mockContext, mockResult);
      expect(output).toContain("8.8/10");
      expect(output).toContain("GOOD");
    });

    it("includes PR metadata", () => {
      const output = formatter.formatReview(mockContext, mockResult);
      expect(output).toContain("#42");
      expect(output).toContain("feat: Add dashboard");
      expect(output).toContain("+150/-0");
    });

    it("includes score breakdown table", () => {
      const output = formatter.formatReview(mockContext, mockResult);
      expect(output).toContain("Code Quality");
      expect(output).toContain("Architecture");
      expect(output).toContain("Testing");
    });

    it("includes strengths and improvements", () => {
      const output = formatter.formatReview(mockContext, mockResult);
      expect(output).toContain("Good test coverage");
      expect(output).toContain("Add README section");
    });

    it("includes recommendations", () => {
      const output = formatter.formatReview(mockContext, mockResult);
      expect(output).toContain(".ai/ARCHITECTURE.md");
    });
  });

  describe("formatTerminal", () => {
    it("includes score with bars", () => {
      const output = formatter.formatTerminal(mockContext, mockResult);
      expect(output).toContain("8.8/10");
      expect(output).toContain("█");
    });

    it("includes PR title", () => {
      const output = formatter.formatTerminal(mockContext, mockResult);
      expect(output).toContain("feat: Add dashboard");
    });
  });
});
