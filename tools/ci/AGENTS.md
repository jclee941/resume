# CI SCRIPTS KNOWLEDGE BASE

**Generated:** 2026-07-22
**Commit:** `164e83ac`
**Branch:** `master`

## OVERVIEW

CI validation scripts: change-impact detection, wrangler config guards, environment schema drift, and D1 migration safety. Non-interactive, deterministic, fail-fast. CI is validation-only; Cloudflare Workers Builds owns production deploy authority.

## SCRIPTS

| Script                          | Purpose                                                   |
| ------------------------------- | --------------------------------------------------------- |
| `affected.go`                   | Detect changed packages for CI work avoidance             |
| `validate-cloudflare-native.go` | Wrangler config guard rails (bindings, queues, Workflows) |
| `check-env-schema-drift.go`     | Environment contract validation                           |
| `validate-migrations.go`        | D1 migration safety and reversibility                     |

## CONVENTIONS

- Non-interactive, deterministic, fail-fast.
- Exit codes: 0 = pass, non-zero = fail.
- Used by `.github/workflows/ci.yml`.
- Report actionable paths and identifiers, never resolved secrets.

## ANTI-PATTERNS

- Never skip `affected.go` — causes unnecessary CI work.
- Never treat CI as deploy authority.
- Never suppress a failing policy to make CI green.

---

Parent: [../AGENTS.md](../AGENTS.md)
