// ============================================================================
// Build helper for entry-guard tests.
//
// An entry-guard test needs a freshly built CLI to symlink into, but it
// must not rebuild into the package's own `dist/`: other test files in the
// same run only read from `src/`, but a second entry-guard test added later
// (for example one guarding the server entrypoint) would otherwise race
// this one over the same shared `dist/` directory. Building into a private
// temporary directory instead means concurrent builds, however many entry
// guards exist, never touch each other's output.
//
// This also makes a tsc failure visible: a plain `execFileSync(...,
// { stdio: 'pipe' })` throws an error whose message is just "Command
// failed", with tsc's actual diagnostics sitting unread in the captured
// stdout/stderr buffers. This helper reads those buffers and puts them in
// the thrown error so the test failure shows the real compiler output.
// ============================================================================

import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';

export interface TempBuildResult {
  /** Directory the sources were compiled into (mirrors the normal dist/ layout). */
  outDir: string;
}

/**
 * Compiles `packageRoot`'s TypeScript sources with tsc into a fresh
 * temporary directory (never the package's own dist/) and returns that
 * directory. Throws with the compiler's stdout/stderr attached to the
 * error message when the build fails.
 *
 * The temporary directory is created under `packageRoot` itself, not under
 * the OS temp directory: a built CLI that imports a runtime dependency
 * (for example devreview's `dotenv/config`) resolves that dependency by
 * walking up from its own location looking for `node_modules`, and an OS
 * temp directory has no such ancestor. Nested under `packageRoot`, the
 * build still finds `packageRoot/node_modules` while never writing into
 * the package's own `dist/`. The `.entry-guard-build-` prefix is
 * gitignored so a leftover directory (interrupted run) is never staged.
 */
export function buildIntoTempDist(packageRoot: string): TempBuildResult {
  const outDir = mkdtempSync(join(packageRoot, '.entry-guard-build-'));
  const tsc = join(packageRoot, 'node_modules', '.bin', 'tsc');

  try {
    execFileSync(tsc, ['--outDir', outDir], {
      cwd: packageRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
    });
  } catch (error) {
    const failure = error as NodeJS.ErrnoException & { stdout?: string; stderr?: string };
    const detail = [failure.stdout, failure.stderr].filter(Boolean).join('\n').trim();
    throw new Error(
      `tsc build into temporary outDir "${outDir}" failed:\n${detail || failure.message}`,
    );
  }

  return { outDir };
}
