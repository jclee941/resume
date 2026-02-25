# DEPLOYMENT SCRIPTS KNOWLEDGE BASE

## OVERVIEW

Deployment helper scripts run preflight checks, deployment wrappers, and post-deploy verification support for Cloudflare-hosted services.

## STRUCTURE

```text
deployment/
├── quick-deploy.sh           # one-command deploy helper
├── deploy-helper.sh          # staged deploy helper
├── deploy-via-api.sh         # API-driven deployment helper
├── deploy-with-monitoring.sh # deploy with monitoring hooks
├── deploy-grafana-configs.sh # observability config deploy helper
└── deploy.sh                 # generic deploy wrapper
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
