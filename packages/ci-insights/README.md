# ci-insights

CI/CD intelligence dashboard for teams tracking GitHub Actions health across repositories: pipeline analytics, bottleneck detection, and flaky job identification.

## Overview

ci-insights ingests GitHub Actions workflow run history via the GitHub API, stores it in PostgreSQL, and exposes analytics endpoints for fail rates, build-time percentiles, flaky jobs, bottlenecks, and cross-repo overviews. It is a Next.js 16 (App Router) + React 19 + TypeScript app, using Prisma over PostgreSQL 16, Octokit for the GitHub API, Tailwind CSS 4 for styling, and Vitest for tests. It runs as a standalone service with its own database. It is not a data source for [depsight](https://github.com/LanNguyenSi/depsight), which syncs GitHub Actions run data itself.

## Key features

- Idempotent ingestion of repos, workflows, and runs from the GitHub Actions API
- Analytics: fail rate, P50/P95 build times, flaky job detection (SHA-retry and high-fail-rate heuristics), longest-running jobs, cross-repo overview
- Sync scheduler with a 3-concurrent limit
- Docker Compose stack (PostgreSQL + app) that runs `prisma db push` on startup with the lockfile-pinned Prisma CLI bundled in the image; if the push fails (for example the database is unreachable) the error is printed and the container exits non-zero instead of serving without a schema

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

# Start everything (DB + deps + schema push + dev server)
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
- [depsight](https://github.com/LanNguyenSi/depsight): a separate product that syncs GitHub Actions run data itself; it does not read from ci-insights

## Development

| Command | Description |
|---------|-------------|
| `make dev` | Full local setup: DB + deps + schema push + dev server |
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
prisma/             Schema (applied with `prisma db push`, no migrations directory)
tests/              Unit, integration, edge-case tests
```

Docker:

The compose file sets only `DATABASE_URL` for the app container. Syncing needs `GITHUB_TOKEN` and `SYNC_API_KEY` as well: without `SYNC_API_KEY` the POST sync endpoints reject every request, and without `GITHUB_TOKEN` requests to GitHub go unauthenticated (public repositories only, low rate limit). Pass them to the container, for example in the `app` service's `environment` block or an `env_file`, before relying on sync.

```bash
# Build and start everything (PostgreSQL + app)
docker compose up -d

# Or build the image separately
docker build -t ci-insights .
```

## License

MIT, see the repository [LICENSE](https://github.com/LanNguyenSi/repo-intelligence/blob/master/LICENSE). Private package, not published. Status: beta.
