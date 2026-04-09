// ============================================================================
// DevReview — Webhook Server
// ============================================================================

import express from 'express';
import { Webhooks } from '@octokit/webhooks';
import { Reviewer } from '../reviewer/reviewer.js';
import type { ReviewConfig } from '../types.js';
import { DEFAULT_CONFIG } from '../types.js';

export function createWebhookServer(options: {
  githubToken: string;
  webhookSecret: string;
  port?: number;
  config?: ReviewConfig;
}) {
  const app = express();
  const webhooks = new Webhooks({ secret: options.webhookSecret });
  const reviewer = new Reviewer(options.githubToken, options.config ?? DEFAULT_CONFIG);
  const port = options.port || 3000;

  // GitHub webhook payload
  app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const signature = req.headers['x-hub-signature-256'] as string;
    const event = req.headers['x-github-event'] as string;

    try {
      if (!signature) {
        res.status(400).json({ error: 'Missing signature header' });
        return;
      }

      if (!await webhooks.verify(req.body.toString(), signature)) {
        res.status(401).send('Invalid signature');
        return;
      }

      const payload = JSON.parse(req.body.toString());

      if (event === 'pull_request' && ['opened', 'synchronize'].includes(payload.action)) {
        const { owner, repo } = {
          owner: payload.repository.owner.login,
          repo: payload.repository.name,
        };
        const prNumber = payload.pull_request.number;

        console.log(`[DevReview] Reviewing ${owner}/${repo}#${prNumber}...`);

        // Review async (don't block webhook response)
        reviewer.reviewAndComment(owner, repo, prNumber)
          .then(result => {
            console.log(`[DevReview] ${owner}/${repo}#${prNumber}: ${result.score.overall}/10`);
          })
          .catch(error => {
            console.error(`[DevReview] Error reviewing ${owner}/${repo}#${prNumber}:`, error);
          });

        res.status(202).json({ message: 'Review triggered' });
      } else {
        res.status(200).json({ message: 'Event ignored' });
      }
    } catch (error) {
      console.error('[DevReview] Webhook error:', error);
      res.status(500).json({ error: 'Internal error' });
    }
  });

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', version: '0.1.0' });
  });

  return {
    start: () => {
      app.listen(port, () => {
        console.log(`[DevReview] Webhook server listening on port ${port}`);
        console.log(`[DevReview] POST /webhook — GitHub webhook endpoint`);
        console.log(`[DevReview] GET  /health  — Health check`);
      });
    },
    app,
  };
}
