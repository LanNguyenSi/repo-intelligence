// ============================================================================
// buildIntoTempDist previously left its temporary outDir behind whenever tsc
// failed: the mkdtempSync'd directory was only ever removed by the entry
// guard tests' own afterAll, so a build that throws before reaching that
// cleanup (a broken tsconfig, a real type error) leaked a
// `.entry-guard-build-*` directory into the package root. This test forces
// a tsc failure against a scratch package and asserts no such directory is
// left behind.
// ============================================================================

import { describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildIntoTempDist } from './build-into-temp-dist.js';

const packageRoot = fileURLToPath(new URL('../..', import.meta.url));

describe('buildIntoTempDist — cleans up on tsc failure', () => {
  it('removes its temporary outDir when tsc fails, leaving no .entry-guard-build-* directory behind', () => {
    const brokenRoot = mkdtempSync(join(tmpdir(), 'build-into-temp-dist-broken-'));

    try {
      symlinkSync(join(packageRoot, 'node_modules'), join(brokenRoot, 'node_modules'));
      mkdirSync(join(brokenRoot, 'src'));
      writeFileSync(
        join(brokenRoot, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: { strict: true, module: 'ES2022', target: 'ES2022' },
          include: ['src'],
        }),
      );
      writeFileSync(join(brokenRoot, 'src', 'broken.ts'), 'const notANumber: number = "nope";\n');

      expect(() => buildIntoTempDist(brokenRoot)).toThrow(/tsc build into temporary outDir/);

      const leftovers = readdirSync(brokenRoot).filter((name) =>
        name.startsWith('.entry-guard-build-'),
      );
      expect(leftovers).toEqual([]);
    } finally {
      rmSync(brokenRoot, { recursive: true, force: true });
    }
  });
});
