# repo-dashboard

GitHub repository dashboard **CLI**. See all your repos, open PRs, and pipeline status at a glance — directly in the terminal.

> **Looking for a web UI?** Check out [agent-ops-dashboard](https://github.com/LanNguyenSi/agent-ops-dashboard) — the browser-based version with live agent feed, state store, and activity timeline at [ops.opentriologue.ai](https://ops.opentriologue.ai).

## Install

```bash
npm install -g repo-dashboard
```

## Usage

```bash
# Full dashboard
export GITHUB_TOKEN=ghp_...
repo-dash LanNguyenSi

# Only open PRs
repo-dash LanNguyenSi --prs

# Only CI pipeline status
repo-dash LanNguyenSi --ci

# JSON output (for scripting / AI agents)
repo-dash LanNguyenSi --json

# Show more repos
repo-dash LanNguyenSi --repos 20
```

## Output

```
  📊 repo-dashboard — LanNguyenSi
  3/21/2026, 9:30:00 AM

  Repositories (25 total, showing 10 most recent)

  🔓 telerithm TypeScript  ⭐2  5m ago
     AI-powered log analytics and debugging for self-hosted teams
  🔓 event-booking-system TypeScript  12h ago
     Full-stack event booking platform
  🔒 ice-logbook —  1d ago

  Open Pull Requests (2)

  #1 feat: Add nextjs-fullstack blueprint
     scaffoldkit by LanNguyenSi  2d ago
  #1 feat: Add projects to website
     mywebsite by LanNguyenSi  1d ago

  Pipeline Status
  8 passing · 1 failed · 0 running

  ❌ some-repo Fix typo  3h ago
  ✅ telerithm fix: Frontend tests  30m ago
  ✅ event-booking-system fix: Responsive dashboard  12h ago

  ──────────────────────────────────────────────────
  Summary: 25 repos · 2 open PRs · 1 failed
  → 2 PR(s) waiting for review
  → 1 pipeline(s) need attention
```

## Options

| Flag | Description | Default |
|------|-------------|---------|
| `--token` | GitHub token | `$GITHUB_TOKEN` |
| `--repos` | Repos to display | 10 |
| `--prs` | Show only PRs | false |
| `--ci` | Show only pipelines | false |
| `--json` | JSON output | false |

## License

MIT

---

Built by 🧊 Ice
