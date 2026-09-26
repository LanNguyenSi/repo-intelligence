#!/usr/bin/env node
// ============================================================================
// repo-health — CLI Entry Point
// ============================================================================

import { realpathSync } from "fs";
import { fileURLToPath } from "url";

import { Command } from "commander";
import { resolve } from "path";
import { runHealthCheck } from "./checks.js";
import { displayReport, displayJSON } from "./display.js";
import { parseMinScore } from "./cli-options.js";

export const program = new Command();

program
  .name("repo-health")
  .description("Repository health checker — scores your repo's hygiene, docs, CI, and best practices")
  .version("0.1.0")
  .argument("[path]", "Path to repository", ".")
  .option("--json", "Output as JSON", false)
  .option("--min-score <score>", "Exit with error if score below threshold")
  .action((path: string, options: { json: boolean; minScore?: string }) => {
    const dir = resolve(path);
    const report = runHealthCheck(dir);

    if (options.json) {
      displayJSON(report);
    } else {
      displayReport(report);
    }

    // CI gate: fail if below minimum score
    if (options.minScore) {
      const min = parseMinScore(options.minScore);
      if (report.score < min) {
        console.error(`Score ${report.score} is below minimum ${min}`);
        process.exit(1);
      }
    }
  });

// ESM entrypoint guard: allows importing cli.ts in tests without executing commander.
// Compares real (symlink-resolved) paths so a linked or symlinked bin (npm link,
// a manual symlink into dist/) still matches: process.argv[1] is the symlink
// path, not the file the symlink points at, so a plain string comparison against
// fileURLToPath(import.meta.url) fails and the CLI silently exits 0.
function isEntryPoint(): boolean {
  const invokedPath = process.argv[1];

  if (!invokedPath) {
    return false;
  }

  try {
    return realpathSync(invokedPath) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isEntryPoint()) {
  program.parse();
}
