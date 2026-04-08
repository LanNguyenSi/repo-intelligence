#!/usr/bin/env node
// ============================================================================
// repo-dashboard — CLI Entry Point
// ============================================================================

import { Command } from "commander";
import { GitHubDashboard } from "./github.js";
import { displayHeader, displayRepos, displayPRs, displayPipelines, displaySummary } from "./display.js";

const program = new Command();

program
  .name("repo-dash")
  .description("GitHub repository dashboard — PRs, pipelines, issues at a glance")
  .version("0.1.0")
  .argument("[owner]", "GitHub username or org", "LanNguyenSi")
  .option("--token <token>", "GitHub token (or set GITHUB_TOKEN env)")
  .option("--repos <count>", "Number of repos to show", "10")
  .option("--prs", "Show only open PRs", false)
  .option("--ci", "Show only pipeline status", false)
  .option("--json", "Output as JSON", false)
  .action(async (owner: string, options: {
    token?: string;
    repos: string;
    prs: boolean;
    ci: boolean;
    json: boolean;
  }) => {
    const token = options.token || process.env.GITHUB_TOKEN;
    if (!token) {
      console.error("Error: GitHub token required. Set GITHUB_TOKEN env or use --token");
      process.exit(1);
    }

    const dashboard = new GitHubDashboard(token);

    try {
      // Fetch all data in parallel
      const [repos, prs, runs] = await Promise.all([
        dashboard.getRepos(owner),
        dashboard.getOpenPRs(owner),
        dashboard.getLatestWorkflowRuns(owner),
      ]);

      if (options.json) {
        console.log(JSON.stringify({ repos, prs, runs }, null, 2));
        return;
      }

      displayHeader(owner);

      if (options.prs) {
        displayPRs(prs);
      } else if (options.ci) {
        displayPipelines(runs);
      } else {
        // Full dashboard
        displayRepos(repos, parseInt(options.repos));
        displayPRs(prs);
        displayPipelines(runs);
        displaySummary(repos, prs, runs);
      }
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();
