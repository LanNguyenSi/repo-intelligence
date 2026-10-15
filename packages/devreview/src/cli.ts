#!/usr/bin/env node
// ============================================================================
// DevReview — CLI
// ============================================================================

import 'dotenv/config';

import { Command } from 'commander';

import { loadConfig, mergeConfig } from './config.js';
import { isEntryPoint } from './is-entry-point.js';
import { Reviewer } from './reviewer/reviewer.js';
import { createWebhookServer } from './server/webhook.js';
import type { ReviewConfig } from './types.js';

type ReviewCommandOptions = {
  comment?: boolean;
  minScore?: string;
  token?: string;
  config?: string;
};

type ScoreCommandOptions = {
  token?: string;
  config?: string;
};

type ServerCommandOptions = {
  port: string;
  token?: string;
  secret?: string;
  config?: string;
};

export const program = new Command();

program
  .name('devreview')
  .description('Automated GitHub PR code review with intelligent scoring')
  .version('0.1.0');

program
  .command('review')
  .description('Review a GitHub PR')
  .argument('<pr-url>', 'GitHub PR URL (e.g., https://github.com/owner/repo/pull/1)')
  .option('--comment', 'Submit the result as a GitHub review (APPROVE or REQUEST_CHANGES)')
  .option(
    '--min-score <score>',
    'With --comment: score at or above which the review approves (default: rules.minScore from .devreview.json, else 7)',
  )
  .option('--token <token>', 'GitHub token (or set GITHUB_TOKEN env)')
  .option('--config <path>', 'Path to a .devreview.json file')
  .action(async (prUrl: string, options: ReviewCommandOptions) => {
    try {
      const token = requireGitHubToken(options.token);
      const { owner, repo, prNumber } = parsePullRequestUrl(prUrl);
      const baseConfig = await loadConfig(options.config);
      const config = applyMinScoreFlag(baseConfig, options.minScore);
      const reviewer = new Reviewer(token, config);

      if (options.comment) {
        console.log(`Reviewing and submitting a review on ${owner}/${repo}#${prNumber}...`);
        const result = await reviewer.reviewAndComment(owner, repo, prNumber);
        console.log(`\n  Review submitted. Score: ${result.score.overall}/10\n`);
        return;
      }

      const output = await reviewer.reviewForTerminal(owner, repo, prNumber);
      console.log(output);
    } catch (error) {
      exitWithError(error);
    }
  });

program
  .command('score')
  .description('Quick score without posting (dry run)')
  .argument('<pr-url>', 'GitHub PR URL')
  .option('--token <token>', 'GitHub token (or set GITHUB_TOKEN env)')
  .option('--config <path>', 'Path to a .devreview.json file')
  .action(async (prUrl: string, options: ScoreCommandOptions) => {
    try {
      const token = requireGitHubToken(options.token);
      const { owner, repo, prNumber } = parsePullRequestUrl(prUrl);
      const config = await loadConfig(options.config);
      const reviewer = new Reviewer(token, config);
      const result = await reviewer.reviewPR(owner, repo, prNumber);
      console.log(JSON.stringify(result.score, null, 2));
    } catch (error) {
      exitWithError(error);
    }
  });

program
  .command('server')
  .description('Start the webhook server')
  .option('--port <port>', 'Port to listen on', process.env.PORT ?? '3000')
  .option('--token <token>', 'GitHub token (or set GITHUB_TOKEN env)')
  .option('--secret <secret>', 'Webhook secret (or set WEBHOOK_SECRET env)')
  .option('--config <path>', 'Path to a .devreview.json file')
  .action(async (options: ServerCommandOptions) => {
    try {
      const token = requireGitHubToken(options.token);
      const secret = options.secret ?? process.env.WEBHOOK_SECRET;

      if (!secret) {
        throw new Error('Webhook secret required. Set WEBHOOK_SECRET env or use --secret');
      }

      const port = parsePort(options.port);
      const config = await loadConfig(options.config);
      const server = createWebhookServer({
        githubToken: token,
        webhookSecret: secret,
        port,
        config,
      });

      server.start();
    } catch (error) {
      exitWithError(error);
    }
  });

if (isEntryPoint(import.meta.url)) {
  program.parseAsync().catch((error) => {
    exitWithError(error);
  });
}

export function parsePullRequestUrl(prUrl: string): { owner: string; repo: string; prNumber: number } {
  const match = prUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);

  if (!match) {
    throw new Error('Invalid PR URL. Expected: https://github.com/owner/repo/pull/123');
  }

  const [, owner, repo, prNumber] = match;

  return {
    owner,
    repo,
    prNumber: Number.parseInt(prNumber, 10),
  };
}

export function parseScoreThreshold(value: string): number {
  const score = Number.parseFloat(value);

  if (!Number.isFinite(score) || score < 0 || score > 10) {
    throw new Error('Minimum score must be a number between 0 and 10');
  }

  return score;
}

/**
 * Precedence: --min-score flag, then rules.minScore from the loaded config
 * (which already falls back to the built-in default). The config value gets
 * the same 0-10 validation as the flag.
 */
export function applyMinScoreFlag(baseConfig: ReviewConfig, minScoreFlag?: string): ReviewConfig {
  if (minScoreFlag === undefined) {
    try {
      parseScoreThreshold(String(baseConfig.rules.minScore));
    } catch {
      throw new Error(
        `Invalid .devreview.json rules.minScore: ${String(baseConfig.rules.minScore)} (must be a number between 0 and 10)`,
      );
    }
    return baseConfig;
  }

  return mergeConfig({
    ...baseConfig,
    rules: {
      ...baseConfig.rules,
      minScore: parseScoreThreshold(minScoreFlag),
    },
  });
}

export function parsePort(value: string): number {
  const port = Number.parseInt(value, 10);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('Port must be a positive integer');
  }

  return port;
}

export function requireGitHubToken(tokenOverride?: string): string {
  const token = tokenOverride ?? process.env.GITHUB_TOKEN;

  if (!token) {
    throw new Error('GitHub token required. Set GITHUB_TOKEN env or use --token');
  }

  return token;
}

function exitWithError(error: unknown): never {
  console.error('Error:', error instanceof Error ? error.message : error);
  process.exit(1);
}
