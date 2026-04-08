/**
 * Check command - detect performance regressions
 */

import chalk from "chalk";
import { getBaseline, getMetrics } from "../lib/db.js";
import { formatBytes, formatChange } from "../lib/format.js";

interface CheckResult {
  metric: string;
  baseline: number;
  current: number;
  changePercent: number;
  threshold: number;
  status: "ok" | "slower" | "regression";
}

export async function checkDrift(options: { threshold?: number; failOnRegression?: boolean; json?: boolean }): Promise<boolean> {
  const threshold = options.threshold ?? 10;

  const baseline = getBaseline();
  if (!baseline) {
    if (options.json) {
      console.log(JSON.stringify({ error: "No baseline set" }));
    } else {
      console.log(chalk.yellow("⚠ No baseline set. Run 'drift baseline' first."));
    }
    return false;
  }

  const recent = getMetrics(1)[0];
  if (!recent) {
    if (options.json) {
      console.log(JSON.stringify({ error: "No metrics recorded" }));
    } else {
      console.log(chalk.yellow("⚠ No metrics recorded yet."));
    }
    return false;
  }

  const results: CheckResult[] = [];
  let hasRegression = false;

  // Check build time
  if (baseline.buildTime && recent.buildTime) {
    const change = ((recent.buildTime - baseline.buildTime) / baseline.buildTime) * 100;
    const status = change > threshold ? "regression" : change > 0 ? "slower" : "ok";
    if (status === "regression") hasRegression = true;
    results.push({ metric: "buildTime", baseline: baseline.buildTime, current: recent.buildTime, changePercent: change, threshold, status });
  }

  // Check bundle size
  if (baseline.bundleSize && recent.bundleSize) {
    const change = ((recent.bundleSize - baseline.bundleSize) / baseline.bundleSize) * 100;
    const status = change > threshold ? "regression" : change > 0 ? "slower" : "ok";
    if (status === "regression") hasRegression = true;
    results.push({ metric: "bundleSize", baseline: baseline.bundleSize, current: recent.bundleSize, changePercent: change, threshold, status });
  }

  // Check test time
  if (baseline.testTime && recent.testTime) {
    const change = ((recent.testTime - baseline.testTime) / baseline.testTime) * 100;
    const status = change > threshold ? "regression" : change > 0 ? "slower" : "ok";
    if (status === "regression") hasRegression = true;
    results.push({ metric: "testTime", baseline: baseline.testTime, current: recent.testTime, changePercent: change, threshold, status });
  }

  if (options.json) {
    console.log(JSON.stringify({ threshold, hasRegression, results }, null, 2));
    return hasRegression;
  }

  console.log(chalk.bold.cyan("📊 Performance Check\n"));

  for (const r of results) {
    const statusLabel =
      r.status === "regression" ? chalk.red("REGRESSION") :
      r.status === "slower" ? chalk.yellow("SLOWER") :
      chalk.green("OK");

    if (r.metric === "buildTime") {
      console.log(`Build Time:  ${r.baseline.toFixed(2)}s → ${r.current.toFixed(2)}s (${formatChange(r.changePercent)}) ${statusLabel}`);
    } else if (r.metric === "bundleSize") {
      console.log(`Bundle Size: ${formatBytes(r.baseline)} → ${formatBytes(r.current)} (${formatChange(r.changePercent)}) ${statusLabel}`);
    } else if (r.metric === "testTime") {
      console.log(`Test Time:   ${r.baseline.toFixed(2)}s → ${r.current.toFixed(2)}s (${formatChange(r.changePercent)}) ${statusLabel}`);
    }
  }

  console.log(chalk.gray(`\nThreshold: ${threshold}%`));

  if (hasRegression) {
    console.log(chalk.red("\n❌ Performance regression detected!"));
  } else {
    console.log(chalk.green("\n✅ No regressions detected."));
  }

  return hasRegression;
}
