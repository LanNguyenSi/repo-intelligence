# Repo Intelligence

Suite of tools for understanding repository health, dependencies, CI performance, and code quality across your GitHub projects.

## Packages

| Package | Description | Status |
|---------|-------------|--------|
| [depsight](packages/depsight) | Dependency health dashboard — CVE tracking, outdated deps, security scoring | active |
| [ci-insights](packages/ci-insights) | CI/CD intelligence — GitHub Actions trends, failure rates, duration analysis | beta |
| [repo-health](packages/repo-health) | Repository hygiene scorer — docs, tests, CI, license, structure | beta |
| [repo-dashboard](packages/repo-dashboard) | CLI dashboard for PRs, pipelines, issues across repos | beta |
| [perf-drift](packages/perf-drift) | Build time, bundle size, and test duration tracking over time | alpha |

## How they relate

```
repo-health ──→ Overall repo score
depsight ──→ Dependency + security layer
ci-insights ──→ CI/CD pipeline analysis
perf-drift ──→ Performance regression detection
repo-dashboard ──→ Unified CLI view
```

## Status

`depsight` is the most mature — deployed and in active use. The others are functional tools at varying levels of polish.
