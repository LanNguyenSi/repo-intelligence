// ============================================================================
// Gap 6 (MED): devreview/src/cli.ts — parseArgs / command dispatch helpers
//
// Production seam: ESM entrypoint guard wraps program.parseAsync() so that
// importing cli.ts in tests does NOT execute commander.
// Utility functions are exported for direct testing.
// ============================================================================

import { describe, it, expect, vi, afterEach } from 'vitest';

const { reviewerCtor, loadConfigMock } = vi.hoisted(() => ({
  reviewerCtor: vi.fn(),
  loadConfigMock: vi.fn(),
}));

vi.mock('./reviewer/reviewer.js', () => ({
  Reviewer: class {
    constructor(token: string, config: unknown) {
      reviewerCtor(token, config);
    }
    async reviewForTerminal() {
      return 'terminal output';
    }
  },
}));

vi.mock('./config.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./config.js')>()),
  loadConfig: loadConfigMock,
}));

import {
  parsePullRequestUrl,
  parseScoreThreshold,
  parsePort,
  requireGitHubToken,
  applyMinScoreFlag,
  program,
} from './cli.js';
import { mergeConfig } from './config.js';
import { DEFAULT_CONFIG } from './types.js';

afterEach(() => {
  delete process.env.GITHUB_TOKEN;
});

// ---------------------------------------------------------------------------
// parsePullRequestUrl
// ---------------------------------------------------------------------------
describe('parsePullRequestUrl', () => {
  it('parses a valid GitHub PR URL', () => {
    const result = parsePullRequestUrl('https://github.com/acme/rocket/pull/42');
    expect(result).toEqual({ owner: 'acme', repo: 'rocket', prNumber: 42 });
  });

  it('throws for a URL that is not a GitHub PR URL', () => {
    expect(() => parsePullRequestUrl('https://github.com/acme/rocket')).toThrow(
      'Invalid PR URL',
    );
  });

  it('throws for a completely invalid URL', () => {
    expect(() => parsePullRequestUrl('not-a-url')).toThrow('Invalid PR URL');
  });

  it('parses PR number as an integer', () => {
    const { prNumber } = parsePullRequestUrl('https://github.com/org/repo/pull/123');
    expect(prNumber).toBe(123);
    expect(typeof prNumber).toBe('number');
  });
});

// ---------------------------------------------------------------------------
// parseScoreThreshold
// ---------------------------------------------------------------------------
describe('parseScoreThreshold', () => {
  it('accepts 0', () => expect(parseScoreThreshold('0')).toBe(0));
  it('accepts 7', () => expect(parseScoreThreshold('7')).toBe(7));
  it('accepts 10', () => expect(parseScoreThreshold('10')).toBe(10));
  it('accepts decimals', () => expect(parseScoreThreshold('7.5')).toBe(7.5));

  it('throws for non-numeric input', () => {
    expect(() => parseScoreThreshold('abc')).toThrow();
  });

  it('throws for values below 0', () => {
    expect(() => parseScoreThreshold('-1')).toThrow();
  });

  it('throws for values above 10', () => {
    expect(() => parseScoreThreshold('11')).toThrow();
  });
});

// ---------------------------------------------------------------------------
// parsePort
// ---------------------------------------------------------------------------
describe('parsePort', () => {
  it('accepts a valid port', () => expect(parsePort('3000')).toBe(3000));
  it('accepts port 1', () => expect(parsePort('1')).toBe(1));

  it('throws for port 0', () => {
    expect(() => parsePort('0')).toThrow('positive integer');
  });

  it('throws for a negative port', () => {
    expect(() => parsePort('-80')).toThrow('positive integer');
  });

  it('throws for a non-integer string', () => {
    expect(() => parsePort('abc')).toThrow();
  });
});

// ---------------------------------------------------------------------------
// requireGitHubToken
// ---------------------------------------------------------------------------
describe('requireGitHubToken', () => {
  it('returns the token passed as an explicit option', () => {
    expect(requireGitHubToken('mytoken')).toBe('mytoken');
  });

  it('falls back to GITHUB_TOKEN env var', () => {
    process.env.GITHUB_TOKEN = 'env-token';
    expect(requireGitHubToken()).toBe('env-token');
  });

  it('throws when no token is provided and GITHUB_TOKEN is unset', () => {
    delete process.env.GITHUB_TOKEN;
    expect(() => requireGitHubToken()).toThrow('GitHub token required');
  });
});

// ---------------------------------------------------------------------------
// applyMinScoreFlag: flag > config file > built-in default
// ---------------------------------------------------------------------------
describe('applyMinScoreFlag', () => {
  it('uses the built-in default when neither flag nor config set a score', () => {
    expect(applyMinScoreFlag(DEFAULT_CONFIG, undefined).rules.minScore).toBe(7);
  });

  it('keeps rules.minScore from the loaded config when no flag is given', () => {
    const config = mergeConfig({ rules: { minScore: 4 } });
    expect(applyMinScoreFlag(config, undefined).rules.minScore).toBe(4);
  });

  it('lets the flag override the config value', () => {
    const config = mergeConfig({ rules: { minScore: 4 } });
    expect(applyMinScoreFlag(config, '9').rules.minScore).toBe(9);
  });

  it('rejects an invalid flag value', () => {
    expect(() => applyMinScoreFlag(DEFAULT_CONFIG, '11')).toThrow('between 0 and 10');
  });

  it('rejects an out-of-range rules.minScore from the config file', () => {
    const config = mergeConfig({ rules: { minScore: 15 } });
    expect(() => applyMinScoreFlag(config, undefined)).toThrow(
      '.devreview.json rules.minScore',
    );
  });

  it('accepts a flag that overrides an invalid config value', () => {
    const config = mergeConfig({ rules: { minScore: 15 } });
    expect(applyMinScoreFlag(config, '6').rules.minScore).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// review command: option parsing through commander
// ---------------------------------------------------------------------------
describe('review command', () => {
  it('passes rules.minScore from the loaded config to the Reviewer when --min-score is absent', async () => {
    reviewerCtor.mockClear();
    loadConfigMock.mockResolvedValue(mergeConfig({ rules: { minScore: 4 } }));
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    await program.parseAsync(
      ['review', 'https://github.com/acme/rocket/pull/1', '--token', 't'],
      { from: 'user' },
    );

    log.mockRestore();
    expect(reviewerCtor).toHaveBeenCalledTimes(1);
    expect(reviewerCtor.mock.calls[0][1].rules.minScore).toBe(4);
  });
});
