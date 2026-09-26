// ============================================================================
// Gap 6 (MED): devreview/src/server.ts bootstrap wiring
//
// server.ts has an ESM entrypoint guard. Importing it without being the main
// module must NOT call process.exit or start a server, even when the env
// vars the guarded branch reads are present. The earlier version of this
// test only proved that with GITHUB_TOKEN/WEBHOOK_SECRET unset, which meant
// the guard's happy path (valid env, real bootstrap attempt) was never
// exercised: a guard that always ran its body would have passed just as
// well as long as the missing-env early exit stayed reachable. Stubbing
// both env vars removes that gap, so only the guard itself keeps the
// bootstrap from running on a plain import.
// ============================================================================

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const startMock = vi.fn();
const createWebhookServerMock = vi.fn(() => ({ start: startMock, app: {} }));

vi.mock('./server/webhook.js', () => ({
  createWebhookServer: createWebhookServerMock,
}));

describe('server.ts: entrypoint guard', () => {
  beforeEach(() => {
    vi.stubEnv('GITHUB_TOKEN', 'test-github-token');
    vi.stubEnv('WEBHOOK_SECRET', 'test-webhook-secret');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    createWebhookServerMock.mockClear();
    startMock.mockClear();
  });

  it('can be imported with valid env vars without starting the server or exiting', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);

    // Import the server module: the ESM guard should prevent any side
    // effects because import.meta.url !== process.argv[1] in the test
    // runner, even though both required env vars now resolve truthy.
    await import('./server.js');

    expect(createWebhookServerMock).not.toHaveBeenCalled();
    expect(startMock).not.toHaveBeenCalled();
    expect(exitSpy).not.toHaveBeenCalled();

    exitSpy.mockRestore();
  });
});
