# INFRASTRUCTURE KNOWLEDGE BASE

**Generated:** 2026-02-09
**Commit:** 29d46c2
**Branch:** master

## OVERVIEW

Infrastructure as Code (IaC) for Cloudflare + Observability stack (Grafana/Loki/Prometheus) + Automation (n8n).

## STRUCTURE

```
infrastructure/
├── cloudflare/              # Terraform IaC for Cloudflare
│   ├── backend.tf           # State backend configuration
│   ├── d1.tf                # D1 database data sources (read-only)
│   ├── dns.tf               # DNS records (A, CNAME, TXT)
│   ├── kv.tf                # KV namespace data sources (read-only)
│   ├── outputs.tf           # Output values
│   ├── variables.tf         # Input variables (account_id, zone_id, api_token)
│   ├── versions.tf          # Provider requirements (cloudflare ~> 4.0)
│   └── workers.tf           # Worker scripts and routes
├── monitoring/              # Grafana JSON dashboards
├── automation/              # systemd timers, crontab
├── n8n/                     # n8n JSON workflow exports
├── configs/                 # Alert rules, datasources
├── database/                # D1 migration SQL
└── nginx/                   # Proxy: SSL termination, CSP
```

## WHERE TO LOOK

| Task                | Location               | Notes                          |
| ------------------- | ---------------------- | ------------------------------ |
| Terraform resources | `cloudflare/*.tf`      | DNS, Worker routes, KV/D1 refs |
| Dashboards          | `monitoring/`          | Export JSON from Grafana UI    |
| Workflows           | `n8n/`, `automation/`  | n8n JSON, systemd templates    |
| Alert Rules         | `configs/grafana/`     | Edit alert-rules.yaml          |
| DB Schema           | `database/migrations/` | XXXX_name.sql patterns         |
| Proxy Config        | `nginx/nginx.conf`     | Security headers (HSTS, CSP)   |

## CONVENTIONS

- **GitOps**: All changes via PR; UI edits (Grafana/n8n) must be exported to Git.
- **No SSH Drift**: Direct NAS edits forbidden. Use Git.
- **Secret Masking**: Use `.env` or Vault; never commit credentials.
- **D1 Versioning**: Use migration scripts for DB updates.

### Terraform-Specific

- **Import First**: Existing resources must be imported before managing.
- **Read-Only Resources**: KV/D1 managed by Wrangler; Terraform only reads.
- **State Lock**: Use Terraform Cloud or local state with locking.

## ANTI-PATTERNS

| Anti-Pattern                  | Why                        | Do Instead                          |
| ----------------------------- | -------------------------- | ----------------------------------- |
| Create KV/D1 in Terraform     | Wrangler creates these     | Use `data` sources only             |
| Skip terraform import         | Duplicate resource errors  | Import existing before apply        |
| Manual DNS edits in dashboard | Drift from Terraform state | Edit `dns.tf` and apply             |
| UI-Only Grafana fixes         | Forgetting to export JSON  | Export and commit after UI changes  |
| Direct SQL in D1 console      | No version control         | Use migration scripts               |
| Hardcode secrets              | Security violation         | Use `terraform.tfvars` (gitignored) |

## COMMANDS

```bash
# Terraform
cd infrastructure/cloudflare
terraform init
terraform plan
terraform apply
terraform import cloudflare_workers_script.portfolio $ACCOUNT_ID/resume-portfolio

# Health/Metrics
curl -s https://resume.jclee.me/health
curl -s https://resume.jclee.me/metrics
```

## DIVISION OF RESPONSIBILITY

| Layer         | Managed By | Changes Via              |
| ------------- | ---------- | ------------------------ |
| DNS records   | Terraform  | `dns.tf` + GitHub PR     |
| Worker routes | Terraform  | `workers.tf` + GitHub PR |
| Job routes    | Terraform  | `resume.jclee.me/job/*`  |
| Worker code   | Wrangler   | `npm run deploy`         |
| KV namespaces | Wrangler   | Create only              |
| D1 databases  | Wrangler   | Create only              |
