# PROJECT KNOWLEDGE BASE

**Generated:** 2026-03-04
**Commit:** 05a787b

## OVERVIEW

Workflow-level CI/CD validation logic for this monorepo. This directory owns job orchestration, gate ordering, and release/maintenance automation details.

21 workflow files are maintained here.

## WHERE TO LOOK

| Task                           | Location                                     | Notes                                       |
| ------------------------------ | -------------------------------------------- | ------------------------------------------- |
| Main CI validation flow        | `ci.yml`                                     | lint/typecheck/test/build + security checks |
| Deployment verification checks | `verify.yml`                                 | post-deploy health checks                   |
| Security scanning              | `codeql.yml`                                 | static analysis gate                        |
| Release automation             | `release.yml`                                | tag/version release mechanics               |
| Infra plan/apply               | `terraform.yml`                              | infra workflow gates                        |
| Resume sync automation         | `wanted-resume-sync.yml`                     | Wanted/JobKorea sync workflow               |
| Repo sync workflows            | `auto-sync.yml`, `auto-update.yml`           | cross-repo sync and scheduled updates       |
| Repo hygiene automation        | `labeler.yml`, `stale.yml`, `auto-merge.yml` | labeling and lifecycle controls             |
| Maintenance jobs               | `maintenance.yml`, `update-snapshots.yml`    | scheduled/utility checks                    |
| Error→issue automation         | `auto-issue-on-failure.yml`                  | creates issues on CI/deploy/release failure  |

## WORKFLOW INVENTORY

- Synced workflows (10): `auto-merge.yml`, `codex-auto-issue.yml`, `codex-triage.yml`, `commitlint.yml`, `labeler.yml`, `lock-threads.yml`, `pr-size.yml`, `release-drafter.yml`, `stale.yml`, `welcome.yml`.
- Repo-specific workflows (11): `auto-issue-on-failure.yml`, `auto-sync.yml`, `auto-update.yml`, `ci.yml`, `codeql.yml`, `maintenance.yml`, `release.yml`, `terraform.yml`, `update-snapshots.yml`, `verify.yml`, `wanted-resume-sync.yml`.

## CONVENTIONS

- Treat workflows as validation/control-plane definitions, not application runtime logic.
- Keep production deploy authority aligned to project policy (Cloudflare Builds for portfolio path).
- Preserve explicit job dependencies (`needs`) so gate order stays deterministic.
- Keep permissions minimal per job; avoid broad write scopes.
- Keep failure reporting explicit when adding new deploy/verify jobs.

## ANTI-PATTERNS

- Never assume a passing CI run is equivalent to a production deployment.
- Never bypass security scans, secret checks, or health verification gates.
- Never introduce mutable action tags when pinned SHAs are the established pattern.
- Never duplicate large shell logic in YAML when equivalent repo scripts already exist.
- Never add manual deploy-only behavior that conflicts with automation-first policy.

## NOTES

- This folder is a high-change hotspot; update related docs when gate semantics change.
- `verify.yml` recently hardened health/title/CSP checks; preserve retry/robust parsing behavior when editing.
- `release.yml` ELK ingest is inlined (not a reusable workflow) because `workflow_run` triggers don't support cross-repo `uses:`.
- `release.yml` uses 1Password (`1password/load-secrets-action`) to load `ELASTICSEARCH_API_KEY` at runtime via `OP_SERVICE_ACCOUNT_TOKEN`.
- `elk-ingest` job uses `vars.RUNNER` (self-hosted runner) for Elasticsearch network access; falls back to `ubuntu-latest`.
- `terraform.yml` uses 1Password for all credentials: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` from `op://homelab/cloudflare/*`, R2 backend (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) from `op://homelab/cloudflare-r2/*`.
