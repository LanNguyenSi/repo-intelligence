# AI Context: ci-insights

## Project Overview

**ci-insights** — CI/CD Intelligence Dashboard. GitHub Actions workflow run history, fail rates, build-time P50/P95, flaky job detection, and historical context.

- **Stack:** Next.js 15 + Prisma + PostgreSQL + Tailwind CSS
- **Auth:** GitHub OAuth
- **Data source:** GitHub Actions API
- **Deployment:** Docker + Traefik (opentriologue.ai infrastructure)

## Agent Context Files

| File | Purpose |
|------|---------|
| `.ai/AGENTS.md` | Team roles, workflow, code standards |
| `.ai/ARCHITECTURE.md` | System structure, patterns, deployment |
| `.ai/TASKS.md` | Work packages with priorities |

## Quick Rules

1. **Server Components by default** — add `'use client'` only when needed
2. **`force-dynamic`** on all pages with DB queries
3. **Transactions** for DB mutations affecting related data
4. **Feature branches** — `feat/<task-id>-<name>`, PR to main
5. **No `any` types** — TypeScript strict mode
6. **Same patterns as depsight** — reference LanNguyenSi/depsight for conventions
