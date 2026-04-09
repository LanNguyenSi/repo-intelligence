export interface ReviewScore {
  codeQuality: number;      // 0-10
  architecture: number;     // 0-10
  testing: number;          // 0-10
  documentation: number;    // 0-10
  bestPractices: number;    // 0-10
  overall: number;          // Weighted average
}

export interface ReviewResult {
  score: ReviewScore;
  strengths: string[];
  improvements: string[];
  recommendations: string[];
  details: {
    category: string;
    score: number;
    notes: string[];
  }[];
}

export interface PRContext {
  owner: string;
  repo: string;
  prNumber: number;
  title: string;
  description: string;
  files: PRFile[];
  commits: number;
  additions: number;
  deletions: number;
}

export interface PRFile {
  filename: string;
  status: 'added' | 'modified' | 'removed' | 'renamed';
  additions: number;
  deletions: number;
  patch?: string;
  contents?: string;
}

export interface ReviewConfig {
  rules: {
    requireTests: boolean;
    requireDocs: boolean;
    minScore: number;
  };
  ignore: string[];
  scoring: {
    codeQuality: number;
    architecture: number;
    testing: number;
    documentation: number;
    bestPractices: number;
  };
}

export const DEFAULT_CONFIG: ReviewConfig = {
  rules: {
    requireTests: true,
    requireDocs: true,
    minScore: 7
  },
  ignore: [
    'dist/**',
    'build/**',
    'node_modules/**',
    '*.lock',
    'package-lock.json',
    'yarn.lock'
  ],
  scoring: {
    codeQuality: 30,
    architecture: 25,
    testing: 20,
    documentation: 15,
    bestPractices: 10
  }
};
