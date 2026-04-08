/**
 * Baseline command - set new performance baseline
 */

import chalk from "chalk";
import { getMetrics, setMetricAsBaseline, insertMetric, clearAllBaselines } from "../lib/db.js";
import { formatBytes } from "../lib/format.js";

export async function setBaseline(options: { message?: string }): Promise<void> {
  const recent = getMetrics(1)[0];

  if (!recent) {
    console.log(chalk.yellow("⚠ No metrics recorded yet. Track some metrics first with 'drift track'."));
    return;
  }

  // If user wants to create a new baseline with message, insert new metric
  if (options.message) {
    const id = insertMetric({
      timestamp: Date.now(),
      buildTime: recent.buildTime,
      bundleSize: recent.bundleSize,
      testTime: recent.testTime,
      message: options.message,
      baseline: true,
    });

    // Clear other baselines
    clearAllBaselines();
    setMetricAsBaseline(id);

    console.log(chalk.green("✓ New baseline set!\n"));
  } else {
    // Just mark the most recent metric as baseline
    setMetricAsBaseline(recent.id!);
    console.log(chalk.green("✓ Most recent metric set as baseline!\n"));
  }

  console.log(chalk.bold("Baseline:"));
  if (recent.buildTime) console.log(`  Build time:  ${chalk.yellow(recent.buildTime.toFixed(2))}s`);
  if (recent.bundleSize) console.log(`  Bundle size: ${chalk.yellow(formatBytes(recent.bundleSize))}`);
  if (recent.testTime) console.log(`  Test time:   ${chalk.yellow(recent.testTime.toFixed(2))}s`);
  if (options.message || recent.message) {
    console.log(`  Message:     ${chalk.gray(options.message || recent.message)}`);
  }

  console.log(chalk.gray("\nFuture 'drift check' commands will compare against this baseline."));
}
