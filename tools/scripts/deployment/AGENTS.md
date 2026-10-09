# DEPLOYMENT SCRIPTS KNOWLEDGE BASE

**Generated:** 2026-10-09
**Commit:** `f24027a0`
**Branch:** `master`

## OVERVIEW

Operator helpers combine preflight checks, Worker deployment, monitoring hooks, and Grafana configuration import.

Boundary: retained deployment-orchestration domain with external mutation and verification responsibilities.

## WHERE TO LOOK

| Task                 | Location                     | Notes                                                       |
| -------------------- | ---------------------------- | ----------------------------------------------------------- |
| Quick deployment     | `quick-deploy.go`            | Standalone helper                                           |
| Monitored deployment | `deploy-with-monitoring.go`  | Deployment and monitoring orchestration                     |
| Staged helper entry  | `deploy-helper/main.go`      | CLI entry                                                   |
| Preflight checks     | `deploy-helper/preflight.go` | Required checks                                             |
| Worker operation     | `deploy-helper/deploy.go`    | Deployment step                                             |
| Grafana import       | `deploy-grafana-configs/`    | Configuration deployment                                    |
| Rollout primitives   | Sibling `../deploy/`         | Separate canary, blue-green, health-gate, rollback programs |

## CONVENTIONS

- Run single-file helpers by filename; run multi-file helpers as package directories.
- Use `go -C tools/scripts run ./deployment/deploy-helper` for the multi-file helper.
- Preflight includes validation and generated-input preparation before any external write.
- Keep deployment result checks separate from local build success.
- Grafana helpers consume infrastructure assets; validate datasource assumptions before import.
- These programs are invoked manually; the root Go test command does not cover deployment helpers.

## ANTI-PATTERNS

- Do not execute an operator helper as a substitute for read-only bundle validation.
- Do not proceed past a failing required preflight step.
- Do not bypass rollback or health verification hooks provided by the helper.
- Do not treat a completed command as evidence that production serves the intended version.

---

Parent: [../AGENTS.md](../AGENTS.md)
