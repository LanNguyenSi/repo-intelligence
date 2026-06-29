// ============================================================================
// Gap 6 (MED): devreview/src/cli.ts — parseArgs / command dispatch helpers
//
// Production seam: ESM entrypoint guard wraps program.parseAsync() so that
// importing cli.ts in tests does NOT execute commander.
// Utility functions are exported for direct testing.
// ============================================================================

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  parsePullRequestUrl,
  parseScoreThreshold,
  parsePort,
  requireGitHubToken,
} from './cli.js';

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
