// ============================================================================
// DevReview — GitHub API Client
// ============================================================================

import { Octokit } from '@octokit/rest';
import type { PRContext, PRFile } from '../types.js';

type GitHubPullRequestFile = {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch?: string;
};

export class GitHubClient {
  private octokit: Octokit;

  constructor(token: string, octokit = new Octokit({ auth: token })) {
    this.octokit = octokit;
  }

  /**
   * Fetch full PR context for review
   */
  async getPRContext(owner: string, repo: string, prNumber: number): Promise<PRContext> {
    const [pr, files] = await Promise.all([
      this.octokit.pulls.get({ owner, repo, pull_number: prNumber }),
      this.octokit.paginate(this.octokit.pulls.listFiles, {
        owner,
        repo,
        pull_number: prNumber,
        per_page: 100,
      }) as Promise<GitHubPullRequestFile[]>,
    ]);

    return {
      owner,
      repo,
      prNumber,
      title: pr.data.title,
      description: pr.data.body || '',
      commits: pr.data.commits,
      additions: pr.data.additions,
      deletions: pr.data.deletions,
      files: files.map((f): PRFile => ({
        filename: f.filename,
        status: f.status as PRFile['status'],
        additions: f.additions,
        deletions: f.deletions,
        patch: f.patch,
      })),
    };
  }

  /**
   * Post a review comment on a PR
   */
  async postReview(
    owner: string,
    repo: string,
    prNumber: number,
    body: string,
    event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT' = 'COMMENT',
  ): Promise<void> {
    await this.octokit.pulls.createReview({
      owner,
      repo,
      pull_number: prNumber,
      body,
      event,
    });
  }

  /**
   * Post a comment on a PR (simpler than review)
   */
  async postComment(
    owner: string,
    repo: string,
    prNumber: number,
    body: string,
  ): Promise<void> {
    await this.octokit.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body,
    });
  }

  /**
   * Check if .ai/ context files exist in the repo
   */
  async getAIContext(owner: string, repo: string): Promise<{
    agents?: string;
    architecture?: string;
    decisions?: string;
  }> {
    const context: Record<string, string> = {};

    await Promise.all(
      ['AGENTS.md', 'ARCHITECTURE.md', 'DECISIONS.md'].map(async (file) => {
        try {
          const response = await this.octokit.repos.getContent({
            owner,
            repo,
            path: `.ai/${file}`,
          });
          if ('content' in response.data) {
            context[file.replace('.md', '').toLowerCase()] =
              Buffer.from(response.data.content, 'base64').toString('utf-8');
          }
        } catch {
          // File doesn't exist, skip
        }
      }),
    );

    return context;
  }
}
