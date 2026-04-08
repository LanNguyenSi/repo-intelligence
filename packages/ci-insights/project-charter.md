# Project Charter: ci-insights

## Summary

CI/CD Intelligence Dashboard integrated into ops.opentriologue.ai. Tracks GitHub Actions workflow run history, fail rates, build times (P50/P95), and detects flaky jobs. Helps engineering teams understand pipeline health trends and identify bottlenecks.

## Target Users

- engineering teams
- AI agents monitoring CI health

## Core Features

- GitHub Actions API ingestion: store workflow runs + job steps + timing in PostgreSQL
- Fail rate per workflow/job over last 30/7/1 days
- Build time P50/P95 per branch and job
- Flaky job detection: jobs failing >20% of runs without code changes
- Historical context: was this pipeline already red before the current commit?
- Bottleneck identification: which job takes the longest on average
- Per-repo and cross-repo aggregated view
- Auto-sync: fetch latest runs on demand or via scheduled job

## Constraints

- GitHub Actions only (no GitLab/Bitbucket in v1)
- Next.js 15 + Prisma + PostgreSQL + Tailwind CSS
- GitHub OAuth for authentication
- Must work as standalone app OR as section in existing agent-ops-dashboard
- TypeScript strict mode

## Non-Functional Requirements

- Time-series data model: WorkflowRun, JobRun with timestamps, conclusions, durations stored in PostgreSQL for trend queries
- Fast timeline delivery

## Delivery Context

- Planner profile: startup
- Intake completeness: complete
- Phase: phase_1
- Path: core
- Data sensitivity: low

## Applicable Playbooks

- /root/.openclaw/workspace/git/agent-planforge/playbooks/planning-and-scoping.md
- /root/.openclaw/workspace/git/agent-engineering-playbook/playbooks/01-project-setup.md
- /root/.openclaw/workspace/git/agent-engineering-playbook/playbooks/02-architecture.md
- /root/.openclaw/workspace/git/agent-engineering-playbook/playbooks/03-team-roles.md
- /root/.openclaw/workspace/git/agent-engineering-playbook/playbooks/04-design-principles.md
- /root/.openclaw/workspace/git/agent-engineering-playbook/playbooks/05-development-workflow.md
- /root/.openclaw/workspace/git/agent-engineering-playbook/playbooks/06-testing-strategy.md
- /root/.openclaw/workspace/git/agent-engineering-playbook/playbooks/07-quality-assurance.md
- /root/.openclaw/workspace/git/agent-engineering-playbook/playbooks/08-documentation.md

## Missing Information

- None

## Follow-Up Questions

- None

## Open Questions

- None
