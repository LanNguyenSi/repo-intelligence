// ============================================================================
// Gap 6 (MED): devreview/src/server.ts — bootstrap wiring
//
// server.ts now has an ESM entrypoint guard. Importing it without being the
// main module must NOT call process.exit or start a server.
//
// The test simply imports the module to verify the guard works.
// ============================================================================

import { describe, it, expect, vi } from 'vitest';

describe('server.ts — entrypoint guard', () => {
  it('can be imported without executing bootstrap code (no process.exit called)', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);

    // Import the server module — the ESM guard should prevent any side effects
    // because import.meta.url !== process.argv[1] in the test runner
    await import('./server.js');

    expect(exitSpy).not.toHaveBeenCalled();
    exitSpy.mockRestore();
  });
});
