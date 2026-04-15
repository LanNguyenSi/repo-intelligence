# Repo Intelligence

**Know which of your repos are healthy, which are drifting, and which are on fire — before the dashboards do.** Repo Intelligence is a toolkit for scoring repository hygiene, tracking CI and performance drift, and turning raw GitHub activity into the kind of signal a lead engineer actually uses on Monday morning.

## How this fits alongside depsight and agent-ops-dashboard

These three products overlap in spirit but solve different problems:

- **[depsight](https://github.com/LanNguyenSi/depsight)** is the deployed, single-focus CVE and dependency-health product — one question ("am I shipping known-vulnerable code?") answered well.
- **[agent-ops-dashboard](https://github.com/LanNguyenSi/agent-ops-dashboard)** is the cross-repo operational view — a live fleet dashboard for many repositories at once.
- **Repo Intelligence** is the toolkit layer: the CLIs and scorers (`repo-health`, `ci-insights`, `devreview`, `perf-drift`, `repo-dashboard`) that produce the underlying signals. depsight and agent-ops-dashboard consume and present; repo-intelligence computes.

## Packages

| Package | Description | Status |
|---------|-------------|--------|
| [devreview](packages/devreview) | PR review scoring engine with CLI and webhook server | beta |
| [ci-insights](packages/ci-insights) | CI/CD trends, failure rates, duration analysis | beta |
| [repo-health](packages/repo-health) | Repository hygiene scorer (docs, tests, CI, license) | beta |
| [repo-dashboard](packages/repo-dashboard) | CLI dashboard for PRs, pipelines, issues across repos | beta |
| [perf-drift](packages/perf-drift) | Build time, bundle size, and test duration tracking | alpha |
