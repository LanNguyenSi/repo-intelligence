/**
 * Report command - show performance trends
 */

import chalk from "chalk";
import { getMetrics, getMetricsSince } from "../lib/db.js";
import { formatBytes } from "../lib/format.js";

function getTerminalWidth(): number {
  try {
    return process.stdout.columns || 100;
  } catch {
    return 100;
  }
}

export async function showReport(options: { days?: number; limit?: number; json?: boolean }): Promise<void> {
  let metrics;

  if (options.days) {
    const cutoff = Date.now() - options.days * 24 * 60 * 60 * 1000;
    metrics = getMetricsSince(cutoff);
  } else {
    const limit = options.limit ?? 20;
    metrics = getMetrics(limit);
  }

  if (metrics.length === 0) {
    if (options.json) {
      console.log(JSON.stringify({ metrics: [], stats: {} }));
    } else {
      console.log(chalk.yellow("No metrics recorded yet."));
    }
    return;
  }

  // Calculate stats
  const buildTimes = metrics.filter((m) => m.buildTime != null).map((m) => m.buildTime!);
  const bundleSizes = metrics.filter((m) => m.bundleSize != null).map((m) => m.bundleSize!);
  const testTimes = metrics.filter((m) => m.testTime != null).map((m) => m.testTime!);

  const stats: Record<string, { avg: number; min: number; max: number; samples: number }> = {};

  if (buildTimes.length > 0) {
    stats.buildTime = {
      avg: buildTimes.reduce((a, b) => a + b, 0) / buildTimes.length,
      min: Math.min(...buildTimes),
      max: Math.max(...buildTimes),
      samples: buildTimes.length,
    };
  }

  if (bundleSizes.length > 0) {
    stats.bundleSize = {
      avg: bundleSizes.reduce((a, b) => a + b, 0) / bundleSizes.length,
      min: Math.min(...bundleSizes),
      max: Math.max(...bundleSizes),
      samples: bundleSizes.length,
    };
  }

  if (testTimes.length > 0) {
    stats.testTime = {
      avg: testTimes.reduce((a, b) => a + b, 0) / testTimes.length,
      min: Math.min(...testTimes),
      max: Math.max(...testTimes),
      samples: testTimes.length,
    };
  }

  if (options.json) {
    console.log(JSON.stringify({ metrics, stats }, null, 2));
    return;
  }

  console.log(chalk.bold.cyan(`\n📈 Performance Report (${metrics.length} measurements)\n`));

  // Dynamic message width based on terminal
  const fixedCols = 2 + 12 + 10 + 12 + 10; // marker + date + build + bundle + tests
  const msgWidth = Math.max(10, getTerminalWidth() - fixedCols - 4);

  // Table header
  console.log(
    chalk.bold(
      `${"Date".padEnd(12)} ${"Build".padEnd(10)} ${"Bundle".padEnd(12)} ${"Tests".padEnd(10)} ${"Message".padEnd(msgWidth)}`
    )
  );
  console.log("─".repeat(Math.min(getTerminalWidth(), 120)));

  // Reverse to show oldest first
  for (const metric of metrics.reverse()) {
    const date = new Date(metric.timestamp).toISOString().split("T")[0];
    const buildTime = metric.buildTime ? `${metric.buildTime.toFixed(2)}s` : "-";
    const bundleSize = metric.bundleSize ? formatBytes(metric.bundleSize) : "-";
    const testTime = metric.testTime ? `${metric.testTime.toFixed(2)}s` : "-";
    const message = metric.message ? metric.message.substring(0, msgWidth) : "";
    const baselineMarker = metric.baseline ? chalk.yellow("⭐") : " ";

    console.log(
      `${baselineMarker} ${date.padEnd(10)} ${buildTime.padEnd(10)} ${bundleSize.padEnd(12)} ${testTime.padEnd(10)} ${chalk.gray(message)}`
    );
  }

  console.log();

  // Summary stats
  if (stats.buildTime) {
    const s = stats.buildTime;
    console.log(
      chalk.bold("Build time:  ") +
        `avg ${s.avg.toFixed(2)}s  min ${s.min.toFixed(2)}s  max ${s.max.toFixed(2)}s  ` +
        chalk.gray(`(${s.samples} samples)`)
    );
  }

  if (stats.bundleSize) {
    const s = stats.bundleSize;
    console.log(
      chalk.bold("Bundle size: ") +
        `avg ${formatBytes(s.avg)}  min ${formatBytes(s.min)}  max ${formatBytes(s.max)}  ` +
        chalk.gray(`(${s.samples} samples)`)
    );
  }

  if (stats.testTime) {
    const s = stats.testTime;
    console.log(
      chalk.bold("Test time:   ") +
        `avg ${s.avg.toFixed(2)}s  min ${s.min.toFixed(2)}s  max ${s.max.toFixed(2)}s  ` +
        chalk.gray(`(${s.samples} samples)`)
    );
  }

  console.log();
}
