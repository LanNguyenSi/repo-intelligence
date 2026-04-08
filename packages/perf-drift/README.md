# Performance Drift Detector

Track build times, bundle sizes, and test duration over time to catch performance regressions early.

## Why?

Performance regressions sneak in gradually. By the time you notice, your build takes 5 minutes instead of 30 seconds. **Drift** helps you catch them early.

## Features

✅ **Track metrics over time:**
- Build time (seconds)
- Bundle size (bytes)
- Test duration (seconds)

✅ **Regression detection:**
- Configurable threshold (default: 10%)
- Exit code 1 for CI integration
- Compare against baseline

✅ **Trend visualization:**
- Historical data in SQLite
- Summary statistics (avg/min/max)
- Baseline markers

✅ **CI-friendly:**
- Simple CLI interface
- Auto-detection of bundle sizes
- No configuration needed

## Installation

```bash
npm install -g perf-drift
```

Or use with `npx`:

```bash
npx perf-drift track --build-time 45.2
```

## Usage

### 1. Track Metrics

```bash
# Manual tracking
drift track --build-time 45.2 --bundle-size 1500000 --test-time 12.3

# With message/commit
drift track --build-time 45.2 --message "After optimization"

# Auto-detect bundle size
drift track --build-time 45.2 --auto
```

### 2. Set Baseline

```bash
# Set most recent metric as baseline
drift baseline

# Create new baseline with message
drift baseline --message "v1.0.0 release"
```

### 3. Check for Regressions

```bash
# Check against baseline (exit 1 if regression > 10%)
drift check

# Custom threshold
drift check --threshold 15

# CI mode (explicit)
drift check --fail-on-regression
```

### 4. View Reports

```bash
# Last 20 measurements
drift report

# Last 30 days
drift report --days 30

# Last 50 measurements
drift report --limit 50
```

## Examples

### Local Development

```bash
# After making changes
time npm run build  # Note the time
drift track --build-time 42.5 --message "Optimized webpack config"

# Set baseline when happy
drift baseline

# Later, check for regressions
drift check
```

### CI Integration

```bash
# GitHub Actions example
- name: Build
  run: |
    START=$(date +%s)
    npm run build
    END=$(date +%s)
    BUILD_TIME=$((END - START))
    
- name: Track metrics
  run: |
    npx perf-drift track \
      --build-time $BUILD_TIME \
      --auto \
      --message "${{ github.sha }}"

- name: Check for regressions
  run: npx perf-drift check --threshold 10
```

### Weekly Baseline Updates

```bash
# Monday morning: set new baseline
drift baseline --message "Weekly baseline $(date +%Y-%m-%d)"

# Rest of week: check against it
drift check
```

## Output Examples

### `drift track`
```
✓ Metrics recorded!

Recorded:
  Build time:  45.20s
  Bundle size: 1.43 MB
  Test time:   12.30s
  Message:     After optimization

Metric ID: 42
```

### `drift check`
```
📊 Performance Check

Build Time:  42.0s → 45.2s (+7.6%) SLOWER
Bundle Size: 1.35 MB → 1.43 MB (+5.9%) LARGER
Test Time:   12.0s → 12.3s (+2.5%) OK

Threshold: 10%

✅ No regressions detected.
```

### `drift report`
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

## Configuration

No configuration file needed! Metrics are stored in `~/.perf-drift/metrics.db` (SQLite).

## Data Storage

- **Location:** `~/.perf-drift/metrics.db`
- **Format:** SQLite database
- **Schema:**
  ```sql
  CREATE TABLE metrics (
    id INTEGER PRIMARY KEY,
    timestamp INTEGER,
    buildTime REAL,
    bundleSize INTEGER,
    testTime REAL,
    message TEXT,
    baseline INTEGER
  );
  ```

## Tips

1. **Track consistently:** Same environment, same command
2. **Set baselines regularly:** After releases or major optimizations
3. **Use in CI:** Catch regressions before merge
4. **Add context:** Use `--message` to document changes
5. **Automate:** Integrate into your build scripts

## Comparison with Existing Tools

| Tool | Focus | Drift Advantage |
|------|-------|-----------------|
| Lighthouse | Browser metrics | Drift tracks build/test performance |
| bundlewatch | Bundle size only | Drift tracks multiple metrics |
| Codecov | Coverage | Drift tracks execution time |

**Drift fills the gap:** General-purpose performance tracking for any project.

## Requirements

- Node.js 18+
- npm (for installation)

## Development

```bash
# Clone
git clone https://github.com/LanNguyenSi/perf-drift.git
cd perf-drift

# Install
npm install

# Run dev
npm run dev -- track --build-time 45.2

# Build
npm run build

# Test
npm test
```

## License

MIT

## Author

Lava 🌋

## Related Tools

- [bundlewatch](https://github.com/bundlewatch/bundlewatch) - Bundle size monitoring
- [size-limit](https://github.com/ai/size-limit) - Bundle size limits
- [Lighthouse](https://github.com/GoogleChrome/lighthouse) - Web performance auditing
