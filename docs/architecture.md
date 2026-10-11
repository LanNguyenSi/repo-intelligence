# Architecture

How the repo-intelligence packages relate to each other and to the sibling products depsight and agent-ops-dashboard.

The five packages split into CLI tools that compute signals directly from a repository or the GitHub API, and a Next.js analytics service (`ci-insights`) that ingests GitHub Actions run history, stores it, and exposes it over an HTTP API.

repo-health reads the local repository. perf-drift reads `.perfdriftrc.json` and build output from the working directory and keeps its history in a per-user SQLite file. repo-dashboard and ci-insights read from the GitHub API; ci-insights stores what it ingests in PostgreSQL. devreview reads `.devreview.json` locally and pull request data and `.ai/` files from GitHub, can be triggered by `pull_request` webhooks, and posts reviews back to GitHub as `APPROVE` or `REQUEST_CHANGES`.

The diagram shows what each package reads and writes.

```mermaid
flowchart LR
  subgraph src ["Data sources"]
    GH[("GitHub<br/>API and webhooks")]
    FS[("Local filesystem")]
  end

  subgraph pkgs ["packages/"]
    CIS["ci-insights<br/>HTTP API /api/v1"]
    RD["repo-dashboard<br/>packages/repo-dashboard"]
    DR["devreview<br/>packages/devreview"]
    PD["perf-drift<br/>packages/perf-drift"]
    RH["repo-health<br/>packages/repo-health"]
  end

  subgraph store ["Storage"]
    CIDB[("PostgreSQL<br/>prisma/schema.prisma")]
    SQLITE[("SQLite<br/>~/.perf-drift/metrics.db")]
  end

  GH -->|"workflows, runs, jobs"| CIS
  GH --> RD
  GH -->|"PR data, .ai/ files"| DR
  GH -->|"pull_request webhook"| DR
  DR -->|"review: APPROVE or REQUEST_CHANGES"| GH
  FS -->|".devreview.json"| DR
  FS -->|".perfdriftrc.json, build output"| PD
  FS --> RH
  CIS <--> CIDB
  PD <--> SQLITE
```

## Relation to depsight and agent-ops-dashboard

These three products overlap in spirit but solve different problems:

- [depsight](https://github.com/LanNguyenSi/depsight) is the deployed CVE and dependency-health product: one main question ("am I shipping known-vulnerable code?") answered well, with its own GitHub Actions sync for CI health. It is a separate repository, not a package of this monorepo.
- [agent-ops-dashboard](https://github.com/LanNguyenSi/agent-ops-dashboard) is the cross-repo operational view: a live fleet dashboard for many repositories at once.
- repo-intelligence is the toolkit layer: the CLIs and scorers (`repo-health`, `ci-insights`, `devreview`, `perf-drift`, `repo-dashboard`) that compute repository signals. The three are independent: depsight and agent-ops-dashboard compute their own signals from the GitHub API and do not read repo-intelligence output.

## Workspace layout

There is no root `package.json` and no npm workspace. Each `packages/<name>` directory has its own `package.json`, lockfile, and tooling, and is installed, built, and tested independently; the CI matrix in `.github/workflows/ci.yml` runs one job per package.
