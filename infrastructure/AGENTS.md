# INFRASTRUCTURE KNOWLEDGE BASE

**Generated:** 2026-07-22 (verified 164e83ac)
**Commit:** `164e83ac`
**Branch:** `master`

## OVERVIEW

Cloudflare infrastructure (Terraform), database migrations (D1 and Supabase),
monitoring dashboards (Grafana), and automation workflows.

## STRUCTURE

```text
infrastructure/
├── cloudflare/           # Terraform for DNS, routes, KV/D1 references
├── database/             # D1 and Supabase migrations, seeds
├── monitoring/           # Grafana dashboards and alert rules
├── automation/           # systemd services and workflow exports
├── configs/              # Grafana alert configurations
├── docker/               # Docker runtime configs
├── mocks/                # Test mocks
└── systemd/              # systemd service definitions
```

## AUTHORITY BOUNDARIES

| Scope                            | Owner                     | Changes Via                                                        |
| -------------------------------- | ------------------------- | ------------------------------------------------------------------ |
| DNS and Cloudflare declarations  | Terraform files           | Review `cloudflare/*.tf`; no active apply workflow                 |
| Production Worker code           | Cloudflare Workers Builds | Build from `master`; local Wrangler is verification/emergency only |
| D1 schema (migrations 0000-0008) | Migrations                | `database/migrations/*.sql`                                        |
| Supabase schema                  | Supabase CLI              | `database/supabase/migrations/*.sql`                               |
| Monitoring dashboards            | Grafana UI                | `monitoring/*.json` (reference only)                               |
| Automation workflows             | Workflow UI               | `automation/*.json` (reference only)                               |

## CONVENTIONS

- Terraform state is S3-compatible backend (bucket: `terraform-state`).
- Never run `terraform apply` locally against production.
- D1 migrations are immutable once deployed; create new migrations for changes.
- Supabase and D1 migrations are separate lineages; keep them distinct.
- Monitoring and automation exports are reference snapshots, not deployment sources.

## ANTI-PATTERNS

- Do not use the legacy Worker script resource in `cloudflare/workers.tf` as the
  routine production deployment path.
- Never hardcode Cloudflare resource IDs in prose.
- Never edit deployed migrations.
- Never mix D1 and Supabase migrations in the same file.

---

Parent: [../AGENTS.md](../AGENTS.md)
