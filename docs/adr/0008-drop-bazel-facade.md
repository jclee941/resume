# ADR 0008: Drop the Bazel facade in favor of npm workspaces only

**Status:** Accepted
**Date:** 2026-04-27
**Deciders:** Owner-driven (Epic 0–6 SSOT execution)
**Supersedes:** Bazel files in repo root (BUILD.bazel, MODULE.bazel, WORKSPACE,
.bazelrc, .bazelignore) and in `tools/`, `third_party/`

## Context

The repository carried a Bazel "facade" alongside npm workspaces. The facade
consisted of:

- `BUILD.bazel`, `MODULE.bazel` (only one dep: `rules_shell`), `WORKSPACE`,
  `.bazelrc`, `.bazelignore` at root
- `tools/BUILD.bazel` whose own comment read **"Bazel facade removed - use
  npm scripts directly"**
- `third_party/BUILD.bazel` with a `rules_js` migration TODO that was never
  taken
- 4 root-level symlinks (`bazel-bin`, `bazel-out`, `bazel-resume`,
  `bazel-testlogs`) into `~/.cache/bazel/...` that polluted file-search
  tools and required `.bazelignore` workarounds

The previous documentation (`AGENTS.md`, `docs/architecture/`,
`tools/AGENTS.md`) consistently described Bazel as a "queryability /
affected-target analysis layer", but in practice:

- All builds went through `npm` scripts (no `bazel build` ever ran in CI).
- `tools/ci/affected.go` used `git diff` and path globs, **not** `bazel
query`.
- `MODULE.bazel` had only one dependency (`rules_shell`) which was unused.
- No `BUILD` files existed under `apps/`, `packages/`, or
  `infrastructure/` — only the four facade files at the top of the tree.

Per the SSOT improvement plan (`docs/architecture/SSOT_IMPROVEMENT_PLAN.md`,
decision **D-1**), three options were on the table:

1. **Drop Bazel entirely** (this ADR).
2. Keep facade but document it as legacy.
3. Re-commit to Bazel via `rules_js`/`rules_ts` (high effort, requires a
   Bazel champion).

## Decision

**Option 1 — Drop Bazel entirely.**

We delete all Bazel configuration files and symlinks. Build orchestration
is performed by `npm` workspaces. CI continues to use
`tools/ci/affected.go` (which never depended on Bazel).

Files removed:

- `BUILD.bazel`
- `MODULE.bazel`
- `MODULE.bazel.lock`
- `WORKSPACE`
- `.bazelrc`
- `.bazelignore`
- `tools/BUILD.bazel`
- `third_party/BUILD.bazel`
- `bazel-bin`, `bazel-out`, `bazel-resume`, `bazel-testlogs` (symlinks)

`.gitignore` keeps the `bazel-*` pattern as a defensive measure in case
anyone runs `bazel` against the repo locally.

## Consequences

### Positive

- Single mental model for builds: `npm run X`.
- File-search tools (rg, glob, find) no longer need `.bazelignore` /
  `bazel-*` exclusions to avoid following symlinks.
- 50KB+ of dead config removed (`MODULE.bazel.lock` alone was 49KB).
- New contributors are not confused by an unused build system.

### Negative

- If a future requirement ever demands hermetic builds, polyglot caching,
  or remote execution, Bazel will need to be re-introduced from scratch.
  Mitigation: this ADR documents the prior state so the path is
  discoverable.
- The SSOT plan's optional `Turborepo` adoption (SSOT-019) is now
  available as a follow-up if caching becomes important. Until then, `npm
run` is sufficient.

### Neutral

- `tools/AGENTS.md`, `third_party/AGENTS.md`, `third_party/README.md`, and
  the root `AGENTS.md` are updated to remove Bazel references in a
  follow-up commit.

## Compliance

- All `npm run *` scripts continue to work unchanged.
- `tools/ci/affected.go` is unaffected — it never used Bazel.
- CI workflows in `.github/workflows/` are unaffected — they never
  invoked `bazel`.

## Verification

```bash
# Before this ADR
ls bazel-bin bazel-out bazel-resume bazel-testlogs MODULE.bazel WORKSPACE 2>&1

# After
ls bazel-* MODULE.bazel WORKSPACE 2>&1 | grep -v "No such" || echo "all removed"

# CI parity
npm run lint && npm run typecheck && npm test
```

## References

- `docs/architecture/SSOT_IMPROVEMENT_PLAN.md` — D-1, SSOT-018, SSOT-019
- `tools/BUILD.bazel:17` (pre-removal) — "Bazel facade removed - use npm
  scripts directly"
- Aspect Build's `rules_js` (<https://github.com/aspect-build/rules_js>) —
  reference for any future re-adoption
