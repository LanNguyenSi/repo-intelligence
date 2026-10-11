# Contributing to repo-intelligence

Thanks for your interest. repo-intelligence is a workspace of small tools for repository health, pull request review scoring, CI insights, and performance drift detection.

## Issues

- Bug reports: include repro steps, expected vs. actual, the affected sub-package (`packages/<name>`).
- Feature requests: describe the use case before the proposed shape.
- For depsight, use its standalone repo at [LanNguyenSi/depsight](https://github.com/LanNguyenSi/depsight). It is not part of this workspace.

## Pull Requests

1. Fork, branch off `master` (e.g. `feat/<package>/<scope>`).
2. Keep changes scoped to a single sub-package where possible.
3. Run that sub-package's local checks (each has its own README and tooling).
4. Open the PR with a clear summary, motivation, and test plan; mention which sub-package it touches.

## CI checks

Every pull request against `master` runs these workflows:

- `ci.yml` runs one job per package on Node.js 22: `npm ci`, then typecheck, build, lint and test where the package defines them.
- `audit.yml` runs `npm audit` per package. It fails on high or critical advisories in the full dependency tree and on moderate or higher advisories in runtime dependencies. An advisory without an upstream fix needs an `overrides` entry in the package's `package.json` or, for the high/critical gate only, an entry in `.github/audit-allowlist.json` with `id`, `reason` and a `reviewBy` date at most 90 days ahead.
- `ci-insights-docker.yml` and `devreview-docker.yml` build that package's Docker image when files of the package change.

## Sub-packages

Each `packages/<name>` directory is independent. See `packages/<name>/README.md` for setup. The active packages are `ci-insights`, `devreview`, `perf-drift`, `repo-dashboard`, and `repo-health`. depsight is not part of this workspace; use the standalone repo above.

## Style

Match the surrounding code in the affected sub-package. Prefer small, reviewable diffs.
