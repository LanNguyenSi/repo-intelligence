import { describe, expect, it, vi } from 'vitest';

import { GitHubClient } from './client.js';

describe('GitHubClient', () => {
  it('paginates all files for PR context', async () => {
    const octokit = {
      pulls: {
        get: vi.fn().mockResolvedValue({
          data: {
            title: 'feat: paginate',
            body: 'Test body',
            commits: 2,
            additions: 12,
            deletions: 3,
          },
        }),
        listFiles: vi.fn(),
      },
      paginate: vi.fn().mockResolvedValue([
        { filename: 'src/one.ts', status: 'modified', additions: 4, deletions: 1, patch: '+const one = 1;' },
        { filename: 'src/two.ts', status: 'added', additions: 8, deletions: 2, patch: '+const two = 2;' },
      ]),
      repos: {
        getContent: vi.fn(),
      },
    };

    const client = new GitHubClient('token', octokit as never);
    const context = await client.getPRContext('acme', 'rocket', 7);

    expect(octokit.paginate).toHaveBeenCalledWith(octokit.pulls.listFiles, {
      owner: 'acme',
      repo: 'rocket',
      pull_number: 7,
      per_page: 100,
    });
    expect(context.files).toHaveLength(2);
    expect(context.files[1]?.filename).toBe('src/two.ts');
  });

  it('loads available .ai context files', async () => {
    const octokit = {
      pulls: {
        get: vi.fn(),
        listFiles: vi.fn(),
      },
      paginate: vi.fn(),
      repos: {
        getContent: vi.fn().mockImplementation(async ({ path }: { path: string }) => {
          if (path === '.ai/ARCHITECTURE.md') {
            return {
              data: {
                content: Buffer.from('System overview', 'utf-8').toString('base64'),
              },
            };
          }

          throw new Error('missing');
        }),
      },
    };

    const client = new GitHubClient('token', octokit as never);
    const context = await client.getAIContext('acme', 'rocket');

    expect(context.architecture).toBe('System overview');
    expect(context.agents).toBeUndefined();
    expect(context.decisions).toBeUndefined();
  });
});
