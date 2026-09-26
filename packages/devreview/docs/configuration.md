# DevReview configuration, webhook mode, and Docker

Reference material for the [DevReview README](../README.md).

## Environment variables

```bash
GITHUB_TOKEN=your-token
WEBHOOK_SECRET=your-webhook-secret
PORT=3000
DEVREVIEW_CONFIG=.devreview.json
```

DevReview currently uses a GitHub token, not a GitHub App flow.

## `.devreview.json`

Create a `.devreview.json` in the working directory to customize scoring and review rules:

```json
{
  "rules": {
    "requireTests": true,
    "requireDocs": true,
    "minScore": 7
  },
  "ignore": [
    "dist/**",
    "coverage/**",
    "node_modules/**"
  ],
  "scoring": {
    "codeQuality": 30,
    "architecture": 25,
    "testing": 20,
    "documentation": 15,
    "bestPractices": 10
  }
}
```

`ignore` patterns support `*` and `**`.

## Webhook mode

The server listens on:

- `POST /webhook`
- `GET /health`

It reacts to `pull_request` events with the actions `opened` and `synchronize`.

## AI context

If the target repository contains these files, DevReview reads them and mentions that project context was available:

```text
.ai/AGENTS.md
.ai/ARCHITECTURE.md
.ai/DECISIONS.md
```

This is lightweight context enrichment, not full LLM-based review generation.

## Docker

There is no Docker Compose setup. Build the image, then run the webhook server container directly:

```bash
# Build the image (devreview:latest)
make docker-build

# Run the webhook server (exposes port 3000, with a /health check)
docker run --rm -p 3000:3000 \
  -e GITHUB_TOKEN=your-token \
  -e WEBHOOK_SECRET=your-webhook-secret \
  devreview
```

The container entrypoint is `node dist/server.js`, so it always starts in webhook-server mode.
