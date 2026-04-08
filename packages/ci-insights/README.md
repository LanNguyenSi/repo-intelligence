# ci-insights

CI/CD Intelligence Dashboard — tracks GitHub Actions workflow history and provides analytics for pipeline health, bottleneck detection, and flaky job identification.

## Tech Stack

- **Next.js 16** (App Router) + React 19 + TypeScript
- **PostgreSQL 16** via Prisma ORM
- **Octokit** for GitHub Actions API integration
- **Tailwind CSS 4** for styling
- **Vitest** for testing

## Prerequisites

- Node.js 22+
- Docker (for PostgreSQL)
- GitHub Personal Access Token (for syncing CI data)

## Quick Start

```bash
# Create .env with your GitHub token
echo 'DATABASE_URL="postgresql://postgres:password@localhost:5432/ci_insights"' > .env
echo 'GITHUB_TOKEN="ghp_your_token_here"' >> .env

# Start everything (DB + deps + migrations + dev server)
make dev
```

Open http://localhost:3000

## Available Commands

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

## API Endpoints

All endpoints under `/api/v1/`:

**System**
- `GET /health` — Health check

**Repos & Sync**
- `GET /repos` — List tracked repos
- `POST /repos/:owner/:repo/sync` — Sync a single repo
- `POST /sync` — Trigger sync for all repos
- `GET /sync` — Sync status

**Analytics**
- `GET /analytics/fail-rate` — Workflow/job failure rates
- `GET /analytics/build-times` — P50/P95 build times per job/branch
- `GET /analytics/flaky` — Flaky job detection (SHA-retry + high-fail-rate)
- `GET /analytics/bottleneck` — Longest-running jobs
- `GET /analytics/overview` — Cross-repo aggregated view
- `GET /analytics/historical/:runId` — Historical context for a run

## Project Structure

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

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `GITHUB_TOKEN` | Yes | GitHub PAT for API access |

## Docker Deployment

```bash
# Build and start everything (PostgreSQL + app)
docker compose up -d

# Or build the image separately
docker build -t ci-insights .
```

The Docker Compose stack includes PostgreSQL and the Next.js app with automatic Prisma migrations on startup.

## Integration with depsight

ci-insights powers the **CI Health tab** in **[depsight](https://github.com/LanNguyenSi/depsight)** — a security dashboard for CVE, license, and dependency health.

Once ci-insights is running and repos are synced, depsight automatically surfaces the CI Health tab for those repositories.

> See [depsight](https://github.com/LanNguyenSi/depsight) for setup instructions.
