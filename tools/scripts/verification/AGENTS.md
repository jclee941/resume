# VERIFICATION SCRIPTS KNOWLEDGE BASE

**Generated:** 2026-07-22
**Commit:** `164e83ac`
**Branch:** `master`

## OVERVIEW

Deterministic policy validators and read-only runtime probes. Node validators
inspect repository structure; Go programs exercise deployment and operator
surfaces. This directory is the explicit validator exception to Go-first
operational tooling.

## WHERE TO LOOK

| Task                   | Location                                                      | Notes                                          |
| ---------------------- | ------------------------------------------------------------- | ---------------------------------------------- |
| Worker topology        | `validate-worker-config.mjs`                                  | bindings, queues, Workflows, preview isolation |
| Workspace dependencies | `validate-workspace-dependencies.mjs`                         | declared imports and `*` workspace links       |
| Architecture docs      | `validate-architecture-docs.mjs`, `architecture-docs-*.mjs`   | current-state and ADR-link checks              |
| Naming                 | `validate-monorepo-naming.mjs`                                | project naming and script-language rules       |
| AGENTS hierarchy       | `verify-agents-compliance.go`, `check-agents-coverage.js`     | required guides and hotspot coverage           |
| Production surface     | `verify-deployment.go`, `smoke-test.go`, `e2e-verify.go`      | remote health/content/security probes          |
| Deployment readiness   | `wait-for-deployment/`                                        | exact-version polling and tests                |
| Lighthouse             | `run-lighthouse-ci.mjs`, `lighthouse-*.mjs`                   | profile, assertions, budgets                   |

## CONVENTIONS

- Run from repository root unless the program documents another working
  directory.
- Keep structural validators deterministic and offline: parse committed files,
  report actionable paths, and exit non-zero on policy violations.
- Keep remote probes read-only, bounded by explicit timeouts, and clear about
  network failure versus contract failure.
- Put reusable parsing/policy logic in focused modules and protect it with the
  adjacent `__tests__/` suites.
- Report identifiers and paths, never resolved secrets, cookies, or session
  contents.
- Add package scripts when a validator becomes a required contributor or CI gate.

## ANTI-PATTERNS

- Do not turn verification into deployment, provisioning, or data mutation.
- Do not suppress a failing policy to make CI green; change the contract and its
  validator together when the policy intentionally changes.
- Do not depend on local `.env*`, browser sessions, or private operator state.
- Do not duplicate a validator in another runtime solely for convenience.
- Do not scan generated bundles, reports, `.omo`, coverage, or vendored trees
  unless the check explicitly targets generated output.

## COMMANDS

```bash
npm run lint:agents
npm run lint:naming
npm run verify:architecture-hardening:core
npm run lighthouse:ci
go run ./tools/scripts/verification/verify-deployment.go
```

---

Parent: [../AGENTS.md](../AGENTS.md)
