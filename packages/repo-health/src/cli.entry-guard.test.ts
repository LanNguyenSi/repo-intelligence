// ============================================================================
// repo-health/src/cli.ts — ESM entrypoint guard under a symlinked invocation
//
// The guard used to compare fileURLToPath(import.meta.url) directly against
// process.argv[1]. Under `npm link` (or any manual symlink into dist/),
// process.argv[1] is the symlink path, not the file it resolves to, so the
// comparison failed and the CLI exited 0 without running anything. The fix
// resolves both sides with realpathSync before comparing.
//
// This test builds the package, links a scratch symlink to the built CLI,
// and asserts the linked binary actually runs (prints help, exits 0).
// ============================================================================

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const builtCli = join(packageRoot, "dist", "cli.js");

let scratchDir: string;
let linkedCli: string;

beforeAll(() => {
  // Build so dist/cli.js reflects current source; keeps this test hermetic
  // and correct regardless of what ran before it in the same process.
  execFileSync("npm", ["run", "build"], { cwd: packageRoot, stdio: "pipe" });

  scratchDir = mkdtempSync(join(tmpdir(), "repo-health-entry-guard-"));
  const binDir = join(scratchDir, "bin");
  mkdirSync(binDir, { recursive: true });
  linkedCli = join(binDir, "repo-health");
  symlinkSync(builtCli, linkedCli);
});

afterAll(() => {
  if (scratchDir) {
    rmSync(scratchDir, { recursive: true, force: true });
  }
});

describe("CLI entry guard (symlinked invocation)", () => {
  it("runs the program and prints help when invoked through a symlink", () => {
    const output = execFileSync("node", [linkedCli, "--help"], { encoding: "utf8" });

    expect(output).toContain("Usage: repo-health");
    expect(output).toContain("Repository health checker");
  });
});
