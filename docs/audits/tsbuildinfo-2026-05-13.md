# Audit: tracked `*.tsbuildinfo` across the LanNguyenSi repo fleet (2026-05-13)

## Why

TypeScript's incremental build cache (`tsconfig.tsbuildinfo`, with optional
prefixes from split configs such as `tsconfig.node.tsbuildinfo`) is
machine-specific. It is regenerated on every `tsc` run, has zero shared
value, and when checked in it dirties `git status` after any local
typecheck and pollutes commit diffs.

Two PRs in 2026-05 surfaced the pattern incidentally during PR review:

- `LanNguyenSi/mywebsite` PR #10 (`tsconfig.tsbuildinfo` was tracked, fixed by adding `*.tsbuildinfo` to `.gitignore` and `git rm --cached`).
- `LanNguyenSi/agent-tasks` PR #236 (same pattern, `frontend/tsconfig.tsbuildinfo`).

The recurrence prompted this org-wide audit (agent-tasks task
`3435efc7`).

## Method

Enumeration was run across the locally-checked-out working set under
`~/git/pandora/*/`:

```bash
for repo in ~/git/pandora/*/; do
  [ -d "$repo/.git" ] || continue
  cd "$repo"
  tracked=$(git ls-files | grep -E '\.tsbuildinfo$' || true)
  if [ -n "$tracked" ]; then
    echo "=== $(basename "$repo") ==="
    echo "$tracked"
  fi
  cd ~- > /dev/null
done
```

Org-wide GitHub code search was attempted as a complement:

```bash
gh search code 'filename:tsbuildinfo user:LanNguyenSi'
```

The Search Code API consistently returned `total_count: 1` for the
GitHub App installation token, but the JSON results array was empty (a
known limitation: code search indexes lag and the App token's scope can
exclude some repositories from the index slice). Treat the local sweep
as authoritative for the working set and re-run via a PAT with full
read access if a true org-wide pass is needed before closing the
follow-ups.

## Findings

Five repositories in the local working set track `*.tsbuildinfo` files,
four of which are in scope for follow-up fixes:

| Repo | Tracked file(s) | In scope |
| ---- | --------------- | -------- |
| [`boardflow`](https://github.com/LanNguyenSi/boardflow) | `frontend/tsconfig.tsbuildinfo` | No (archived) |
| [`depsight`](https://github.com/LanNguyenSi/depsight) | `tsconfig.tsbuildinfo` | Yes |
| [`project-pilot`](https://github.com/LanNguyenSi/project-pilot) | `frontend/tsconfig.tsbuildinfo` | Yes |
| [`telerithm`](https://github.com/LanNguyenSi/telerithm) | `frontend/tsconfig.tsbuildinfo` | Yes |
| [`triologue-health-dashboard`](https://github.com/LanNguyenSi/triologue-health-dashboard) | `frontend/tsconfig.node.tsbuildinfo`, `frontend/tsconfig.tsbuildinfo` | Yes |

`boardflow` is archived on GitHub and is excluded per
`feedback_archived_repos_excluded.md`.

`triologue-health-dashboard` is the most interesting case because it
also has a split `tsconfig.node.json` and so produces two cache files.
That confirms the canonical fix needs the covering pattern
`*.tsbuildinfo`, not the exact path.

Already-fixed (referenced for cross-checking):

- `LanNguyenSi/mywebsite` (PR #10, 2026-05-11)
- `LanNguyenSi/agent-tasks` (PR #236, 2026-05-11)

## Canonical fix per repo

```bash
cd <repo>
git fetch origin --quiet && git checkout master && git pull --ff-only
git checkout -b chore/gitignore-tsbuildinfo

# 1. Add `*.tsbuildinfo` to `.gitignore` under the existing "Build
#    outputs" section if present, otherwise append a new section. Use
#    the covering pattern, not the exact path: future split configs
#    (e.g. tsconfig.build.tsbuildinfo) are auto-covered.

# 2. Untrack every currently-tracked .tsbuildinfo file.
git ls-files | grep -E '\.tsbuildinfo$' | xargs git rm --cached

# 3. Verify.
git ls-files | grep -E '\.tsbuildinfo$' && echo FAIL || echo OK
npx tsc --noEmit 2>&1 | tail -3
git status --short

git commit -m "chore: gitignore *.tsbuildinfo and untrack incremental build cache"
git push -u origin chore/gitignore-tsbuildinfo
```

## Follow-up tasks

This audit is the deliverable for `3435efc7`. Per
`feedback_scope_cut_large_tasks.md`, the per-repo fix PRs are filed as
separate agent-tasks entries against each affected repo's project:

- `depsight`: agent-tasks `b6606501-1b11-4b2c-a1c3-c02117d7ae12`
- `project-pilot`: agent-tasks `c5107acf-3b54-412d-9375-2dc15979ac47`
- `telerithm`: agent-tasks `b5f84923-db6e-4410-89a6-d8b9e3d96493`
- `triologue-health-dashboard`: agent-tasks `c09a895d-7454-4bf5-bb97-c46fc727d8c5`

`boardflow` is archived and is not getting a follow-up task. Each
follow-up references this audit doc and the canonical fix shape above.

## Acceptance close-out

- Inventory: see "Findings" above.
- Per-repo fix PRs: tracked via the five follow-up tasks listed
  immediately above, not bundled into this PR.
- Org-wide re-check (`gh search code 'filename:tsbuildinfo
  user:LanNguyenSi'`) should be re-run after the five follow-ups land,
  ideally with a PAT to bypass the App-token search index quirks
  observed during this audit.

## Out of scope (deferred)

- Repositories that do not compile TypeScript (Python, Go,
  pure-Markdown).
- Forks where upstream policy disagrees.
- `lavaclawdbot/*` consciousness-* research repos (separate check).
- Promoting this rule into `packages/repo-health` as an automated check
  rule. Worth doing once the manual sweep has demonstrated the pattern
  is generic enough; left for a future task.
