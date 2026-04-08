/**
 * Track command - record current performance metrics
 */

import chalk from "chalk";
import { execSync } from "child_process";
import { insertMetric } from "../lib/db.js";
import { autoDetectMetrics } from "../lib/autodetect.js";
import { formatBytes } from "../lib/format.js";

export async function trackMetrics(options: {
  buildTime?: number;
  bundleSize?: number;
  testTime?: number;
  message?: string;
  auto?: boolean;
  run?: string;
}): Promise<void> {
  let buildTime = options.buildTime;
  let bundleSize = options.bundleSize;
  let testTime = options.testTime;

  // Run command and measure time
  if (options.run) {
    console.log(chalk.cyan(`⏱ Running: ${options.run}\n`));
    const start = Date.now();
    try {
      execSync(options.run, { stdio: "inherit", shell: "/bin/bash" });
    } catch {
      throw new Error(`Command failed: ${options.run}`);
    }
    const elapsed = (Date.now() - start) / 1000;
    buildTime = buildTime ?? elapsed;
    console.log(chalk.cyan(`\n⏱ Command completed in ${elapsed.toFixed(2)}s\n`));
  }

  // Auto-detect if requested
  if (options.auto) {
    console.log(chalk.cyan("🔍 Auto-detecting metrics...\n"));
    const detected = await autoDetectMetrics();
    buildTime = buildTime ?? detected.buildTime;
    bundleSize = bundleSize ?? detected.bundleSize;
    testTime = testTime ?? detected.testTime;
  }

  if (!buildTime && !bundleSize && !testTime) {
    console.log(chalk.red("✗ No metrics provided. Use --build-time, --bundle-size, --test-time, --auto, or --run"));
    process.exit(1);
  }

  const id = insertMetric({
    timestamp: Date.now(),
    buildTime,
    bundleSize,
    testTime,
    message: options.message,
    baseline: false,
  });

  console.log(chalk.green("✓ Metrics recorded!\n"));
  console.log(chalk.bold("Recorded:"));
  if (buildTime) console.log(`  Build time:  ${chalk.yellow(buildTime.toFixed(2))}s`);
  if (bundleSize) console.log(`  Bundle size: ${chalk.yellow(formatBytes(bundleSize))}`);
  if (testTime) console.log(`  Test time:   ${chalk.yellow(testTime.toFixed(2))}s`);
  if (options.message) console.log(`  Message:     ${chalk.gray(options.message)}`);
  console.log(chalk.gray(`\nMetric ID: ${id}`));
}
