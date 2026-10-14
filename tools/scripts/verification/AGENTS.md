# VERIFICATION SCRIPTS KNOWLEDGE BASE

**Generated:** 2026-10-14
**Commit:** `493d44f6`
**Branch:** `master`

## OVERVIEW

Offline repository validators and bounded remote probes verify structural contracts and deployment state.

Boundary: score 6; retained policy-verification domain with distinct offline and network execution contracts.

## WHERE TO LOOK

| Task                    | Location                                                    | Notes                                  |
| ----------------------- | ----------------------------------------------------------- | -------------------------------------- |
| Worker topology         | `validate-worker-config.mjs`, `validate-worker-rules.mjs`   | Bindings, consumers, preview isolation |
| Workspace imports       | `validate-workspace-dependencies.mjs`                       | Dependency and import declarations     |
| Architecture governance | `validate-architecture-docs.mjs`, `architecture-docs-*.mjs` | ADR/index and current-state checks     |
| Source limits           | `check-source-loc.mjs`                                      | Code-line counting and exclusions      |
| Naming policy           | `validate-monorepo-naming.mjs`                              | Paths and script-language conventions  |
| Guide policy            | `verify-agents-compliance.go`, `check-agents-coverage.js`   | Required files, metadata, coverage     |
| Dependency audit        | `audit-production-dependencies.mjs`                         | Production dependency report policy    |
| Runtime probes          | `verify-deployment/`, `smoke-test/`, `e2e-verify.go`        | Remote health, content, security       |
| Version readiness       | `wait-for-deployment/`                                      | Exact-version polling and tests        |
| Performance budgets     | `run-lighthouse-ci.mjs`, `lighthouse-*.mjs`                 | Profiles and assertions                |

## CONVENTIONS

- Node validators are an explicit exception for repository-local deterministic checks.
- Deterministic Node policy checks parse repository inputs and return nonzero status on violations.
- Remote probes distinguish transport failure from a failed application contract and use bounded timeouts.
- `verify:architecture-hardening:core` composes worker, SSoT, workspace, and architecture checks.
- `npm run test:tools` covers adjacent Node suites; deployment waiting has its own explicit Go test target.
- `check-source-loc.mjs` excludes tests and counts code rather than raw blank/comment/template lines.
- Guide compliance sets failure status for missing required files, but some content defects only print diagnostics.
- Inspect H1, metadata, parent links, and forbidden-marker output even when `lint:agents` exits zero.
- Root `npm run lighthouse:ci` supplies `tools/lighthouserc.json` to the profile runner.
- `security:audit` invokes network-backed `npm audit --omit=dev`; it is not a license audit.

## ANTI-PATTERNS

- Do not turn a verification command into a deployment or data-mutation operation.
- Do not require private browser sessions or operator env files for offline policy checks.
- Do not duplicate a validator in a second runtime merely for convenience.
- Do not scan generated reports, vendored trees, or session artifacts unless they are the explicit subject.

---

Parent: [../AGENTS.md](../AGENTS.md)
