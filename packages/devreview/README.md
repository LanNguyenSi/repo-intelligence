# DevReview

Automated GitHub PR reviews with a small scoring engine, CLI commands, and a webhook server.

## What It Does

- Reviews pull requests from a GitHub PR URL
- Produces category scores for code quality, architecture, testing, documentation, and best practices
- Can post the result back to GitHub as a pull request review
- Can run as a webhook server for `pull_request` events
- Reads optional `.ai/*.md` files from the target repository for lightweight project context
- Applies project-level rules from `.devreview.json`

## Installation

```bash
npm install
npm run build
```

Global install is also possible:

```bash
npm install -g devreview
```

## Environment

DevReview currently uses a GitHub token, not a GitHub App flow.

```bash
GITHUB_TOKEN=your-token
WEBHOOK_SECRET=your-webhook-secret
PORT=3000
DEVREVIEW_CONFIG=.devreview.json
```

## CLI

Review a PR in the terminal:

```bash
devreview review https://github.com/owner/repo/pull/123
```

Post a review back to GitHub:

```bash
devreview review https://github.com/owner/repo/pull/123 --comment
```

Show only the score object:

```bash
devreview score https://github.com/owner/repo/pull/123
```

Start the webhook server:

```bash
devreview server --port 3000
```

Each command also accepts `--token <token>` and `--config <path>`.

## Webhook Mode

The server listens on:

- `POST /webhook`
- `GET /health`

It currently reacts to `pull_request` events with the actions `opened` and `synchronize`.

## Configuration

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

## AI Context

If the target repository contains these files, DevReview will read them and mention that project context was available:

```text
.ai/AGENTS.md
.ai/ARCHITECTURE.md
.ai/DECISIONS.md
```

This is currently lightweight context enrichment, not full LLM-based review generation.

## Development

```bash
npm install
npm run build
npm test
```

## Docker

```bash
# Build
make docker-build

# Run with Docker Compose
make docker-up

# Stop
make docker-down
```
