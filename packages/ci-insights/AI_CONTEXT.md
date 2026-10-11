# AI Context: ci-insights

## Project Overview

**ci-insights**: CI/CD intelligence service. GitHub Actions workflow run history, fail rates, build-time P50/P95, flaky job detection, and historical context.

- **Stack:** Next.js 16 (App Router) + React 19 + Prisma + PostgreSQL + Tailwind CSS 4
- **Auth:** the POST sync endpoints require `Authorization: Bearer $SYNC_API_KEY` (fails closed when unset); the GET endpoints have no authentication; there is no user login
- **Data source:** GitHub Actions API (`GITHUB_TOKEN`; without it only public repositories sync)
- **Schema:** applied with `prisma db push`; there is no migrations directory
- **Deployment:** Docker (see `Dockerfile`; `docker-compose.yml` is a local stack with a fixed database password, see `README.md`)

See `README.md` for setup, endpoints, and environment variables.

## Quick Rules

1. **Server Components by default**: add `'use client'` only when needed
2. **`force-dynamic`** on all pages with DB queries
3. **Transactions** for DB mutations affecting related data
4. **Feature branches** with a PR to `master`
5. **No `any` types**: TypeScript strict mode
