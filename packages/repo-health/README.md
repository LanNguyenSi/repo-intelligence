# repo-health

Repository health checker. Scores your repo's hygiene, docs, CI, tests, and best practices.

## Install

```bash
npm install -g repo-health
```

## Usage

```bash
# Check current directory
repo-health

# Check specific repo
repo-health /path/to/repo

# JSON output
repo-health --json

# CI gate (fail if score below 7)
repo-health --min-score 7

# CI gate accepts values from 0 to 10
repo-health --min-score 8.5
```

## Output

```
  🏥 repo-health — /path/to/my-project

  Grade: B ████████░░ 8.2/10

  📝 Documentation
    ✅ README        10/10  Comprehensive README (4617 bytes)
    ✅ License       10/10  License file: LICENSE
    ❌ Contributing   0/10  No CONTRIBUTING.md
       → Add CONTRIBUTING.md for open source projects

  ⚙️  Code Quality
    ✅ .gitignore    10/10  .gitignore is comprehensive
    ✅ TypeScript    10/10  TypeScript with strict mode ✅

  🔄 CI/CD
    ✅ CI Pipeline   10/10  CI configured (GitHub Actions)

  🧪 Testing
    ✅ Tests         10/10  Test setup found

  🔒 Security
    ✅ Secret Safety 10/10  .env is in .gitignore ✅

  🐳 Deployment
    ✅ Docker        10/10  Dockerfile + Docker Compose ✅

  🤖 AI Context
    ❌ AI Context     0/10  No AI context files
       → Add .ai/ directory for agent-friendly development

  ──────────────────────────────────────────────────
  9 passed · 2 failed · Grade B
```

## Checks (11 total)

| Check | Category | What it checks |
|-------|----------|---------------|
| README | Docs | Exists? How detailed? |
| License | Docs | LICENSE file present? |
| Contributing | Docs | CONTRIBUTING.md? |
| .gitignore | Quality | Exists? Covers node_modules, .env, dist? |
| Env Config | Quality | .env.example if .env exists? |
| TypeScript | Quality | tsconfig.json? Strict mode? |
| CI Pipeline | CI/CD | GitHub Actions / GitLab CI / CircleCI? |
| Tests | Testing | Test directory? Test config? Test script? |
| Secret Safety | Security | .env in .gitignore? |
| Docker | Deployment | Dockerfile? Docker Compose? |
| AI Context | AI | .ai/ directory? AGENTS.md, ARCHITECTURE.md? |

## Grading

| Grade | Score | Meaning |
|-------|-------|---------|
| A | 9-10 | Excellent repo hygiene |
| B | 8-8.9 | Good, minor improvements possible |
| C | 7-7.9 | Acceptable, some gaps |
| D | 5-6.9 | Needs work |
| F | <5 | Major issues |

## Companion Tools

- [repo-dashboard](https://github.com/LanNguyenSi/repo-dashboard) — See all repos, PRs, pipelines at a glance
- [devreview](https://github.com/LanNguyenSi/devreview) — Automated PR code review
- [pr-prep](https://github.com/LanNguyenSi/pr-prep) — Pre-flight PR checks

## License

MIT

---

Built by 🧊 Ice
