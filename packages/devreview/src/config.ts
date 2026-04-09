import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { ReviewConfig } from './types.js';
import { DEFAULT_CONFIG } from './types.js';

type PartialReviewConfig = {
  rules?: Partial<ReviewConfig['rules']>;
  ignore?: string[];
  scoring?: Partial<ReviewConfig['scoring']>;
};

export function mergeConfig(overrides: PartialReviewConfig = {}): ReviewConfig {
  return {
    rules: {
      ...DEFAULT_CONFIG.rules,
      ...overrides.rules,
    },
    ignore: overrides.ignore ?? DEFAULT_CONFIG.ignore,
    scoring: {
      ...DEFAULT_CONFIG.scoring,
      ...overrides.scoring,
    },
  };
}

export async function loadConfig(configPath = '.devreview.json'): Promise<ReviewConfig> {
  const resolvedPath = path.resolve(process.cwd(), configPath);

  try {
    const contents = await readFile(resolvedPath, 'utf-8');
    const parsed = JSON.parse(contents) as PartialReviewConfig;
    return mergeConfig(parsed);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return DEFAULT_CONFIG;
    }

    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in ${resolvedPath}: ${error.message}`);
    }

    throw error;
  }
}
