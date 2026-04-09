import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { loadConfig, mergeConfig } from './config.js';

const cwd = process.cwd();
const tempDirs: string[] = [];

afterEach(async () => {
  process.chdir(cwd);
  await Promise.all(tempDirs.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('mergeConfig', () => {
  it('deep-merges nested review settings', () => {
    const merged = mergeConfig({
      rules: { minScore: 9 },
      scoring: { testing: 40 },
    });

    expect(merged.rules.requireTests).toBe(true);
    expect(merged.rules.minScore).toBe(9);
    expect(merged.scoring.testing).toBe(40);
    expect(merged.scoring.codeQuality).toBe(30);
  });
});

describe('loadConfig', () => {
  it('returns defaults when no config file exists', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'devreview-config-'));
    tempDirs.push(directory);
    process.chdir(directory);

    const config = await loadConfig();

    expect(config.rules.minScore).toBe(7);
    expect(config.ignore).toContain('package-lock.json');
  });

  it('loads and merges a config file from disk', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'devreview-config-'));
    tempDirs.push(directory);
    process.chdir(directory);
    await writeFile(
      path.join(directory, '.devreview.json'),
      JSON.stringify({
        rules: { requireDocs: false, minScore: 8 },
        ignore: ['coverage/**'],
      }),
    );

    const config = await loadConfig();

    expect(config.rules.requireTests).toBe(true);
    expect(config.rules.requireDocs).toBe(false);
    expect(config.rules.minScore).toBe(8);
    expect(config.ignore).toEqual(['coverage/**']);
  });
});
