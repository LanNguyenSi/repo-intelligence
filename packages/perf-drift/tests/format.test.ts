import { describe, it, expect } from "vitest";
import { formatBytes, formatChange } from "../src/lib/format.js";

describe("formatBytes", () => {
  it("formats bytes", () => {
    expect(formatBytes(500)).toBe("500 B");
  });

  it("formats kilobytes", () => {
    expect(formatBytes(2048)).toBe("2.00 KB");
  });

  it("formats megabytes", () => {
    expect(formatBytes(1048576)).toBe("1.00 MB");
  });

  it("formats fractional kilobytes", () => {
    expect(formatBytes(1536)).toBe("1.50 KB");
  });
});

describe("formatChange", () => {
  it("formats positive change with + sign", () => {
    expect(formatChange(12.5)).toBe("+12.5%");
  });

  it("formats negative change", () => {
    expect(formatChange(-5.3)).toBe("-5.3%");
  });

  it("formats zero change", () => {
    expect(formatChange(0)).toBe("0.0%");
  });
});
