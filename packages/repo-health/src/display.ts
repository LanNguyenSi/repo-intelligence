// ============================================================================
// repo-health — Terminal Display
// ============================================================================

import chalk from "chalk";
import type { HealthReport, CheckResult } from "./checks.js";

function scoreColor(score: number): (s: string) => string {
  if (score >= 9) return chalk.green;
  if (score >= 7) return chalk.yellow;
  if (score >= 5) return chalk.hex("#FFA500"); // orange
  return chalk.red;
}

function gradeColor(grade: string): (s: string) => string {
  if (grade === "A") return chalk.green;
  if (grade === "B") return chalk.yellow;
  if (grade === "C") return chalk.hex("#FFA500");
  return chalk.red;
}

function checkIcon(passed: boolean): string {
  return passed ? chalk.green("✅") : chalk.red("❌");
}

function scoreBar(score: number): string {
  const filled = Math.round(score);
  const empty = 10 - filled;
  return chalk.green("█".repeat(filled)) + chalk.gray("░".repeat(empty));
}

export function displayReport(report: HealthReport): void {
  const gc = gradeColor(report.grade);

  console.log();
  console.log(chalk.bold(`  🏥 repo-health — ${report.path}`));
  console.log();
  console.log(`  ${gc(chalk.bold(`Grade: ${report.grade}`))} ${scoreBar(report.score)} ${scoreColor(report.score)(`${report.score}/10`)}`);
  console.log();

  // Group by category
  const categories: Record<string, CheckResult[]> = {};
  for (const check of report.checks) {
    if (!categories[check.category]) categories[check.category] = [];
    categories[check.category].push(check);
  }

  const categoryLabels: Record<string, string> = {
    docs: "📝 Documentation",
    quality: "⚙️  Code Quality",
    ci: "🔄 CI/CD",
    testing: "🧪 Testing",
    security: "🔒 Security",
    deployment: "🐳 Deployment",
    ai: "🤖 AI Context",
  };

  for (const [cat, checks] of Object.entries(categories)) {
    console.log(chalk.bold(`  ${categoryLabels[cat] || cat}`));
    for (const check of checks) {
      const icon = checkIcon(check.passed);
      const sc = scoreColor(check.score)(`${check.score}/10`);
      console.log(`    ${icon} ${check.name} ${sc} ${chalk.gray(check.message)}`);
      if (check.suggestion) {
        console.log(`       ${chalk.yellow("→")} ${chalk.yellow(check.suggestion)}`);
      }
    }
    console.log();
  }

  // Summary
  const passed = report.checks.filter((c) => c.passed).length;
  const failed = report.checks.filter((c) => !c.passed).length;
  console.log(chalk.gray("─".repeat(50)));
  console.log(`  ${chalk.green(`${passed} passed`)} · ${failed > 0 ? chalk.red(`${failed} failed`) : chalk.green("0 failed")} · ${gc(chalk.bold(`Grade ${report.grade}`))}`);

  if (failed > 0) {
    console.log();
    console.log(chalk.yellow("  Suggestions:"));
    for (const check of report.checks.filter((c) => !c.passed && c.suggestion)) {
      console.log(chalk.yellow(`    → ${check.suggestion}`));
    }
  }
  console.log();
}

export function displayJSON(report: HealthReport): void {
  console.log(JSON.stringify(report, null, 2));
}
