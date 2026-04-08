#!/usr/bin/env node
// ============================================================================
// repo-health — CLI Entry Point
// ============================================================================

import { Command } from "commander";
import { resolve } from "path";
import { runHealthCheck } from "./checks.js";
import { displayReport, displayJSON } from "./display.js";
import { parseMinScore } from "./cli-options.js";

const program = new Command();

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

program.parse();
