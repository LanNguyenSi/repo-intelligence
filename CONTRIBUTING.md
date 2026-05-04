# Contributing to repo-intelligence

Thanks for your interest. repo-intelligence is a workspace of small tools for repository health, dependency tracking, CI insights, and performance drift detection.

## Issues

- Bug reports: include repro steps, expected vs. actual, the affected sub-package (`packages/<name>`).
- Feature requests: describe the use case before the proposed shape.
- For depsight specifically, prefer its own repo at [LanNguyenSi/depsight](https://github.com/LanNguyenSi/depsight) (the standalone flagship). The copy in `packages/depsight` here is a workspace mirror.

## Pull Requests

1. Fork, branch off `master` (e.g. `feat/<package>/<scope>`).
2. Keep changes scoped to a single sub-package where possible.
3. Run that sub-package's local checks (each has its own README and tooling).
4. Open the PR with a clear summary, motivation, and test plan; mention which sub-package it touches.

## Sub-packages

Each `packages/<name>` directory is independent. See `packages/<name>/README.md` for setup.

## Style

Match the surrounding code in the affected sub-package. Prefer small, reviewable diffs.
