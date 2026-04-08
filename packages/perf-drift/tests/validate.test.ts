import { describe, it, expect } from "vitest";
import { validatePositiveNumber, validatePositiveInt } from "../src/lib/validate.js";

describe("validatePositiveNumber", () => {
  it("accepts valid positive float", () => {
    expect(validatePositiveNumber("42.5", "--build-time")).toBe(42.5);
  });

  it("accepts zero", () => {
    expect(validatePositiveNumber("0", "--build-time")).toBe(0);
  });

  it("rejects negative numbers", () => {
    expect(() => validatePositiveNumber("-5", "--build-time")).toThrow("must be positive");
  });

  it("rejects non-numeric strings", () => {
    expect(() => validatePositiveNumber("abc", "--build-time")).toThrow("must be a valid number");
  });
});

describe("validatePositiveInt", () => {
  it("accepts valid positive integer", () => {
    expect(validatePositiveInt("100", "--bundle-size")).toBe(100);
  });

  it("rejects negative integers", () => {
    expect(() => validatePositiveInt("-10", "--bundle-size")).toThrow("must be positive");
  });

  it("rejects non-numeric strings", () => {
    expect(() => validatePositiveInt("xyz", "--bundle-size")).toThrow("must be a valid integer");
  });
});
