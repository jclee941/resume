# Logging Consolidation Strategy

## Current State (As of 2026-02)

Two logging backends operate in parallel with overlapping responsibilities:

| Backend           | Transport                                           | Use Cases                                                      | Status                                              |
| ----------------- | --------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------- |
| **Elasticsearch** | `logToElasticsearch()` (HTTP POST, fire-and-forget) | Request logs, Web Vitals, analytics, link tracking, error logs | **Primary** — 25+ call sites across 8 files         |
| **Loki**          | `logToLoki()` (HTTP POST via loki-logger.js)        | Worker request logs, error context                             | **Underused** — defined but rarely called in routes |

## Problem

- **Dual writes** for the same event waste compute on the CF Worker (each log = outbound HTTP)
- **No clear contract** for which backend receives what
- **Query fragmentation** — operators must check both Kibana and Grafana Explore
- **Correlation gap** — traceId propagates to ES but Loki may not receive it

## Recommended Architecture

```
                    CF Worker
                       |
            ┌──────────┴──────────┐
            ▼                     ▼
     Elasticsearch              Loki
   (Application Logs)    (Infrastructure Logs)
            │                     │
       Kibana UI            Grafana Explore
            └─────────┬───────────┘
                      │
              Grafana (unified)
              Trace-to-Logs via traceId
```

### Role Assignment

| Backend           | Responsibility                                                   | Rationale                                                   |
| ----------------- | ---------------------------------------------------------------- | ----------------------------------------------------------- |
| **Elasticsearch** | Application logs: requests, errors, vitals, analytics, tracking  | Already primary; structured search, Kibana dashboards exist |
| **Loki**          | Infrastructure logs: Prometheus alerts, Grafana events, n8n runs | Native Grafana integration; label-based queries for ops     |

### Migration Steps

1. ~~**Audit all `logToLoki()` call sites**~~ ✅ Done (2026-02-16): `logToLoki()` was never called from any route. Dead code.
2. ~~**Remove duplicate Loki writes**~~ ✅ Done (2026-02-16): Deleted `loki-logger.js` (dead code). ES is sole app log sink.
3. **Ensure traceId** is present in ALL ES log entries (enables Trace-to-Logs)
4. **Configure Grafana Explore** to query both ES and Loki with traceId correlation
5. **Update Grafana alert rules** that query Loki for app logs → point to ES instead
   - Exception: `resume_error_log_spike` alert currently queries Loki — migrate to ES query

### Success Criteria

- [x] Zero dual-write log events (each event goes to exactly ONE backend)
- [ ] All application logs in ES with traceId field
- [ ] Grafana Explore can jump from trace → ES log → Loki infra log
- [ ] `resume_error_log_spike` alert queries ES (not Loki) for app errors
- [x] Loki receives only infrastructure/ops logs (not application request logs)
