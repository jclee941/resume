# INFRASTRUCTURE KNOWLEDGE BASE

**Generated:** 2026-02-22 22:30:00 KST
**Commit:** 623fd03
**Branch:** master

## OVERVIEW

IaC for Cloudflare resources, monitoring (Grafana/Loki/Prometheus), n8n automation, and database migrations.

## STRUCTURE

```text
infrastructure/
├── cloudflare/           # Terraform for CF resources (see cloudflare/AGENTS.md)
├── monitoring/           # Grafana dashboard JSON
├── automation/           # systemd service files
├── n8n/                  # workflow export JSON
├── configs/              # alert configurations
├── database/             # D1 migration SQL files
└── nginx/                # proxy + CSP config
```

## RESPONSIBILITY DIVISION

| Scope                   | Authority  |
| ----------------------- | ---------- |
| DNS, routes, page rules | Terraform  |
| Worker code, KV data    | Wrangler   |
| D1 schema               | Migrations |
| Monitoring dashboards   | Grafana UI |

## CONVENTIONS

- GitOps: all config in git, applied via CI.
- Import-first for existing resources.
- KV/D1 are read-only in Terraform — manage via Wrangler.

## ANTI-PATTERNS

- Never apply Terraform locally against production.
- Never manage worker code via Terraform.
- Never hardcode resource IDs — use variables.
