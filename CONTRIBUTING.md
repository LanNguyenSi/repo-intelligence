# Contributing to repo-intelligence

Thanks for your interest. repo-intelligence is a workspace of small tools for repository health, dependency tracking, CI insights, and performance drift detection.

## Issues

- Bug reports: include repro steps, expected vs. actual, the affected sub-package (`packages/<name>`).
- Feature requests: describe the use case before the proposed shape.
- For depsight, use its standalone repo at [LanNguyenSi/depsight](https://github.com/LanNguyenSi/depsight). `packages/depsight/` in this workspace is intentionally a stub (no source, excluded from CI), kept only to reserve the slot.

## Pull Requests

1. Fork, branch off `master` (e.g. `feat/<package>/<scope>`).
2. Keep changes scoped to a single sub-package where possible.
3. Run that sub-package's local checks (each has its own README and tooling).
4. Open the PR with a clear summary, motivation, and test plan; mention which sub-package it touches.

## Sub-packages

Each active `packages/<name>` directory is independent. See `packages/<name>/README.md` for setup. The `depsight` slot is a stub; use the standalone repo above.

## Style

Match the surrounding code in the affected sub-package. Prefer small, reviewable diffs.
