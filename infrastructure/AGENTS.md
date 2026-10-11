# INFRASTRUCTURE KNOWLEDGE BASE

**Generated:** 2026-10-11
**Commit:** `28de5bcd`
**Branch:** `master`

## OVERVIEW

Infrastructure declarations, observability configuration, monitoring snapshots, and Cloudflare binding mocks.

Boundary: score 0; required domain guide separating infrastructure state from application and test code.

## WHERE TO LOOK

| Task                    | Location                                         | Notes                                      |
| ----------------------- | ------------------------------------------------ | ------------------------------------------ |
| Cloudflare declarations | `cloudflare/AGENTS.md`                           | Terraform resources and data references    |
| Monitoring semantics    | `monitoring/AGENTS.md`                           | Logs, metrics, traces, uptime, SLOs        |
| Grafana provisioning    | `configs/grafana/`                               | Datasources, alert rules, dashboard export |
| Metrics and probes      | `configs/prometheus/`                            | Prometheus, blackbox, rule files           |
| Alert delivery          | `configs/alertmanager/alertmanager.yml`          | Alert routing configuration                |
| Trace configuration     | `configs/tempo/tempo.yaml`                       | Standalone Tempo reference, not Compose    |
| Compose topology        | `docker/docker-compose.monitoring.yml`           | Supporting monitoring services             |
| Binding test doubles    | `mocks/cf-bindings-mock.js`, `mocks/cloudflare/` | D1, KV, R2, queue, environment mocks       |

## CONVENTIONS

- Terraform declarations have no active apply workflow in this repository.
- Review declared resources separately from the bindings consumed by the deployed Worker.
- D1 schema ownership stays with `apps/job-dashboard/migrations/` and its schema snapshot.
- Treat monitoring exports as reference snapshots; deployed Grafana state can differ.
- The monitoring tools under `tools/scripts/monitoring/` and `tools/scripts/deployment/` consume these assets.
- Compose declares Jaeger for traces; the standalone Tempo configuration does not establish a running Tempo service.
- Mocks are not used by tracked application/test consumers; their D1 adapter imports undeclared `better-sqlite3`.
- Treat those mocks as reference implementations, not a ready test environment.

## ANTI-PATTERNS

- Never run `terraform apply` locally against production.
- Do not edit an already deployed D1 migration to change its meaning.
- Do not infer that stored configuration means its remote service is currently live.
- Do not add host schedulers or daemon loops for application automation here.
- Do not confuse `configs/grafana/` provisioning inputs with `monitoring/` exports.

---

Parent: [../AGENTS.md](../AGENTS.md)
