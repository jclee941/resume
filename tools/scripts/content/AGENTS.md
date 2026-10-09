# CONTENT PACK TOOLING KNOWLEDGE BASE

**Generated:** 2026-10-09
**Commit:** `f24027a0`
**Branch:** `master`

## OVERVIEW

Dependency-free Node CLI transports private content, enforces pack boundaries, and creates fake fixtures.

Boundary: score 10; distinct build-bootstrap domain with its own manifest and exported policy helpers.

## WHERE TO LOOK

| Task                      | Location                         | Notes                                                |
| ------------------------- | -------------------------------- | ---------------------------------------------------- |
| Command dispatch          | `cli.mjs`                        | ensure, pull, push, status, manifest, guard          |
| Pack definition           | `content-pack.json`, `pack.mjs`  | Include/exclude globs, paths, hashes                 |
| Glob matching             | `glob.mjs`                       | In-tree matcher without npm dependencies             |
| Authentication and D1 API | `d1-client.mjs`                  | Auth and binding resolution                          |
| Storage and sync          | `store.mjs`, `sync.mjs`          | Remote rows, manifest comparison, push               |
| Pull and stale files      | `pull.mjs`, `prune.mjs`          | Atomic materialization and previous-manifest cleanup |
| Build source policy       | `ensure.mjs`                     | Workers Builds, fixtures, local preview              |
| Git privacy guard         | `guard.mjs`                      | Tracked/staged paths and identifier detection        |
| Fake pack generation      | `make-fixtures.mjs`, `fixtures/` | Format-specific fakers                               |
| Regression coverage       | `__tests__/`                     | Node tests with isolated roots and fake D1           |

## CONVENTIONS

- Root `content:*` commands delegate here; use `push --dry-run` to inspect the upload plan.
- `WORKERS_CI=1` pulls D1 and explicitly refuses fixtures; missing credentials fail closed.
- Explicit fixture mode guards locally edited pack files against overwrite unless `ensure --force` is selected.
- Default local ensure requires a previous materialization manifest; missing files fail and local drift warns.
- `push --prune` deliberately removes remote rows absent locally and refreshes the master resume row.
- Resolve the database from the root `JOB_DB` binding, not a duplicate resource constant.
- Authentication accepts content/Cloudflare API token variables or API key plus email; account variables select the account.
- Keep output limited to paths, counts, hashes, and token kinds.

## ANTI-PATTERNS

- Do not add npm dependencies; the guard must run before `npm ci`.
- Do not silently fall back from D1 to fixtures.
- Do not accept absolute, traversal, or out-of-pack content paths.
- Do not print payloads, matched personal values, or resolved credentials.
- Do not treat `--prune` as a read-only synchronization flag.

---

Parent: [../AGENTS.md](../AGENTS.md)
