# AI Context: ci-insights

## Project Overview

**ci-insights**: CI/CD intelligence service. GitHub Actions workflow run history, fail rates, build-time P50/P95, flaky job detection, and historical context.

- **Stack:** Next.js 16 (App Router) + React 19 + Prisma + PostgreSQL + Tailwind CSS 4
- **Auth:** sync endpoints require `Authorization: Bearer $SYNC_API_KEY` (fails closed when unset); there is no user login
- **Data source:** GitHub Actions API (needs `GITHUB_TOKEN`)
- **Schema:** applied with `prisma db push`; there is no migrations directory
- **Deployment:** Docker (see `Dockerfile` and `docker-compose.yml`)

See `README.md` for setup, endpoints, and environment variables.

## Quick Rules

1. **Server Components by default**: add `'use client'` only when needed
2. **`force-dynamic`** on all pages with DB queries
3. **Transactions** for DB mutations affecting related data
4. **Feature branches** with a PR to `master`
5. **No `any` types**: TypeScript strict mode
