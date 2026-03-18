# MONITORING KNOWLEDGE BASE

**Generated:** 2026-03-17
**Commit:** `882b837`
**Branch:** `master`

## OVERVIEW

Monitoring assets for dashboards, logging strategy, SLOs, tracing, uptime checks, and Elasticsearch/Grafana integration.

## STRUCTURE

```text
infrastructure/monitoring/
├── grafana-dashboard-*.json   # dashboard exports
├── README.md                  # operator-facing monitoring guide
├── logging-strategy.md        # backend responsibility split
├── elasticsearch/             # ES-oriented assets
├── grafana/                   # Grafana-specific support files
├── slo/                       # service-level objectives
├── tracing/                   # trace/log correlation material
└── uptime/                    # uptime monitoring assets
```

## WHERE TO LOOK

| Task                      | Location                                  | Notes                                |
| ------------------------- | ----------------------------------------- | ------------------------------------ |
| Main dashboard behavior   | `grafana-dashboard-resume-portfolio.json` | primary production dashboard export  |
| Logging backend contract  | `logging-strategy.md`                     | ES for app logs, Loki for infra logs |
| Operator deployment steps | `README.md`                               | Grafana API/UI workflow              |
| SLO/tracing specifics     | `slo/`, `tracing/`                        | targeted reliability docs            |

## CONVENTIONS

- Dashboard JSON files are versioned artifacts; keep docs clear about which file is primary.
- Elasticsearch is the app-log source of truth; Loki is infrastructure/ops-oriented unless explicitly stated otherwise.
- Prefer Grafana API or UI deployment flows; avoid undocumented NAS/SSH drift.
- Monitoring docs should name the datasource, query family, and alert ownership explicitly.

## ANTI-PATTERNS

- Never treat dashboards as self-updating truth; exported JSON and deployed UI can drift.
- Never document dual-write logging as acceptable default when the strategy file says to converge roles.
- Never hardcode live secrets or bearer tokens in monitoring docs/examples.
- Never collapse infrastructure logs and application logs into one vague bucket without naming the backend.

## NOTES

- `README.md` is operator-heavy; `logging-strategy.md` is the better source for backend responsibility and migration intent.
- This directory is a good child boundary because alerting, tracing, and logging semantics differ from general infrastructure guidance.
