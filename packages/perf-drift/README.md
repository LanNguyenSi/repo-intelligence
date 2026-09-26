# perf-drift

CLI that tracks build time, bundle size, and test duration over time, and flags regressions in CI, for any project.

## Overview

Performance regressions creep in gradually: a build that grows from 30 seconds to 5 minutes rarely happens in one commit. perf-drift records those three metrics on every run, stores them in a local SQLite database, and compares the latest run against a baseline you set. It needs no config to get started, and works with any build tool since metrics are recorded manually or via `--auto`/`--run`.

## Key features

- Tracks build time, bundle size, and test duration over time
- Regression detection against a baseline, with a configurable threshold (default 10%) and a CI-friendly exit code
- Historical reports with averages, minimums, and maximums
- Auto-detects bundle size from common output directories (`dist`, `build`, `out`, `.next`)
- Works with zero config; an optional `.perfdriftrc.json` overrides the threshold and scanned directories

## Install / quick start

perf-drift is part of the `repo-intelligence` monorepo and is not published to npm. Install from source (requires Node.js 20+):

```bash
git clone https://github.com/LanNguyenSi/repo-intelligence.git
cd repo-intelligence/packages/perf-drift
npm install
npm run build
```

The build produces a CLI at `dist/cli.js`. Run it with `node`:

```bash
node dist/cli.js track --build-time 45.2
```

The examples below use the short `drift` name for readability; substitute `node dist/cli.js` for `drift` (or a shell alias of your own) since the package is not published.

## Usage

```bash
# Record a metric
drift track --build-time 45.2 --bundle-size 1500000 --test-time 12.3

# Or auto-detect bundle size and time a build command
drift track --run "npm run build" --auto

# Set the most recent metric as the baseline
drift baseline --message "v1.0.0 release"

# Check the latest metric against the baseline (exits 1 on regression > threshold)
drift check --threshold 15

# Show recent history
drift report --limit 20
```

`drift reset` deletes all tracked metrics (`--force` skips the confirmation prompt).

## Configuration

A config file is optional; perf-drift works with no config. To override defaults, add a `.perfdriftrc.json` (or `.perfdriftrc`) file in the working directory:

```json
{
  "threshold": 10,
  "directories": ["dist", "build", "out", ".next"]
}
```

- `threshold`: default regression percentage used by `drift check` when `--threshold` is not passed (default `10`)
- `directories`: directories scanned when auto-detecting bundle size (default `["dist", "build", "out", ".next"]`)

An invalid config file is ignored and the built-in defaults are used.

## Documentation

- [Command reference, output samples, storage schema, and tool comparison](https://github.com/LanNguyenSi/repo-intelligence/blob/master/packages/perf-drift/docs/reference.md)
- [Repository architecture](https://github.com/LanNguyenSi/repo-intelligence/blob/master/docs/architecture.md)

## Development

Requires Node.js 20.19+ or 22.12+ (stricter than the Node.js 20+ runtime requirement above; the project's dev dependencies pin this range).

```bash
git clone https://github.com/LanNguyenSi/repo-intelligence.git
cd repo-intelligence/packages/perf-drift
npm install
npm run dev -- track --build-time 45.2   # tsx, no build needed
npm run build
npm test
```

## License

MIT. Status: alpha.
