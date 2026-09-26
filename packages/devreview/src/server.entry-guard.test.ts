// ============================================================================
// devreview/src/server.ts: ESM entrypoint guard under a symlinked invocation
//
// server.ts used to compare fileURLToPath(import.meta.url) directly against
// process.argv[1], the same bug cli.ts had (see cli.entry-guard.test.ts).
// Under a symlinked invocation (npm link, a manual symlink into dist/,
// `node <symlink-to>/dist/server.js`), process.argv[1] is the symlink path,
// not the file it resolves to, so the comparison failed and bootstrap was
// silently skipped: the process exited without starting the webhook server
// and without printing anything. The fix resolves both sides with
// realpathSync before comparing, via the shared isEntryPoint helper.
//
// This test builds the package into a private temporary directory (see
// ./test-support/build-into-temp-dist.ts), links a scratch symlink to the
// built server there, spawns it through that symlink, and asserts it
// actually answers GET /health. Run against the old guard (a plain
// `fileURLToPath(import.meta.url) === process.argv[1]` comparison), the
// spawned process exits immediately and /health never responds, so this
// test fails.
// ============================================================================

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type ChildProcess, spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildIntoTempDist } from './test-support/build-into-temp-dist.js';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));

let buildDir: string;
let scratchDir: string;
let linkedServer: string;
let child: ChildProcess | undefined;

async function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.on('error', reject);
    probe.listen(0, () => {
      const address = probe.address();
      if (address && typeof address === 'object') {
        const { port } = address;
        probe.close(() => resolve(port));
      } else {
        probe.close();
        reject(new Error('failed to allocate a free port'));
      }
    });
  });
}

async function waitForHealth(port: number, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`);
      if (response.ok) {
        return;
      }
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(
    `server did not respond on /health within ${timeoutMs}ms (last error: ${String(lastError)})`,
  );
}

beforeAll(() => {
  const { outDir } = buildIntoTempDist(packageRoot);
  buildDir = outDir;
  const builtServer = join(outDir, 'server.js');

  scratchDir = mkdtempSync(join(tmpdir(), 'devreview-server-entry-guard-'));
  const binDir = join(scratchDir, 'bin');
  mkdirSync(binDir, { recursive: true });
  linkedServer = join(binDir, 'server.js');
  symlinkSync(builtServer, linkedServer);
});

afterAll(async () => {
  if (child && child.exitCode === null && !child.killed) {
    child.kill();
    await new Promise((resolve) => child?.once('exit', resolve));
  }
  if (scratchDir) {
    rmSync(scratchDir, { recursive: true, force: true });
  }
  if (buildDir) {
    rmSync(buildDir, { recursive: true, force: true });
  }
});

describe('server entry guard (symlinked invocation)', () => {
  it(
    'starts the webhook server and responds on GET /health when invoked through a symlink',
    { timeout: 20_000 },
    async () => {
      const port = await findFreePort();

      child = spawn('node', [linkedServer], {
        env: {
          ...process.env,
          PORT: String(port),
          WEBHOOK_SECRET: 'entry-guard-test-secret',
          GITHUB_TOKEN: 'entry-guard-test-token',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      await waitForHealth(port, 10_000);

      const response = await fetch(`http://127.0.0.1:${port}/health`);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.status).toBe('ok');
    },
  );
});
