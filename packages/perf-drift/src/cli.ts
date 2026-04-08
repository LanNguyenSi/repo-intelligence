#!/usr/bin/env node
/**
 * Performance Drift Detector
 * Track build times, bundle sizes, and test duration over time
 */

import { Command } from "commander";
import chalk from "chalk";
import { trackMetrics } from "./commands/track.js";
import { checkDrift } from "./commands/check.js";
import { showReport } from "./commands/report.js";
import { setBaseline } from "./commands/baseline.js";
import { resetData } from "./commands/reset.js";
import { validatePositiveNumber, validatePositiveInt } from "./lib/validate.js";
import { loadConfig } from "./lib/config.js";

const program = new Command();

program
  .name("drift")
  .description("Track performance metrics and detect regressions over time")
  .version("0.1.0");

program
  .command("track")
  .description("Record current performance metrics")
  .option("-b, --build-time <seconds>", "Build time in seconds", (v) => validatePositiveNumber(v, "--build-time"))
  .option("-s, --bundle-size <bytes>", "Bundle size in bytes", (v) => validatePositiveInt(v, "--bundle-size"))
  .option("-t, --test-time <seconds>", "Test duration in seconds", (v) => validatePositiveNumber(v, "--test-time"))
  .option("-m, --message <text>", "Optional message/commit hash")
  .option("--auto", "Auto-detect metrics from common tools")
  .option("--run <command>", "Run a command and measure its execution time as build time")
  .action(async (options) => {
    try {
      await trackMetrics(options);
    } catch (error) {
      console.error(chalk.red("✗ Error:"), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command("check")
  .description("Check for performance regressions (exit 1 if detected)")
  .option("-t, --threshold <percent>", "Regression threshold percentage", (v) => validatePositiveNumber(v, "--threshold"))
  .option("--fail-on-regression", "Exit with code 1 on regression (CI mode)", true)
  .option("--json", "Output results as JSON")
  .action(async (options) => {
    try {
      const config = loadConfig();
      options.threshold = options.threshold ?? config.threshold;
      const hasRegression = await checkDrift(options);
      if (hasRegression && options.failOnRegression) {
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red("✗ Error:"), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command("report")
  .description("Show performance trends and history")
  .option("-d, --days <number>", "Show last N days", (v) => validatePositiveInt(v, "--days"))
  .option("-l, --limit <number>", "Show last N measurements", (v) => validatePositiveInt(v, "--limit"))
  .option("--json", "Output results as JSON")
  .action(async (options) => {
    try {
      await showReport(options);
    } catch (error) {
      console.error(chalk.red("✗ Error:"), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command("baseline")
  .description("Set current metrics as new baseline")
  .option("-m, --message <text>", "Baseline message")
  .action(async (options) => {
    try {
      await setBaseline(options);
    } catch (error) {
      console.error(chalk.red("✗ Error:"), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command("reset")
  .description("Reset metrics database")
  .option("--force", "Skip confirmation prompt")
  .action(async (options) => {
    try {
      await resetData(options);
    } catch (error) {
      console.error(chalk.red("✗ Error:"), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();
