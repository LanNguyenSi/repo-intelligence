// ============================================================================
// ESM entrypoint guard, shared by cli.ts and server.ts.
//
// A plain `fileURLToPath(import.meta.url) === process.argv[1]` guard breaks
// under a linked or symlinked invocation (npm link, a manual symlink into
// dist/): process.argv[1] is the symlink path, not the file it resolves to,
// so the string comparison fails and bootstrap is silently skipped. Resolving
// both sides with realpathSync before comparing keeps the guard true for a
// symlinked entrypoint while still returning false when the module is only
// imported (as tests do).
// ============================================================================

import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function isEntryPoint(moduleUrl: string): boolean {
  const invokedPath = process.argv[1];

  if (!invokedPath) {
    return false;
  }

  try {
    return realpathSync(invokedPath) === realpathSync(fileURLToPath(moduleUrl));
  } catch {
    return false;
  }
}
