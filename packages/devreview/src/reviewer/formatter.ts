// ============================================================================
// DevReview — Review Output Formatter
// ============================================================================

import type { ReviewScore, ReviewResult, PRContext } from '../types.js';

/**
 * Format review results as GitHub-flavored Markdown
 */
export class ReviewFormatter {

  /**
   * Generate full review comment for GitHub
   */
  formatReview(context: PRContext, result: ReviewResult): string {
    const { score } = result;
    const emoji = this.scoreEmoji(score.overall);
    const verdict = this.verdict(score.overall);

    const lines: string[] = [
      `## ${emoji} DevReview: ${score.overall}/10 — ${verdict}`,
      '',
      `**PR:** #${context.prNumber} — ${context.title}`,
      `**Changes:** +${context.additions}/-${context.deletions} across ${context.files.length} files`,
      '',
      '### Score Breakdown',
      '',
      '| Category | Score | Weight |',
      '|----------|-------|--------|',
      `| Code Quality | ${this.scoreBar(score.codeQuality)} ${score.codeQuality}/10 | 30% |`,
      `| Architecture | ${this.scoreBar(score.architecture)} ${score.architecture}/10 | 25% |`,
      `| Testing | ${this.scoreBar(score.testing)} ${score.testing}/10 | 20% |`,
      `| Documentation | ${this.scoreBar(score.documentation)} ${score.documentation}/10 | 15% |`,
      `| Best Practices | ${this.scoreBar(score.bestPractices)} ${score.bestPractices}/10 | 10% |`,
      `| **Overall** | **${score.overall}/10** | |`,
      '',
    ];

    // Strengths
    if (result.strengths.length > 0) {
      lines.push('### ✅ Strengths', '');
      result.strengths.forEach(s => lines.push(`- ${s}`));
      lines.push('');
    }

    // Improvements
    if (result.improvements.length > 0) {
      lines.push('### ⚠️ Improvements', '');
      result.improvements.forEach(i => lines.push(`- ${i}`));
      lines.push('');
    }

    // Recommendations
    if (result.recommendations.length > 0) {
      lines.push('### 💡 Recommendations', '');
      result.recommendations.forEach(r => lines.push(`- ${r}`));
      lines.push('');
    }

    // Details per category
    if (result.details.length > 0) {
      lines.push('<details>', '<summary>Detailed Analysis</summary>', '');
      for (const detail of result.details) {
        lines.push(`#### ${detail.category} (${detail.score}/10)`);
        detail.notes.forEach(n => lines.push(`- ${n}`));
        lines.push('');
      }
      lines.push('</details>', '');
    }

    lines.push('---', '*Automated review by [DevReview](https://github.com/LanNguyenSi/devreview)*');

    return lines.join('\n');
  }

  /**
   * Format as terminal output (for CLI)
   */
  formatTerminal(context: PRContext, result: ReviewResult): string {
    const { score } = result;
    const lines: string[] = [
      '',
      `  ${this.scoreEmoji(score.overall)} DevReview: ${score.overall}/10 — ${this.verdict(score.overall)}`,
      `  PR #${context.prNumber}: ${context.title}`,
      `  +${context.additions}/-${context.deletions} across ${context.files.length} files`,
      '',
      '  Scores:',
      `    Code Quality:   ${this.terminalBar(score.codeQuality)} ${score.codeQuality}/10`,
      `    Architecture:   ${this.terminalBar(score.architecture)} ${score.architecture}/10`,
      `    Testing:        ${this.terminalBar(score.testing)} ${score.testing}/10`,
      `    Documentation:  ${this.terminalBar(score.documentation)} ${score.documentation}/10`,
      `    Best Practices: ${this.terminalBar(score.bestPractices)} ${score.bestPractices}/10`,
      '',
    ];

    if (result.strengths.length > 0) {
      lines.push('  ✅ Strengths:');
      result.strengths.forEach(s => lines.push(`    - ${s}`));
      lines.push('');
    }

    if (result.improvements.length > 0) {
      lines.push('  ⚠️  Improvements:');
      result.improvements.forEach(i => lines.push(`    - ${i}`));
      lines.push('');
    }

    return lines.join('\n');
  }

  private scoreEmoji(score: number): string {
    if (score >= 9.5) return '🏆';
    if (score >= 9) return '✅';
    if (score >= 8) return '👍';
    if (score >= 7) return '📝';
    if (score >= 5) return '⚠️';
    return '❌';
  }

  private verdict(score: number): string {
    if (score >= 9.5) return 'EXCELLENT';
    if (score >= 9) return 'GREAT';
    if (score >= 8) return 'GOOD';
    if (score >= 7) return 'ACCEPTABLE';
    if (score >= 5) return 'NEEDS WORK';
    return 'MAJOR ISSUES';
  }

  private scoreBar(score: number): string {
    const filled = Math.round(score);
    const empty = 10 - filled;
    return '🟢'.repeat(Math.min(filled, 10)) + '⚪'.repeat(Math.max(empty, 0));
  }

  private terminalBar(score: number): string {
    const filled = Math.round(score);
    const empty = 10 - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }
}
