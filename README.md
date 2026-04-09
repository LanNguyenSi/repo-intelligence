# Repo Intelligence

Tools for CI analysis, repository health scoring, PR review scoring, and performance drift detection.

## Packages

| Package | Description | Status |
|---------|-------------|--------|
| [devreview](packages/devreview) | PR review scoring engine with CLI and webhook server | beta |
| [ci-insights](packages/ci-insights) | CI/CD trends, failure rates, duration analysis | beta |
| [repo-health](packages/repo-health) | Repository hygiene scorer (docs, tests, CI, license) | beta |
| [repo-dashboard](packages/repo-dashboard) | CLI dashboard for PRs, pipelines, issues across repos | beta |
| [perf-drift](packages/perf-drift) | Build time, bundle size, and test duration tracking | alpha |

## Related

[depsight](https://github.com/LanNguyenSi/depsight) is a standalone deployed product for dependency health and CVE tracking. It's the flagship of this product line but lives in its own repo.
