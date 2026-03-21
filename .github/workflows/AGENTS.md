# PROJECT KNOWLEDGE BASE

**Generated:** 2026-03-17
**Commit:** `882b837`
**Branch:** `master`

## OVERVIEW

Workflow-level CI/CD validation logic for this monorepo. This directory owns job orchestration, gate ordering, and release/maintenance automation details.

29 workflow files are maintained here (19 synced from `qws941/.github`, 10 repo-specific).

## WHERE TO LOOK

| Task                           | Location                                     | Notes                                       |
| ------------------------------ | -------------------------------------------- | ------------------------------------------- |
| Main CI validation flow        | `ci.yml`                                     | lint/typecheck/test/build + security checks |
| Deployment verification checks | `verify.yml`                                 | post-deploy health checks                   |
| Release automation             | `release.yml`                                | tag/version release mechanics               |
| Infra plan/apply               | `terraform.yml`                              | infra workflow gates                        |
| Resume sync automation         | `wanted-resume-sync.yml`                     | Wanted/JobKorea sync workflow               |
| Repo sync workflows            | `auto-sync.yml`, `auto-update.yml`           | cross-repo sync and scheduled updates       |
| Repo hygiene automation        | `labeler.yml`, `stale.yml`, `auto-merge.yml` | labeling and lifecycle controls             |
| Maintenance jobs               | `maintenance.yml`, `update-snapshots.yml`    | scheduled/utility checks                    |
| Error→issue automation         | `auto-issue-on-failure.yml`                  | creates issues on CI/deploy/release failure |
| Issue/PR management            | `issue-*.yml`, `pr-normalize.yml`            | lifecycle, labeling, dedup, SLA, project    |
| CI failure notification        | `ci-notify-failure.yml`                      | Slack/comment on CI failures                |
| Automation health monitoring   | `automation-health.yml`                      | periodic workflow status check              |

## WORKFLOW INVENTORY

- Synced workflows (19): `auto-approve-runs.yml`, `auto-merge.yml`, `automation-health.yml`, `branch-cleanup.yml`, `ci-notify-failure.yml`, `commitlint.yml`, `dependabot-auto-fix.yml`, `issue-duplicate.yml`, `issue-label.yml`, `issue-lifecycle.yml`, `issue-project.yml`, `issue-sla.yml`, `labeler.yml`, `lock-threads.yml`, `pr-normalize.yml`, `pr-size.yml`, `release-drafter.yml`, `stale.yml`, `welcome.yml`.
- Repo-specific workflows (10): `auto-issue-on-failure.yml`, `auto-sync.yml`, `auto-update.yml`, `ci.yml`, `maintenance.yml`, `release.yml`, `terraform.yml`, `update-snapshots.yml`, `verify.yml`, `wanted-resume-sync.yml`.
- Dynamic/GitHub-managed (5, not files): CodeQL (default setup), Copilot code review, Dependabot Updates, OpenAI Codex, pages-build-deployment.

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
