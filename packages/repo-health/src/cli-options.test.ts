import { describe, it, expect } from "vitest";
import { parseMinScore } from "./cli-options.js";

describe("parseMinScore", () => {
  it("accepts values between 0 and 10", () => {
    expect(parseMinScore("0")).toBe(0);
    expect(parseMinScore("7.5")).toBe(7.5);
    expect(parseMinScore("10")).toBe(10);
  });

  it("rejects non-numeric values", () => {
    expect(() => parseMinScore("abc")).toThrow(
      'Invalid --min-score value "abc". Expected a number between 0 and 10.',
    );
  });

  it("rejects values outside range", () => {
    expect(() => parseMinScore("-1")).toThrow(
      'Invalid --min-score value "-1". Expected a number between 0 and 10.',
    );
    expect(() => parseMinScore("11")).toThrow(
      'Invalid --min-score value "11". Expected a number between 0 and 10.',
    );
  });
});
