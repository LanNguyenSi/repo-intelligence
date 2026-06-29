// ============================================================================
// DevReview — Webhook Server Entry Point
// ============================================================================

import 'dotenv/config';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './config.js';
import { createWebhookServer } from './server/webhook.js';

// ESM entrypoint guard — allows importing server.ts in tests without executing bootstrap
if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const githubToken = process.env.GITHUB_TOKEN;
  const webhookSecret = process.env.WEBHOOK_SECRET;

  if (!githubToken || !webhookSecret) {
    console.error('Required env vars: GITHUB_TOKEN, WEBHOOK_SECRET');
    process.exit(1);
  }

  const config = await loadConfig(process.env.DEVREVIEW_CONFIG);

  const server = createWebhookServer({
    githubToken,
    webhookSecret,
    port: parseInt(process.env.PORT || '3000'),
    config,
  });

  server.start();
}
