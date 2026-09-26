// ============================================================================
// repo-dashboard/src/cli.ts: ESM entrypoint guard under a symlinked invocation
//
// The guard used to compare fileURLToPath(import.meta.url) directly against
// process.argv[1]. Under `npm link` (or any manual symlink into dist/),
// process.argv[1] is the symlink path, not the file it resolves to, so the
// comparison failed and the CLI exited 0 without running anything. The fix
// resolves both sides with realpathSync before comparing.
//
// This test builds the package into a private temporary directory, links a
// scratch symlink to the built CLI there, and asserts the linked binary
// actually runs (prints help, exits 0). Building into a temp outDir (see
// ./test-support/build-into-temp-dist.ts) rather than the package's own
// dist/ means this build cannot race another test file's build, and a tsc
// failure is surfaced in the thrown error instead of being hidden behind
// piped, unread stdio.
// ============================================================================

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildIntoTempDist } from "./test-support/build-into-temp-dist.js";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));

let buildDir: string;
let scratchDir: string;
let linkedCli: string;

// Builds the package with tsc; vitest's 10 s default hook timeout is too
// tight when several package builds run in parallel on a CI runner.
const BUILD_TIMEOUT_MS = 120_000;

beforeAll(() => {
  const { outDir } = buildIntoTempDist(packageRoot);
  buildDir = outDir;
  const builtCli = join(outDir, "cli.js");

  scratchDir = mkdtempSync(join(tmpdir(), "repo-dashboard-entry-guard-"));
  const binDir = join(scratchDir, "bin");
  mkdirSync(binDir, { recursive: true });
  linkedCli = join(binDir, "repo-dash");
  symlinkSync(builtCli, linkedCli);
}, BUILD_TIMEOUT_MS);

afterAll(() => {
  if (scratchDir) {
    rmSync(scratchDir, { recursive: true, force: true });
  }
  if (buildDir) {
    rmSync(buildDir, { recursive: true, force: true });
  }
});

describe("CLI entry guard (symlinked invocation)", () => {
  it("runs the program and prints help when invoked through a symlink", () => {
    const output = execFileSync("node", [linkedCli, "--help"], { encoding: "utf8" });

    expect(output).toContain("Usage: repo-dash");
    expect(output).toContain("GitHub repository dashboard");
  });
});
