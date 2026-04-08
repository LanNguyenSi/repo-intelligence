// ============================================================================
// repo-dashboard — Terminal Display
// ============================================================================

import chalk from "chalk";
import type { RepoInfo, PRInfo, WorkflowRunInfo } from "./github.js";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function statusIcon(conclusion: string | null, status: string): string {
  if (status === "in_progress") return chalk.yellow("⏳");
  if (conclusion === "success") return chalk.green("✅");
  if (conclusion === "failure") return chalk.red("❌");
  if (conclusion === "cancelled") return chalk.gray("⊘");
  return chalk.gray("○");
}

function langColor(lang: string | null): string {
  const colors: Record<string, (s: string) => string> = {
    TypeScript: chalk.blue,
    JavaScript: chalk.yellow,
    Python: chalk.green,
    Shell: chalk.magenta,
    Jinja: chalk.cyan,
  };
  if (!lang) return chalk.gray("—");
  return (colors[lang] || chalk.white)(lang);
}

export function displayHeader(owner: string): void {
  console.log();
  console.log(chalk.bold(`  📊 repo-dashboard — ${owner}`));
  console.log(chalk.gray(`  ${new Date().toLocaleString()}`));
  console.log();
}

export function displayRepos(repos: RepoInfo[], limit: number = 10): void {
  console.log(chalk.bold.underline("  Repositories") + chalk.gray(` (${repos.length} total, showing ${Math.min(limit, repos.length)} most recent)`));
  console.log();

  for (const repo of repos.slice(0, limit)) {
    const privacy = repo.isPrivate ? chalk.red("🔒") : chalk.green("🔓");
    const issues = repo.openIssues > 0 ? chalk.yellow(` ${repo.openIssues} issues`) : "";
    const stars = repo.stars > 0 ? chalk.yellow(` ⭐${repo.stars}`) : "";
    const updated = chalk.gray(timeAgo(repo.updatedAt));

    console.log(`  ${privacy} ${chalk.bold(repo.name)} ${langColor(repo.language)}${issues}${stars} ${updated}`);
    if (repo.description) {
      console.log(`     ${chalk.gray(repo.description.slice(0, 70))}`);
    }
  }
  console.log();
}

export function displayPRs(prs: PRInfo[]): void {
  console.log(chalk.bold.underline("  Open Pull Requests") + chalk.gray(` (${prs.length})`));
  console.log();

  if (prs.length === 0) {
    console.log(chalk.gray("  No open PRs 🎉"));
    console.log();
    return;
  }

  for (const pr of prs) {
    const draft = pr.draft ? chalk.gray(" [draft]") : "";
    const age = chalk.gray(timeAgo(pr.createdAt));
    console.log(`  ${chalk.cyan(`#${pr.number}`)} ${chalk.bold(pr.title)}${draft}`);
    console.log(`     ${chalk.gray(pr.repo)} by ${chalk.blue(pr.author)} ${age}`);
  }
  console.log();
}

export function displayPipelines(runs: WorkflowRunInfo[]): void {
  console.log(chalk.bold.underline("  Pipeline Status"));
  console.log();

  if (runs.length === 0) {
    console.log(chalk.gray("  No CI pipelines found"));
    console.log();
    return;
  }

  const failed = runs.filter((r) => r.conclusion === "failure");
  const passing = runs.filter((r) => r.conclusion === "success");
  const running = runs.filter((r) => r.status === "in_progress");

  console.log(`  ${chalk.green(`${passing.length} passing`)} · ${chalk.red(`${failed.length} failed`)} · ${chalk.yellow(`${running.length} running`)}`);
  console.log();

  // Show failed first, then running, then recent passing
  const sorted = [...failed, ...running, ...passing.slice(0, 5)];

  for (const run of sorted) {
    const icon = statusIcon(run.conclusion, run.status);
    const commit = run.commitMessage.slice(0, 50);
    const age = chalk.gray(timeAgo(run.updatedAt));
    console.log(`  ${icon} ${chalk.bold(run.repo)} ${chalk.gray(commit)} ${age}`);
  }
  console.log();
}

export function displaySummary(repos: RepoInfo[], prs: PRInfo[], runs: WorkflowRunInfo[]): void {
  const failed = runs.filter((r) => r.conclusion === "failure").length;
  const separator = chalk.gray("─".repeat(50));

  console.log(separator);
  console.log(
    `  ${chalk.bold("Summary:")} ${repos.length} repos · ${prs.length} open PRs · ${failed > 0 ? chalk.red(`${failed} failed`) : chalk.green("all green")}`,
  );

  if (prs.length > 0) {
    console.log(chalk.yellow(`  → ${prs.length} PR(s) waiting for review`));
  }
  if (failed > 0) {
    console.log(chalk.red(`  → ${failed} pipeline(s) need attention`));
  }
  console.log();
}
