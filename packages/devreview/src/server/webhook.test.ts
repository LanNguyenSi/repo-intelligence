// ============================================================================
// Gap 1 (HIGH): webhook.ts — HMAC signature verification
//
// Production seam: createWebhookServer accepts optional `_webhooks` and
// `_reviewer` instances to avoid real GitHub/HMAC calls in tests.
//
// Guards tested:
//   - line ~32: if (!signature) → 400
//   - line ~36: if (!await webhooks.verify(...)) → 401
//
// MUTATION: drop the missing-sig 400 guard
// KILLED BY: missing-sig test expects 400; without guard the request falls
//   through to the verify call (mocked to return true) and returns 202
// ============================================================================

import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { createWebhookServer } from './webhook.js';

// ---------------------------------------------------------------------------
// Shared mock objects (injected via _deps seam)
// ---------------------------------------------------------------------------

const mockVerify = vi.fn<[string, string], Promise<boolean>>();
const mockReviewAndComment = vi.fn();

const mockWebhooks = { verify: mockVerify };
const mockReviewer = {
  reviewAndComment: mockReviewAndComment,
} as never;

let server: http.Server;
let baseUrl: string;

const validPrPayload = JSON.stringify({
  action: 'opened',
  repository: { owner: { login: 'acme' }, name: 'rocket' },
  pull_request: { number: 42 },
});

beforeAll(() => {
  const { app } = createWebhookServer({
    githubToken: 'test-token',
    webhookSecret: 'test-secret',
    _webhooks: mockWebhooks as never,
    _reviewer: mockReviewer,
  });
  server = http.createServer(app);
  server.listen(0);
  const port = (server.address() as AddressInfo).port;
  baseUrl = `http://localhost:${port}`;
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

beforeEach(() => {
  vi.clearAllMocks();
  // Default: valid signature
  mockVerify.mockResolvedValue(true);
  mockReviewAndComment.mockResolvedValue({ score: { overall: 8 } });
});

// ---------------------------------------------------------------------------
// Happy-path: valid signature
// ---------------------------------------------------------------------------
describe('POST /webhook — valid signature', () => {
  it('returns 202 and triggers review for pull_request opened events', async () => {
    const res = await fetch(`${baseUrl}/webhook`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-github-event': 'pull_request',
        'x-hub-signature-256': 'sha256=valid-hmac',
      },
      body: validPrPayload,
    });
    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.message).toBe('Review triggered');
  });

  it('returns 200 for non-PR events (push etc.)', async () => {
    const res = await fetch(`${baseUrl}/webhook`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-github-event': 'push',
        'x-hub-signature-256': 'sha256=valid-hmac',
      },
      body: JSON.stringify({ action: 'created' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toBe('Event ignored');
  });

  it('returns 200 for PR events with unrecognised actions (not opened/synchronize)', async () => {
    const res = await fetch(`${baseUrl}/webhook`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-github-event': 'pull_request',
        'x-hub-signature-256': 'sha256=valid-hmac',
      },
      body: JSON.stringify({
        action: 'closed',
        repository: { owner: { login: 'acme' }, name: 'rocket' },
        pull_request: { number: 1 },
      }),
    });
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Guard 1: missing x-hub-signature-256 header → 400
//
// MUTATION: remove the `if (!signature)` block
// KILLED BY: expects 400; without guard falls through to verify (returns true)
//   and returns 202 instead → assertion fails
// ---------------------------------------------------------------------------
describe('POST /webhook — missing signature header', () => {
  it('returns 400 with error message when x-hub-signature-256 is absent', async () => {
    const res = await fetch(`${baseUrl}/webhook`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-github-event': 'pull_request',
        // no x-hub-signature-256
      },
      body: validPrPayload,
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Missing signature header');
  });
});

// ---------------------------------------------------------------------------
// Guard 2: invalid signature → 401
// ---------------------------------------------------------------------------
describe('POST /webhook — invalid signature', () => {
  it('returns 401 when webhooks.verify() returns false', async () => {
    mockVerify.mockResolvedValue(false);
    const res = await fetch(`${baseUrl}/webhook`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-github-event': 'pull_request',
        'x-hub-signature-256': 'sha256=bad-hmac',
      },
      body: validPrPayload,
    });
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Health endpoint
// ---------------------------------------------------------------------------
describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });
});
