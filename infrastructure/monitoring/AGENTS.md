# MONITORING KNOWLEDGE BASE

**Generated:** 2026-10-09
**Commit:** `f24027a0`
**Branch:** `master`

## OVERVIEW

Grafana dashboard exports and the logging, SLO, tracing, and uptime contracts around them.

Boundary: retained distinct observability semantics and dashboard-reference domain.

## WHERE TO LOOK

| Task                       | Location                                                                         | Notes                                        |
| -------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------- |
| Logging ownership          | `logging-strategy.md`                                                            | Default console transport and optional Loki  |
| Operator steps             | `README.md`                                                                      | Grafana API/UI procedures                    |
| Portfolio metrics          | `grafana-dashboard-resume-portfolio.json`                                        | Portfolio dashboard export                   |
| Status and synchronization | `grafana-dashboard-portfolio-status.json`, `grafana-dashboard-sync-metrics.json` | Separate operational views                   |
| Trace dashboard            | `grafana/dashboards/grafana-dashboard-resume-tracing.json`                       | Trace correlation view                       |
| Reliability policy         | `slo/`                                                                           | Definitions, error budgets, burn-rate alerts |
| Trace configuration        | `tracing/tracing-config.json`                                                    | Trace configuration reference                |
| Uptime checks              | `uptime/`                                                                        | Health checks and status-page configuration  |

## CONVENTIONS

- Workers Logs persists application console output; no outbound request is needed per event.
- Loki is opt-in when `LOKI_API_KEY` is configured; Elasticsearch is absent from the stack.
- Console transport handles INFO/WARN/DEBUG; ERROR/FATAL are already emitted by the logger.
- Grafana alert queries use Prometheus; name the datasource and query family in related changes.
- Provisioning and alert routing live in sibling `../configs/`, not this dashboard export directory.
- Record dashboard ownership and export origin when synchronizing a reference snapshot.

## ANTI-PATTERNS

- Do not reintroduce Elasticsearch datasources from historical dashboard or deployment notes.
- Do not make dual-write application logging the default.
- Do not merge app logs, infrastructure logs, metrics, and traces into an unnamed backend category.
- Do not assume an exported dashboard is synchronized with the remote Grafana UI.

---

Parent: [../AGENTS.md](../AGENTS.md)
