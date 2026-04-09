import { describe, expect, it } from 'vitest';

import { matchesGlob } from './glob.js';

describe('matchesGlob', () => {
  it('matches nested directories with **', () => {
    expect(matchesGlob('dist/**', 'dist/index.js')).toBe(true);
    expect(matchesGlob('dist/**', 'dist/nested/index.js')).toBe(true);
  });

  it('matches single path segments with *', () => {
    expect(matchesGlob('*.lock', 'package.lock')).toBe(true);
    expect(matchesGlob('*.lock', 'nested/package.lock')).toBe(false);
  });

  it('normalizes windows path separators', () => {
    expect(matchesGlob('node_modules/**', 'node_modules\\pkg\\index.js')).toBe(true);
  });
});
