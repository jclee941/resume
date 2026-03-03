# PROJECT KNOWLEDGE BASE

## OVERVIEW

Workflow-level CI/CD validation logic for this monorepo. This directory owns job orchestration, gate ordering, and release/maintenance automation details.

## WHERE TO LOOK

| Task                           | Location                                                       | Notes                                       |
| ------------------------------ | -------------------------------------------------------------- | ------------------------------------------- |
| Main CI validation flow        | `ci.yml`                                                       | lint/typecheck/test/build + security checks |
| Deployment verification checks | `verify.yml`                                                   | endpoint health/CSP/title verification flow |
| Security scanning              | `codeql.yml`                                                   | static analysis gate                        |
| Job worker deployment          | `deploy-job-worker.yml`                                        | worker-specific deploy pipeline             |
| Release automation             | `release.yml`                                                  | tag/version release mechanics               |
| Infra plan/apply               | `terraform.yml`                                                | infra workflow gates                        |
| Repo hygiene automation        | `labeler.yml`, `pr-labeler.yml`, `stale.yml`, `auto-merge.yml` | labeling and lifecycle controls             |
| Maintenance jobs               | `maintenance.yml`, `update-snapshots.yml`                      | scheduled/utility checks                    |

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
- `deploy-job-worker.yml` is stale — job server deploys via Docker, not GitHub Actions.
- `terraform.yml` uses 1Password for all credentials: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` from `op://homelab/cloudflare/*`, R2 backend (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) from `op://homelab/cloudflare-r2/*`.
