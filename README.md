# Repo Intelligence

A toolkit of independent CLIs and a service that score repository hygiene, PR quality, CI health, and performance drift, for maintainers who want repo and CI health signals.

[![CI](https://github.com/LanNguyenSi/repo-intelligence/actions/workflows/ci.yml/badge.svg)](https://github.com/LanNguyenSi/repo-intelligence/actions/workflows/ci.yml) [![License: MIT](https://img.shields.io/github/license/LanNguyenSi/repo-intelligence)](LICENSE)

## Overview

repo-intelligence turns raw GitHub activity, CI logs, and local repository state into scores and trends: a hygiene checklist for a repo, a PR review score, CI failure/duration trends, and build-time/bundle-size drift over time. Each concern lives in its own package under `packages/`, installable and runnable on its own. See [docs/architecture.md](docs/architecture.md) for how the packages relate to each other and to the sibling products depsight and agent-ops-dashboard.

## Packages

| Package | Purpose | Status |
|---------|---------|--------|
| [devreview](packages/devreview) | Automated GitHub PR code review agent with intelligent scoring | beta |
| [ci-insights](packages/ci-insights) | CI/CD trends, failure rates, duration analysis | beta |
| [repo-health](packages/repo-health) | Repository health checker: scores hygiene, docs, CI, best practices | beta |
| [repo-dashboard](packages/repo-dashboard) | CLI dashboard for GitHub repositories: PRs, pipelines, issues at a glance | beta |
| [perf-drift](packages/perf-drift) | Track build times, bundle sizes, and test duration to detect performance regressions | alpha |

## Quick start

Prerequisites: git and Node.js (18+ for `repo-health` and `repo-dashboard`, 20+ for `perf-drift`, 22+ plus PostgreSQL 16 via Prisma for `ci-insights`; CI uses Node.js 22). The packages are not published to npm. There is no root install; each package is installed from its own directory. Using `repo-health` as an example:

```bash
git clone https://github.com/LanNguyenSi/repo-intelligence.git
cd repo-intelligence/packages/repo-health
npm install
npm run build
```

This produces a CLI at `dist/cli.js`; run it with `node dist/cli.js`.

## Usage

```bash
node dist/cli.js /path/to/your/repo --min-score 7
```

Scores the given repository (the path is optional and defaults to the current directory) and exits non-zero if the score is below 7 (useful as a CI gate). Run with `--json` for machine-readable output. See [packages/repo-health/README.md](packages/repo-health/README.md) for all flags, and each package's own README for its CLI or service usage.

## Documentation

- [packages/devreview/README.md](packages/devreview/README.md) - PR review scoring: CLI, webhook server, `.devreview.json` rules
- [packages/ci-insights/README.md](packages/ci-insights/README.md) - CI/CD analytics service: setup, Prisma/PostgreSQL, prerequisites
- [packages/repo-health/README.md](packages/repo-health/README.md) - hygiene checks, CLI flags, JSON output
- [packages/repo-dashboard/README.md](packages/repo-dashboard/README.md) - terminal dashboard usage
- [packages/perf-drift/README.md](packages/perf-drift/README.md) - metrics tracked and storage
- [docs/architecture.md](docs/architecture.md) - how the packages fit together, and how repo-intelligence relates to depsight and agent-ops-dashboard
- [CONTRIBUTING.md](CONTRIBUTING.md) - PR process and per-package scope
- [SECURITY.md](SECURITY.md) - vulnerability reporting

## Development and contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Each package builds, typechecks, lints, and tests independently (`npm run build` / `npm run typecheck` / `npm run lint` / `npm test`, availability varies by package); `.github/workflows/ci.yml` runs the same matrix in CI, one job per package.

## License

MIT, see [LICENSE](LICENSE).
