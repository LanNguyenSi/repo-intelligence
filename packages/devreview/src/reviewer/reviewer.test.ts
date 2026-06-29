// ============================================================================
// Gap 3 (HIGH): devreview/src/reviewer/reviewer.ts — Reviewer orchestration
//
// Production seam: Reviewer constructor accepts optional `_deps` to inject
// mock collaborators. Runtime behavior is identical without the param.
//
// Tests: reviewPR, reviewAndComment, ignored-file filtering via matchesGlob
//
// MUTATION: invert the `!` in filterIgnoredFiles
// KILLED BY: ignored-file-filter test — expects lock file absent; mutated code
//   includes it (and excludes the real source file) so the assertion fails
// ============================================================================

import { describe, it, expect, vi } from 'vitest';
import { Reviewer } from './reviewer.js';
import type { ReviewScore, PRContext } from '../types.js';
import { DEFAULT_CONFIG } from '../types.js';

// ---------------------------------------------------------------------------
// Mock collaborator factories
// ---------------------------------------------------------------------------

function makeScore(overall = 8): ReviewScore {
  return { codeQuality: 8, architecture: 8, testing: 8, documentation: 8, bestPractices: 8, overall };
}

function makeMockScorer(score = makeScore()) {
  return { scorePR: vi.fn().mockReturnValue(score) };
}

function makeMockFormatter() {
  return {
    formatReview: vi.fn().mockReturnValue('## Review markdown'),
    formatTerminal: vi.fn().mockReturnValue('Terminal output'),
  };
}

function makeMockGitHub(prContext?: Partial<PRContext>) {
  const context: PRContext = {
    owner: 'acme',
    repo: 'rocket',
    prNumber: 42,
    title: 'feat: add feature',
    description: 'A pull request',
    files: [],
    commits: 2,
    additions: 50,
    deletions: 5,
    ...prContext,
  };
  return {
    getPRContext: vi.fn().mockResolvedValue(context),
    postReview: vi.fn().mockResolvedValue(undefined),
    getAIContext: vi.fn().mockResolvedValue({}),
  };
}

// ---------------------------------------------------------------------------
// reviewPR — basic orchestration
// ---------------------------------------------------------------------------
describe('Reviewer.reviewPR', () => {
  it('fetches PR context, filters files, scores, and returns a ReviewResult', async () => {
    const scorer = makeMockScorer();
    const formatter = makeMockFormatter();
    const github = makeMockGitHub({
      files: [{ filename: 'src/feature.ts', status: 'added', additions: 40, deletions: 0 }],
    });

    const reviewer = new Reviewer('token', DEFAULT_CONFIG, { scorer, formatter, github } as never);
    const result = await reviewer.reviewPR('acme', 'rocket', 42);

    expect(github.getPRContext).toHaveBeenCalledWith('acme', 'rocket', 42);
    expect(scorer.scorePR).toHaveBeenCalled();
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('strengths');
    expect(result).toHaveProperty('improvements');
    expect(result).toHaveProperty('recommendations');
  });
});

// ---------------------------------------------------------------------------
// Ignored-file filter — mutation guard
//
// MUTATION: change `!this.config.ignore.some(...)` to `this.config.ignore.some(...)`
// KILLED BY: assertion that lock file is absent from the filtered list
// ---------------------------------------------------------------------------
describe('Reviewer — ignored file filtering via matchesGlob', () => {
  it('strips files matching ignore patterns before scoring', async () => {
    const scorer = makeMockScorer();
    const formatter = makeMockFormatter();
    const github = makeMockGitHub({
      files: [
        { filename: 'src/feature.ts', status: 'added', additions: 40, deletions: 0 },
        { filename: 'package-lock.json', status: 'modified', additions: 1, deletions: 1 },
      ],
    });

    // DEFAULT_CONFIG.ignore includes 'package-lock.json'
    const reviewer = new Reviewer('token', DEFAULT_CONFIG, { scorer, formatter, github } as never);
    await reviewer.reviewPR('acme', 'rocket', 42);

    const calledContext = (scorer.scorePR as ReturnType<typeof vi.fn>).mock.calls[0][0] as PRContext;
    const filenames = calledContext.files.map((f) => f.filename);

    // Non-ignored file must be present
    expect(filenames).toContain('src/feature.ts');
    // Ignored file must be absent  [MUTATION KILL: with ! inverted, this contains package-lock.json]
    expect(filenames).not.toContain('package-lock.json');
  });

  it('keeps files that do not match any ignore pattern', async () => {
    const scorer = makeMockScorer();
    const formatter = makeMockFormatter();
    const github = makeMockGitHub({
      files: [{ filename: 'src/main.ts', status: 'added', additions: 20, deletions: 0 }],
    });

    const reviewer = new Reviewer('token', DEFAULT_CONFIG, { scorer, formatter, github } as never);
    await reviewer.reviewPR('acme', 'rocket', 42);

    const calledContext = (scorer.scorePR as ReturnType<typeof vi.fn>).mock.calls[0][0] as PRContext;
    expect(calledContext.files.map((f) => f.filename)).toContain('src/main.ts');
  });

  it('handles a custom ignore pattern (glob wildcard)', async () => {
    const scorer = makeMockScorer();
    const formatter = makeMockFormatter();
    const github = makeMockGitHub({
      files: [
        { filename: 'dist/bundle.js', status: 'added', additions: 100, deletions: 0 },
        { filename: 'src/app.ts', status: 'added', additions: 30, deletions: 0 },
      ],
    });

    const configWithDistIgnore = { ...DEFAULT_CONFIG, ignore: ['dist/**'] };
    const reviewer = new Reviewer('token', configWithDistIgnore, { scorer, formatter, github } as never);
    await reviewer.reviewPR('acme', 'rocket', 42);

    const calledContext = (scorer.scorePR as ReturnType<typeof vi.fn>).mock.calls[0][0] as PRContext;
    const filenames = calledContext.files.map((f) => f.filename);
    expect(filenames).not.toContain('dist/bundle.js');
    expect(filenames).toContain('src/app.ts');
  });
});

// ---------------------------------------------------------------------------
// reviewAndComment — posts the formatted review comment
// ---------------------------------------------------------------------------
describe('Reviewer.reviewAndComment', () => {
  it('calls postReview with the formatted markdown and APPROVE/REQUEST_CHANGES event', async () => {
    const scorer = makeMockScorer(makeScore(8)); // overall 8 >= minScore 7 → APPROVE
    const formatter = makeMockFormatter();
    const github = makeMockGitHub();

    const reviewer = new Reviewer('token', DEFAULT_CONFIG, { scorer, formatter, github } as never);
    const result = await reviewer.reviewAndComment('acme', 'rocket', 42);

    expect(github.postReview).toHaveBeenCalledOnce();
    const [owner, repo, prNum, markdown, event] = (github.postReview as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(owner).toBe('acme');
    expect(repo).toBe('rocket');
    expect(prNum).toBe(42);
    expect(markdown).toBe('## Review markdown');
    expect(event).toBe('APPROVE');

    expect(result).toHaveProperty('score');
  });

  it('uses REQUEST_CHANGES when overall score is below minScore', async () => {
    const scorer = makeMockScorer(makeScore(4)); // 4 < minScore 7 → REQUEST_CHANGES
    const formatter = makeMockFormatter();
    const github = makeMockGitHub();

    const reviewer = new Reviewer('token', DEFAULT_CONFIG, { scorer, formatter, github } as never);
    await reviewer.reviewAndComment('acme', 'rocket', 42);

    const [, , , , event] = (github.postReview as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(event).toBe('REQUEST_CHANGES');
  });

  it('filters ignored files before posting the comment', async () => {
    const scorer = makeMockScorer();
    const formatter = makeMockFormatter();
    const github = makeMockGitHub({
      files: [
        { filename: 'src/code.ts', status: 'added', additions: 10, deletions: 0 },
        { filename: 'yarn.lock', status: 'modified', additions: 5, deletions: 2 },
      ],
    });

    // DEFAULT_CONFIG.ignore includes '*.lock'
    const reviewer = new Reviewer('token', DEFAULT_CONFIG, { scorer, formatter, github } as never);
    await reviewer.reviewAndComment('acme', 'rocket', 42);

    const calledContext = (scorer.scorePR as ReturnType<typeof vi.fn>).mock.calls[0][0] as PRContext;
    const filenames = calledContext.files.map((f) => f.filename);
    expect(filenames).not.toContain('yarn.lock');
  });
});
