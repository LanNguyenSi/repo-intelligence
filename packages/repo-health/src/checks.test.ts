import { describe, it, expect, afterEach } from "vitest";
import { runHealthCheck } from "./checks.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { mkdtemp, mkdir, rm, writeFile } from "fs/promises";
import os from "os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..");
const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs
      .splice(0)
      .map((dirPath) => rm(dirPath, { recursive: true, force: true })),
  );
});

describe("runHealthCheck", () => {
  it("returns a HealthReport with score and grade", () => {
    const report = runHealthCheck(repoRoot);
    expect(report.score).toBeGreaterThanOrEqual(0);
    expect(report.score).toBeLessThanOrEqual(10);
    expect(["A", "B", "C", "D", "F"]).toContain(report.grade);
    expect(report.checks.length).toBe(11);
  });

  it("all checks have required fields", () => {
    const report = runHealthCheck(repoRoot);
    for (const check of report.checks) {
      expect(check.name).toBeTruthy();
      expect(check.category).toBeTruthy();
      expect(typeof check.passed).toBe("boolean");
      expect(check.score).toBeGreaterThanOrEqual(0);
      expect(check.score).toBeLessThanOrEqual(10);
      expect(check.message).toBeTruthy();
    }
  });

  it("detects README in this repo", () => {
    const report = runHealthCheck(repoRoot);
    const readme = report.checks.find((c) => c.name === "README");
    expect(readme?.passed).toBe(true);
    expect(readme?.score).toBeGreaterThan(0);
  });

  it("detects .gitignore in this repo", () => {
    const report = runHealthCheck(repoRoot);
    const gitignore = report.checks.find((c) => c.name === ".gitignore");
    expect(gitignore?.passed).toBe(true);
  });

  it("detects License in this repo", () => {
    const report = runHealthCheck(repoRoot);
    const license = report.checks.find((c) => c.name === "License");
    expect(license?.passed).toBe(true);
  });

  it("detects test setup from test file patterns", async () => {
    const dir = await createTempRepo();
    await mkdir(join(dir, "src"), { recursive: true });
    await writeFile(
      join(dir, "package.json"),
      JSON.stringify({ scripts: { test: "vitest run" } }, null, 2),
      "utf8",
    );
    await writeFile(join(dir, "src", "math.spec.ts"), "export {};\n", "utf8");

    const report = runHealthCheck(dir);
    const tests = report.checks.find((c) => c.name === "Tests");
    expect(tests?.passed).toBe(true);
    expect(tests?.score).toBe(10);
  });

  it("does not treat random package.json text as a test script", async () => {
    const dir = await createTempRepo();
    await writeFile(
      join(dir, "package.json"),
      JSON.stringify(
        { name: "demo", description: 'contains the word "test" only here' },
        null,
        2,
      ),
      "utf8",
    );

    const report = runHealthCheck(dir);
    const tests = report.checks.find((c) => c.name === "Tests");
    expect(tests?.passed).toBe(false);
    expect(tests?.score).toBe(0);
  });
});

async function createTempRepo(): Promise<string> {
  const dir = await mkdtemp(join(os.tmpdir(), "repo-health-checks-"));
  tempDirs.push(dir);
  return dir;
}
