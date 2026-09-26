# DevReview

Automated GitHub pull request reviews with a scoring engine, CLI commands, and a webhook server, for teams who want a consistent first pass on every PR.

## Overview

DevReview reviews a pull request from its GitHub URL and produces category scores for code quality, architecture, testing, documentation, and best practices. It can post the result back to GitHub as a PR review, or run as a webhook server that reacts to `pull_request` events automatically. Scoring rules are configurable via a `.devreview.json` in the directory devreview runs from, or a file passed with `--config <path>`.

## Key features

- Reviews a PR from its URL, in the terminal or posted back to GitHub
- Category scoring: code quality, architecture, testing, documentation, best practices
- Webhook server for `opened` and `synchronize` pull request events
- Optional lightweight project context from `.ai/AGENTS.md`, `.ai/ARCHITECTURE.md`, `.ai/DECISIONS.md` in the target repository
- Configurable scoring weights and ignore patterns via `.devreview.json`

## Install / quick start

DevReview is part of the `repo-intelligence` monorepo and is not published to npm. Install from source:

```bash
git clone https://github.com/LanNguyenSi/repo-intelligence.git
cd repo-intelligence/packages/devreview
npm install
npm run build
```

The build produces a CLI at `dist/cli.js`. To get a global `devreview` command, run `npm link` from the package directory. The examples below use the short `devreview` name; without the link, substitute `node dist/cli.js`:

```bash
GITHUB_TOKEN=your-token node dist/cli.js score https://github.com/owner/repo/pull/123
```

## Usage

```bash
export GITHUB_TOKEN=your-token

# Review a PR in the terminal
devreview review https://github.com/owner/repo/pull/123

# Post the review back to GitHub
devreview review https://github.com/owner/repo/pull/123 --comment

# Set the minimum acceptable score (default 7, 0-10)
devreview review https://github.com/owner/repo/pull/123 --min-score 8

# Show only the score object
devreview score https://github.com/owner/repo/pull/123

# Start the webhook server (also needs WEBHOOK_SECRET)
WEBHOOK_SECRET=your-webhook-secret devreview server --port 3000
```

Each command also accepts `--token <token>` and `--config <path>`.

## Documentation

- [Configuration reference (`.devreview.json`), webhook server, and Docker setup](https://github.com/LanNguyenSi/repo-intelligence/blob/master/packages/devreview/docs/configuration.md)
- [Repository architecture](https://github.com/LanNguyenSi/repo-intelligence/blob/master/docs/architecture.md)

## Development

```bash
npm install
npm run build
npm test
```

## License

MIT. Status: beta.
