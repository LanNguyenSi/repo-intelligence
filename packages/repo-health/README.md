# repo-health

Repository health checker: scores a repo's hygiene, docs, CI, tests, and best practices from the command line.

## Overview

repo-health runs 11 checks against a local repository (README, license, contributing guide, .gitignore, env config, TypeScript config, CI pipeline, tests, secret safety, Docker, AI context files) and produces a 0-10 score with a letter grade. It is meant as a quick audit for a new or unfamiliar repo, or as a CI gate via `--min-score`.

## Key features

- 11 checks across docs, code quality, CI/CD, testing, security, deployment, and AI context
- 0-10 score with an A-F grade
- JSON output for scripting
- `--min-score` exits non-zero below a threshold, for use as a CI gate

## Install / quick start

repo-health is part of the `repo-intelligence` monorepo and is not published to npm. Install from source:

```bash
git clone https://github.com/LanNguyenSi/repo-intelligence.git
cd repo-intelligence/packages/repo-health
npm install
npm run build
node dist/cli.js .
```

## Usage

```bash
# Check current directory
repo-health

# Check a specific repo
repo-health /path/to/repo

# JSON output
repo-health --json

# CI gate (fail if score below 7; accepts 0-10, including decimals)
repo-health --min-score 7
```

`repo-health` above is shorthand for `node dist/cli.js` in this unpublished package.

Sample output:

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
| Contributing Guide | Docs | CONTRIBUTING.md? |
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

## Documentation

- Companion tools: [repo-dashboard](https://github.com/LanNguyenSi/repo-intelligence/tree/master/packages/repo-dashboard) (repos, PRs, pipelines at a glance) and [devreview](https://github.com/LanNguyenSi/repo-intelligence/tree/master/packages/devreview) (automated PR code review)
- [Repository architecture](https://github.com/LanNguyenSi/repo-intelligence/blob/master/docs/architecture.md)

## Development

```bash
npm install
npm run build
npm test
```

## License

MIT. Status: beta.
