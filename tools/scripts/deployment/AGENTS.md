# DEPLOYMENT SCRIPTS KNOWLEDGE BASE

**Generated:** 2026-07-22
**Commit:** `164e83ac`
**Branch:** `master`

## OVERVIEW

Deployment helper scripts: preflight checks, staged deployment, monitoring hooks. Local helpers only; Cloudflare Workers Builds owns production deploy authority.

## SCRIPTS

| Script                      | Purpose                                |
| --------------------------- | -------------------------------------- |
| `quick-deploy.go`           | One-command deploy with all checks     |
| `deploy-helper.go`          | Staged deploy with progress indicators |
| `deploy-with-monitoring.go` | Deploy with monitoring hooks           |
| `deploy-grafana-configs.go` | Observability config deploy helper     |

## CONVENTIONS

- Treat these scripts as helpers around validated automation flows.
- Run validation (`lint`, `typecheck`, `test`, `build`) before deployment actions.
- Keep secrets in environment variables or managed secret stores.
- Keep logging explicit so failures are diagnosable in CI and local dry runs.
- Cloudflare Workers Builds is the production deploy authority; these are emergency/operator tools only.

## ANTI-PATTERNS

- Never treat local helper execution as production deployment authority.
- Never run deployment steps while required checks are failing.
- Never print secrets/tokens in logs.
- Never bypass rollback/verification hooks when scripts provide them.

---

Parent: [../AGENTS.md](../AGENTS.md)
