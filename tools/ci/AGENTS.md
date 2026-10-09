# CI SCRIPTS KNOWLEDGE BASE

**Generated:** 2026-10-09
**Commit:** `f24027a0`
**Branch:** `master`

## OVERVIEW

Standalone Go checks for Cloudflare topology, environment contracts, migrations, and affected targets.

Boundary: retained validation domain outside the operational Go module.

## WHERE TO LOOK

| Task                | Location                                                   | Notes                              |
| ------------------- | ---------------------------------------------------------- | ---------------------------------- |
| Cloudflare topology | `validate-cloudflare-native.go`                            | Root config and legacy-path guards |
| Environment drift   | `check-env-schema-drift.go`                                | Environment-contract check         |
| Migration safety    | `validate-migrations.go`                                   | D1 migration validation            |
| Change impact       | `affected/affected.go`, `affected/targets.go`              | Target selection                   |
| Regression coverage | `affected/affected_test.go`, `validate_migrations_test.go` | Explicit root Go test targets      |

## CONVENTIONS

- Single-file validators are separate executables; invoke the intended file with `go run`.
- `go run ./tools/ci/validate-cloudflare-native.go` is included in `automate:full`.
- `GO111MODULE=off go -C tools/ci/affected test .` tests change-impact selection.
- `GO111MODULE=off go -C tools/ci test validate-migrations.go validate_migrations_test.go` isolates the migration program.
- `affected` and environment-drift checks are operator tools, not current workflow steps.
- Checks should report the failing repository path or contract and return a nonzero exit status.

## ANTI-PATTERNS

- Do not describe `affected` as mandatory in the current GitHub workflow.
- Do not add a local deployment action to a policy validator.
- Do not combine unrelated standalone `main` files into one package invocation.
- Do not suppress a policy failure merely because the helper runs outside CI.

---

Parent: [../AGENTS.md](../AGENTS.md)
