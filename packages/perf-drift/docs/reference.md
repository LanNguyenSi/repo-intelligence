# perf-drift reference

Command and flag reference, output samples, storage schema, and background on how perf-drift compares to related tools. See the package [README](../README.md) for install and the core commands.

## Commands

| Command | Options |
|---|---|
| `drift track` | `-b, --build-time <seconds>`, `-s, --bundle-size <bytes>`, `-t, --test-time <seconds>`, `-m, --message <text>`, `--auto` (detect bundle size: total size of .js/.mjs/.cjs files in the first configured output directory that has any), `--run <command>` (run a command and record its duration as build time) |
| `drift check` | `-t, --threshold <percent>` (defaults to the `threshold` in `.perfdriftrc.json`, 10), `--fail-on-regression` (exit 1 on regression; on by default), `--json` |
| `drift report` | `-d, --days <number>` (last N days, e.g. `drift report --days 30`), `-l, --limit <number>` (last N measurements), `--json` |
| `drift baseline` | `-m, --message <text>` (stores a copy of the most recent metric with that message and makes the copy the baseline; the copy counts in reports) |
| `drift reset` | `--force` (skip the confirmation prompt) |

## Output examples

`drift track`:

```
✓ Metrics recorded!

Recorded:
  Build time:  45.20s
  Bundle size: 1.43 MB
  Test time:   12.30s
  Message:     After optimization

Metric ID: 42
```

`drift check`:

```
📊 Performance Check

Build Time:  42.00s → 45.20s (+7.6%) SLOWER
Bundle Size: 1.35 MB → 1.43 MB (+5.9%) SLOWER
Test Time:   12.00s → 12.30s (+2.5%) SLOWER

Threshold: 10%

✅ No regressions detected.
```

`drift report`:

```
📈 Performance Report (15 measurements)

Date         Build      Bundle       Tests      Message
────────────────────────────────────────────────────────────────────────────────
  2026-03-15 42.00s     1.35 MB      12.00s    
  2026-03-16 43.10s     1.38 MB      12.10s    Added feature X
  2026-03-17 45.20s     1.43 MB      12.30s    After optimization
⭐ 2026-03-18 44.50s     1.40 MB      12.20s    Weekly baseline

Build time:  avg 43.70s  min 42.00s  max 45.20s  (15 samples)
Bundle size: avg 1.39 MB  min 1.35 MB  max 1.43 MB  (15 samples)
Test time:   avg 12.15s  min 12.00s  max 12.30s  (15 samples)
```

## More usage patterns

CI integration (GitHub Actions). perf-drift keeps its history in `~/.perf-drift/metrics.db` on the runner, so restore and save that directory between runs:

```yaml
- name: Restore perf-drift history
  uses: actions/cache@v4
  with:
    path: ~/.perf-drift
    key: perf-drift-${{ github.run_id }}
    restore-keys: perf-drift-

- name: Build and record metrics
  run: drift track --run "npm run build" --auto --message "${{ github.sha }}"

- name: Check for regressions
  run: drift check --threshold 10
```

The steps assume a `drift` command on the runner's `PATH`: build perf-drift from this repository and run `npm link` in `packages/perf-drift`, or call `node <path-to-perf-drift>/dist/cli.js`. `--run` executes the command with `/bin/bash`. `drift check` exits 0 with a warning while no baseline or no metric exists, so run `drift baseline` once in a run whose database is saved; otherwise the check never fails.

Weekly baseline updates:

```bash
# Monday morning: set new baseline
drift baseline --message "Weekly baseline $(date +%Y-%m-%d)"

# Rest of week: check against it
drift check
```

## Data storage

- Location: `~/.perf-drift/metrics.db`, one database per OS user and shared by every project that user tracks (see the README's Data storage section)
- Format: SQLite (via `better-sqlite3`), created on first run
- Schema (`metrics` table, indexed on `timestamp` and `baseline`):
  ```sql
  CREATE TABLE metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER NOT NULL,
    buildTime REAL,
    bundleSize INTEGER,
    testTime REAL,
    message TEXT,
    baseline INTEGER DEFAULT 0
  );
  ```

## Tips

1. Track consistently: same environment, same command.
2. Set baselines regularly: after releases or major optimizations.
3. Use in CI: catch regressions before merge (keep `~/.perf-drift` between runs, see the CI example above).
4. Add context: use `--message` to document changes.
5. Automate: integrate into your build scripts.

## Comparison with related tools

| Tool | Focus | perf-drift's difference |
|------|-------|-----------------|
| Lighthouse | Browser metrics | perf-drift tracks build/test performance, not page-load metrics |
| bundlewatch | Bundle size only | perf-drift also tracks build and test time |
| Codecov | Coverage | perf-drift tracks execution time, not coverage |

Related tools:

- [bundlewatch](https://github.com/bundlewatch/bundlewatch): bundle size monitoring
- [size-limit](https://github.com/ai/size-limit): bundle size limits
- [Lighthouse](https://github.com/GoogleChrome/lighthouse): web performance auditing
