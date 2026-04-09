import type { PRContext, ReviewScore, ReviewConfig } from '../types.js';
import { DEFAULT_CONFIG } from '../types.js';

export class Scorer {
  private config: ReviewConfig;

  constructor(config: ReviewConfig = DEFAULT_CONFIG) {
    this.config = config;
  }

  /**
   * Calculate overall score from category scores using weighted average
   */
  calculateOverall(scores: Omit<ReviewScore, 'overall'>): number {
    const weights = this.config.scoring;
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);

    const weighted =
      (scores.codeQuality * weights.codeQuality +
       scores.architecture * weights.architecture +
       scores.testing * weights.testing +
       scores.documentation * weights.documentation +
       scores.bestPractices * weights.bestPractices) / totalWeight;

    return Math.round(weighted * 10) / 10; // Round to 1 decimal
  }

  /**
   * Analyze code quality based on PR context
   */
  scoreCodeQuality(context: PRContext): number {
    let score = 10;
    const issues: string[] = [];

    // Check file size (large files might indicate lack of modularity)
    const largeFiles = context.files.filter(f => f.additions > 300);
    if (largeFiles.length > 0) {
      score -= 1;
      issues.push(`Large files detected (${largeFiles.length} files >300 lines)`);
    }

    // Check for proper file extensions
    const hasTypeScript = context.files.some(f => f.filename.endsWith('.ts') || f.filename.endsWith('.tsx'));
    if (!hasTypeScript && context.files.some(f => f.filename.endsWith('.js'))) {
      score -= 0.5;
      issues.push('Consider using TypeScript for better type safety');
    }

    // Check commit count (too many commits might indicate poor planning)
    if (context.commits > 20) {
      score -= 0.5;
      issues.push(`Many commits (${context.commits}) - consider squashing`);
    }

    // Check for code patterns in patches
    const patches = context.files.map(f => f.patch || '').join('\n');
    
    // Positive: Error handling
    if (patches.includes('try') && patches.includes('catch')) {
      score += 0.5;
    }
    
    // Negative: Console.log in production code
    if (patches.includes('console.log') && !patches.includes('// TODO') && !patches.includes('DEBUG')) {
      score -= 0.5;
      issues.push('Remove console.log statements');
    }

    return Math.max(0, Math.min(10, score));
  }

  /**
   * Analyze architecture based on file structure and changes
   */
  scoreArchitecture(context: PRContext): number {
    let score = 10;

    // Check for proper separation of concerns
    const srcFiles = context.files.filter(f => f.filename.startsWith('src/'));
    const testFiles = context.files.filter(f => 
      f.filename.includes('test') || 
      f.filename.includes('spec') || 
      f.filename.endsWith('.test.ts') ||
      f.filename.endsWith('.spec.ts')
    );

    // Good: Changes organized in src/
    if (srcFiles.length > 0 && srcFiles.length === context.files.length - testFiles.length) {
      score += 0.5;
    }

    // Check for config files changes (might indicate breaking changes)
    const configFiles = context.files.filter(f => 
      f.filename.includes('config') || 
      f.filename === 'package.json' ||
      f.filename.endsWith('.config.js') ||
      f.filename.endsWith('.config.ts')
    );
    
    if (configFiles.length > 2) {
      score -= 0.5;
    }

    // Check for modular structure
    const hasComponents = context.files.some(f => f.filename.includes('components/'));
    const hasUtils = context.files.some(f => f.filename.includes('utils/') || f.filename.includes('helpers/'));
    const hasTypes = context.files.some(f => f.filename.includes('types') || f.filename.includes('interfaces'));

    if (hasComponents && hasUtils && hasTypes) {
      score += 1; // Well-structured project
    }

    return Math.max(0, Math.min(10, score));
  }

  /**
   * Analyze test coverage
   */
  scoreTesting(context: PRContext): number {
    let score = 5; // Start at middle

    const testFiles = context.files.filter(f => 
      f.filename.includes('test') || 
      f.filename.includes('spec') ||
      f.filename.endsWith('.test.ts') ||
      f.filename.endsWith('.test.js') ||
      f.filename.endsWith('.spec.ts') ||
      f.filename.endsWith('.spec.js')
    );

    const codeFiles = context.files.filter(f => 
      !f.filename.includes('test') && 
      !f.filename.includes('spec') &&
      (f.filename.endsWith('.ts') || f.filename.endsWith('.js') || f.filename.endsWith('.tsx') || f.filename.endsWith('.jsx'))
    );

    if (codeFiles.length === 0) {
      return 10; // Only test changes
    }

    // Calculate test ratio
    const testRatio = testFiles.length / codeFiles.length;

    if (testRatio >= 1) {
      score = 10; // Excellent: 1:1 or better
    } else if (testRatio >= 0.5) {
      score = 8; // Good: At least half
    } else if (testRatio >= 0.3) {
      score = 6; // Okay: Some tests
    } else if (testFiles.length > 0) {
      score = 4; // Poor: Few tests
    } else {
      score = 2; // Bad: No tests
    }

    // Bonus for test file additions
    const addedTests = testFiles.filter(f => f.status === 'added');
    if (addedTests.length > 0) {
      score += 1;
    }

    if (this.config.rules.requireTests && codeFiles.length > 0 && testFiles.length === 0) {
      score = Math.min(score, 1);
    }

    return Math.max(0, Math.min(10, score));
  }

  /**
   * Analyze documentation quality
   */
  scoreDocumentation(context: PRContext): number {
    let score = 7; // Start slightly above middle

    // Check for README updates
    const hasReadmeUpdate = context.files.some(f => 
      f.filename.toLowerCase() === 'readme.md' ||
      f.filename.toLowerCase().includes('readme')
    );

    if (hasReadmeUpdate) {
      score += 1.5;
    }

    // Check for JSDoc/TSDoc comments in patches
    const patches = context.files.map(f => f.patch || '').join('\n');
    
    if (patches.includes('/**') || patches.includes('/*')) {
      score += 1; // Has documentation comments
    }

    // Check for inline comments
    if ((patches.match(/\/\//g) ?? []).length > 5) {
      score += 0.5; // Good inline documentation
    }

    // Penalty: Large changes without README update
    if (context.additions > 200 && !hasReadmeUpdate) {
      score -= 1;
    }

    if (this.config.rules.requireDocs && context.additions > 50 && !hasReadmeUpdate) {
      score -= 1;
    }

    return Math.max(0, Math.min(10, score));
  }

  /**
   * Analyze best practices adherence
   */
  scoreBestPractices(context: PRContext): number {
    let score = 10;

    const patches = context.files.map(f => f.patch || '').join('\n');

    // Check for common anti-patterns
    if (patches.includes('var ')) {
      score -= 0.5; // Use const/let instead
    }

    if (patches.includes('any') && context.files.some(f => f.filename.endsWith('.ts'))) {
      score -= 0.5; // Avoid 'any' in TypeScript
    }

    // Check for security issues
    if (patches.includes('eval(')) {
      score -= 2; // Dangerous: eval usage
    }

    if (patches.includes('innerHTML')) {
      score -= 1; // Potential XSS risk
    }

    // Check for good patterns
    if (patches.includes('async') && patches.includes('await')) {
      score += 0.5; // Modern async/await
    }

    if (patches.includes('interface') || patches.includes('type ')) {
      score += 0.5; // Good type definitions
    }

    return Math.max(0, Math.min(10, score));
  }

  /**
   * Generate full review score for PR
   */
  scorePR(context: PRContext): ReviewScore {
    const scores = {
      codeQuality: this.scoreCodeQuality(context),
      architecture: this.scoreArchitecture(context),
      testing: this.scoreTesting(context),
      documentation: this.scoreDocumentation(context),
      bestPractices: this.scoreBestPractices(context)
    };

    return {
      ...scores,
      overall: this.calculateOverall(scores)
    };
  }
}
