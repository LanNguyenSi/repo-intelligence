# DevReview

Automated GitHub pull request reviews with a scoring engine, CLI commands, and a webhook server, for teams who want a consistent first pass on every PR.

## Overview

DevReview reviews a pull request from its GitHub URL and produces category scores for code quality, architecture, testing, documentation, and best practices. It can post the result to GitHub as a pull request review: an approval (event `APPROVE`) when the overall score is at or above `rules.minScore`, and a change request (`REQUEST_CHANGES`) below it. It can also run as a webhook server that reacts to `pull_request` events automatically. Scoring rules are configurable via a `.devreview.json` in the directory devreview runs from, or a file passed with `--config <path>`.

## Key features

- Reviews a PR from its URL, in the terminal or posted to GitHub as an approving or change-requesting review
- Category scoring: code quality, architecture, testing, documentation, best practices
- Webhook server for `opened` and `synchronize` pull request events
- Notes whether the target repository has `.ai/ARCHITECTURE.md` as project context (file contents are not used for scoring)
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

# Post the review to GitHub (APPROVE at or above --min-score, REQUEST_CHANGES below)
devreview review https://github.com/owner/repo/pull/123 --comment

# With --comment: approve at or above this score, request changes below it (0-10, default 7)
devreview review https://github.com/owner/repo/pull/123 --comment --min-score 8

# Show only the score object
devreview score https://github.com/owner/repo/pull/123

# Start the webhook server (also needs WEBHOOK_SECRET)
WEBHOOK_SECRET=your-webhook-secret devreview server --port 3000
```

Each command also accepts `--token <token>` and `--config <path>`.

In webhook mode the same review is submitted for every `opened` and `synchronize` event, so each push to a pull request gets a new review. An approval from the token's account can count toward required reviews in branch protection. If reviews should stay advisory, use a token of an account whose approvals do not count.

## Documentation

- [Configuration reference (`.devreview.json`), webhook server, and Docker setup](https://github.com/LanNguyenSi/repo-intelligence/blob/master/packages/devreview/docs/configuration.md)
- [Repository architecture](https://github.com/LanNguyenSi/repo-intelligence/blob/master/docs/architecture.md)

## Development

```bash
npm install
npm run build
npm test
```

Running the tests requires Node.js 20.19+ or 22.12+.

## License

MIT. Status: beta.
