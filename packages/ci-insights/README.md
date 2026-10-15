# ci-insights

CI/CD analytics service for teams tracking GitHub Actions health across repositories: an HTTP API for pipeline analytics, bottleneck detection, and flaky job identification.

## Overview

ci-insights ingests GitHub Actions workflow run history via the GitHub API, stores it in PostgreSQL, and exposes analytics endpoints for fail rates, build-time percentiles, flaky jobs, bottlenecks, and cross-repo overviews. It is a Next.js 16 (App Router) + React 19 + TypeScript app, using Prisma over PostgreSQL 16, Octokit for the GitHub API, Tailwind CSS 4 for styling, and Vitest for tests. It runs as a standalone service with its own database. It is not a data source for [depsight](https://github.com/LanNguyenSi/depsight), which syncs GitHub Actions run data itself.

## Key features

- Ingestion of repos, workflows, and runs from the GitHub Actions API; a stored run that was still queued or in progress is refreshed on later syncs (status, conclusion, duration) until it completes, and its jobs are re-fetched once when it completes, as long as the run is still within the listed window (`maxRunsPerWorkflow`)
- Analytics: fail rate, P50/P95 build times, flaky job detection (SHA-retry and high-fail-rate heuristics), longest-running jobs, cross-repo overview
- On-demand sync of all tracked repos (`POST /api/v1/sync`), three repos at a time. Nothing syncs on a timer, so call the endpoint from cron or a scheduled CI job to keep data current.
- Docker Compose stack (PostgreSQL + app) that runs `prisma db push` on startup with the lockfile-pinned Prisma CLI bundled in the image; if the push fails (for example the database is unreachable) the error is printed and the container exits non-zero instead of serving without a schema; a push that would lose data is refused too (the container exits non-zero and restarts under compose), so reconcile the schema or migrate manually

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

Open http://localhost:3000. The root page is a static placeholder; the data is served as JSON under `/api/v1/` (see Usage). Then onboard a repo (the first sync call for an `owner/repo` starts tracking it):

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

`POST /repos/:owner/:repo/sync` takes an optional JSON body: `since` (ISO date; only runs created on or after that day), `maxRunsPerWorkflow` (default 50), `fetchJobs` (default true). `POST /sync` takes `repo` (owner/repo; must already be tracked, otherwise 404), `staleness` (skip repos synced within that many minutes), `daysBack` (history window in days; default unlimited), `maxRunsPerWorkflow` (default 100), `fetchJobs` (default true).

**Analytics**
- `GET /analytics/fail-rate`: workflow/job failure rates
- `GET /analytics/build-times`: P50/P95 build times per job/branch
- `GET /analytics/flaky`: flaky job detection (SHA-retry + high-fail-rate)
- `GET /analytics/bottleneck`: longest-running jobs
- `GET /analytics/overview`: cross-repo aggregated view
- `GET /analytics/historical/:runId`: historical context for a run

All analytics endpoints except `historical/:runId` take `repo=owner/repo` (optional; all tracked repos when omitted) and `period=1|7|30` days (default 30). `fail-rate` answers 400 for any other period; the others fall back to 30. `bottleneck` also takes `limit`; `flaky` takes `threshold`, a fail rate between 0 and 1 (default 0.2). `historical/:runId` takes a numeric GitHub run ID and requires `repo` (400 otherwise, 404 when the run is not stored). `overview?repo=` answers 404 for an untracked repo.

### Security model

Only the two POST sync endpoints check `Authorization: Bearer $SYNC_API_KEY`. They reject every request while `SYNC_API_KEY` is unset. All GET endpoints (`/repos`, `/sync`, `/analytics/*`) have no authentication and return repository names, branch names, commit SHAs and CI history to anyone who can reach the service, including data from private repositories that `GITHUB_TOKEN` can read. Run the service on a trusted network or behind a proxy that adds authentication. The user and API-token models in `prisma/schema.prisma` are not used by any route yet.

### How sync works

There are two sync routes. `POST /repos/:owner/:repo/sync` is the onboarding path: it accepts any `owner/repo` and starts tracking it. `POST /sync` re-syncs repos that are already tracked, one via `repo` or all of them three at a time. Both check the API key first. Ingestion skips runs already stored as completed and refreshes stored runs that were not. The sequence below shows both routes and the ingestion steps they share.

```mermaid
sequenceDiagram
  participant Op as Operator
  participant R1 as POST /repos/<br/>:owner/:repo/sync
  participant R2 as POST /sync
  participant Sch as syncRepo /<br/>syncAllRepos
  participant Ing as ingestRepo
  participant GH as GitHub<br/>Actions API
  participant DB as PostgreSQL
  alt onboarding
    Op->>R1: Bearer SYNC_API_KEY
    Note over R1: 401 unless the key matches<br/>(also when SYNC_API_KEY is unset)
    R1->>Ing: defaults: maxRunsPerWorkflow 50,<br/>fetchJobs true
  else re-sync tracked repos
    Op->>R2: Bearer SYNC_API_KEY
    Note over R2: same key check, body.repo<br/>must be tracked (else 404)
    R2->>Sch: body.repo, or all<br/>tracked repos 3 at a time
    Sch->>Ing: defaults: maxRunsPerWorkflow 100,<br/>fetchJobs true
  end
  Ing->>DB: upsert repo
  Ing->>GH: list workflows and runs
  Ing->>DB: upsert workflows, insert new runs,<br/>refresh unfinished runs
  Ing->>GH: list jobs per new or<br/>newly completed run
  Ing->>DB: insert or update jobs,<br/>set lastSyncedAt
```

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `GITHUB_TOKEN` | Recommended | GitHub PAT for API access; without it only public repositories sync, under the unauthenticated rate limit |
| `SYNC_API_KEY` | Yes | Shared secret required as `Authorization: Bearer` on the sync endpoints |

## Documentation

- [Repository architecture](https://github.com/LanNguyenSi/repo-intelligence/blob/master/docs/architecture.md)
- [depsight](https://github.com/LanNguyenSi/depsight): a separate product that syncs GitHub Actions run data itself; it does not read from ci-insights

## Development

| Command | Description |
|---------|-------------|
| `make dev` | Full local setup: DB + deps + schema push + dev server |
| `make dev-down` | Stop all services |
| `make dev-logs` | Tail the database logs |
| `make db` | Start only PostgreSQL |
| `make db-down` | Stop PostgreSQL |
| `make db-reset` | Drop and recreate database |
| `make migrate` | Push the Prisma schema (`prisma db push`; no migration files) |
| `make generate` | Generate the Prisma client |
| `make install` | Install dependencies and generate the Prisma client |
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
  sync/             Batched sync of tracked repos (3 at a time), run by POST /api/v1/sync
  analytics/        Fail-rate, build-times, flaky, bottleneck, historical, cross-repo
  utils/            Validation, JSON helpers
prisma/             Schema (applied with `prisma db push`, no migrations directory)
tests/              Unit, integration, edge-case tests
```

Docker:

The compose file sets only `DATABASE_URL` for the app container. Syncing needs `GITHUB_TOKEN` and `SYNC_API_KEY` as well: without `SYNC_API_KEY` the POST sync endpoints reject every request, and without `GITHUB_TOKEN` requests to GitHub go unauthenticated (public repositories only, low rate limit). Pass them to the container, for example in the `app` service's `environment` block or an `env_file`, before relying on sync.

`docker-compose.yml` is meant for local use: it publishes PostgreSQL on host port 5432 with the password `password` and the app on port 3000. Change the password and remove the database port mapping before running it on a reachable host.

```bash
# Build and start everything (PostgreSQL + app)
docker compose up -d

# Or build the image separately
docker build -t ci-insights .
```

## License

MIT, see the repository [LICENSE](https://github.com/LanNguyenSi/repo-intelligence/blob/master/LICENSE). Private package, not published. Status: beta.
