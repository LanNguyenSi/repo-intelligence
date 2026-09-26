# ci-insights

CI/CD intelligence dashboard for teams tracking GitHub Actions health across repositories: pipeline analytics, bottleneck detection, and flaky job identification.

## Overview

ci-insights ingests GitHub Actions workflow run history via the GitHub API, stores it in PostgreSQL, and exposes analytics endpoints for fail rates, build-time percentiles, flaky jobs, bottlenecks, and cross-repo overviews. It is a Next.js 16 (App Router) + React 19 + TypeScript app, using Prisma over PostgreSQL 16, Octokit for the GitHub API, Tailwind CSS 4 for styling, and Vitest for tests. It runs as a small service, either standalone or as the CI Health data source behind [depsight](https://github.com/LanNguyenSi/depsight).

## Key features

- Idempotent ingestion of repos, workflows, and runs from the GitHub Actions API
- Analytics: fail rate, P50/P95 build times, flaky job detection (SHA-retry and high-fail-rate heuristics), longest-running jobs, cross-repo overview
- Sync scheduler with a 3-concurrent limit
- Docker Compose stack (PostgreSQL + app) with automatic Prisma migrations on startup

## Prerequisites

- Node.js 22+
- Docker (for PostgreSQL)
- A GitHub personal access token (for syncing CI data)

## Install / quick start

```bash
# Create .env with your GitHub token
echo 'DATABASE_URL="postgresql://postgres:password@localhost:5432/ci_insights"' > .env
echo 'GITHUB_TOKEN="ghp_your_token_here"' >> .env
echo 'SYNC_API_KEY="generate_a_long_random_secret"' >> .env

# Start everything (DB + deps + migrations + dev server)
make dev
```

Open http://localhost:3000. Then onboard a repo (the first sync call for an `owner/repo` starts tracking it):

```bash
curl -X POST http://localhost:3000/api/v1/repos/<owner>/<repo>/sync \
  -H "Authorization: Bearer $SYNC_API_KEY"
```

## Usage

API endpoints, all under `/api/v1/`:

**System**
- `GET /health`: health check

**Repos & sync**
- `GET /repos`: list tracked repos
- `POST /repos/:owner/:repo/sync`: sync a single repo (also the onboarding path). Requires `Authorization: Bearer $SYNC_API_KEY`.
- `POST /sync`: trigger sync for all tracked repos, or one via the `repo` body field. Requires `Authorization: Bearer $SYNC_API_KEY`.
- `GET /sync`: sync status

**Analytics**
- `GET /analytics/fail-rate`: workflow/job failure rates
- `GET /analytics/build-times`: P50/P95 build times per job/branch
- `GET /analytics/flaky`: flaky job detection (SHA-retry + high-fail-rate)
- `GET /analytics/bottleneck`: longest-running jobs
- `GET /analytics/overview`: cross-repo aggregated view
- `GET /analytics/historical/:runId`: historical context for a run

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `GITHUB_TOKEN` | Yes | GitHub PAT for API access |
| `SYNC_API_KEY` | Yes | Shared secret required as `Authorization: Bearer` on the sync endpoints |

## Documentation

- [Repository architecture](https://github.com/LanNguyenSi/repo-intelligence/blob/master/docs/architecture.md)
- [depsight](https://github.com/LanNguyenSi/depsight): once ci-insights is running and repos are synced, depsight surfaces a CI Health tab for those repositories

## Development

| Command | Description |
|---------|-------------|
| `make dev` | Full local setup: DB + deps + migrate + dev server |
| `make dev-down` | Stop all services |
| `make db` | Start only PostgreSQL |
| `make db-reset` | Drop and recreate database |
| `make test` | Run tests |
| `make test-watch` | Run tests in watch mode |
| `make lint` | ESLint |
| `make typecheck` | TypeScript type check |
| `make build` | Production build |
| `make clean` | Remove build artifacts and node_modules |
| `make help` | Show all commands |

Project structure:

```
app/api/v1/         API routes (health, repos, sync, analytics)
lib/
  github/           Octokit client + GitHub API wrappers
  ingestion/        Idempotent repo/workflow/run ingestion
  sync/             Sync scheduler (3-concurrent limit)
  analytics/        Fail-rate, build-times, flaky, bottleneck, historical, cross-repo
  utils/            Validation, JSON helpers
prisma/             Schema + migrations
tests/              Unit, integration, edge-case tests
```

Docker:

```bash
# Build and start everything (PostgreSQL + app)
docker compose up -d

# Or build the image separately
docker build -t ci-insights .
```

## License

MIT, see the repository [LICENSE](https://github.com/LanNguyenSi/repo-intelligence/blob/master/LICENSE). Private package, not published. Status: beta.
