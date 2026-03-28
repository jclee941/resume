# DEPLOYMENT SCRIPTS KNOWLEDGE BASE

**Generated:** 2026-03-17
**Commit:** `882b837`
**Branch:** `master`

## OVERVIEW

Deployment helper scripts run preflight checks, deployment wrappers, and post-deploy verification support for Cloudflare-hosted services.

## STRUCTURE

```text
deployment/
├── quick-deploy.go           # one-command deploy helper
├── deploy-helper.go          # staged deploy helper
├── deploy-with-monitoring.go # deploy with monitoring hooks
└── deploy-grafana-configs.go # observability config deploy helper
```

## CONVENTIONS

- Treat these scripts as helpers around validated automation flows.
- Run validation (`lint`, `typecheck`, `test`, `build`) before deployment actions.
- Keep secrets in environment variables or managed secret stores.
- Keep logging explicit so failures are diagnosable in CI/local dry runs.

## ANTI-PATTERNS

- Do not treat local helper execution as production deployment authority.
- Do not run deployment steps while required checks are failing.
- Do not print secrets/tokens in logs.
- Do not bypass rollback/verification hooks when scripts provide them.
