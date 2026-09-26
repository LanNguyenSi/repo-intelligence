# repo-dashboard

Terminal dashboard for a GitHub account's repositories: see open PRs, pipeline status, and recent activity at a glance.

> Looking for a web UI? See [agent-ops-dashboard](https://github.com/LanNguyenSi/agent-ops-dashboard), the browser-based version with a live agent feed, state store, and activity timeline.

## Overview

repo-dashboard queries the GitHub API for a given user or org and prints a one-screen summary: repositories, open pull requests, and CI pipeline status, with a closing line of what needs attention. It supports JSON output for scripting or feeding into other tools.

## Install / quick start

repo-dashboard is part of the `repo-intelligence` monorepo and is not published to npm. Install from source:

```bash
git clone https://github.com/LanNguyenSi/repo-intelligence.git
cd repo-intelligence/packages/repo-dashboard
npm install
npm run build
export GITHUB_TOKEN=ghp_...
node dist/cli.js LanNguyenSi
```

## Usage

```bash
# Full dashboard
export GITHUB_TOKEN=ghp_...
repo-dash LanNguyenSi

# Only open PRs
repo-dash LanNguyenSi --prs

# Only CI pipeline status
repo-dash LanNguyenSi --ci

# JSON output (for scripting / AI agents)
repo-dash LanNguyenSi --json

# Show more repos
repo-dash LanNguyenSi --repos 20
```

`repo-dash` above is shorthand for `node dist/cli.js` in this unpublished package. The owner argument defaults to `LanNguyenSi` when omitted.

Sample output:

```
  📊 repo-dashboard - LanNguyenSi
  3/21/2026, 9:30:00 AM

  Repositories (25 total, showing 10 most recent)

  🔓 telerithm TypeScript  ⭐2  5m ago
     AI-powered log analytics and debugging for self-hosted teams
  🔒 web-app (no language)  1d ago

  Open Pull Requests (2)

  #1 feat: Add nextjs-fullstack blueprint
     scaffoldkit by LanNguyenSi  2d ago

  Pipeline Status
  8 passing · 1 failed · 0 running

  ✅ telerithm fix: Frontend tests  30m ago

  ──────────────────────────────────────────────────
  Summary: 25 repos · 2 open PRs · 1 failed
  → 2 PR(s) waiting for review
  → 1 pipeline(s) need attention
```

## Options

| Flag | Description | Default |
|------|-------------|---------|
| `--token` | GitHub token | `$GITHUB_TOKEN` |
| `--repos` | Repos to display | 10 |
| `--prs` | Show only PRs | false |
| `--ci` | Show only pipelines | false |
| `--json` | JSON output | false |

## Documentation

- [Repository architecture](https://github.com/LanNguyenSi/repo-intelligence/blob/master/docs/architecture.md)

## Development

```bash
npm install
npm run build
npm test
```

## License

MIT. Status: beta.
