# CLOUDFLARE INFRASTRUCTURE KNOWLEDGE BASE

**Generated:** 2026-01-31
**Commit:** 4d93e777
**Branch:** master

## OVERVIEW

Terraform IaC for Cloudflare resources: Workers, DNS, KV namespaces, D1 databases.
GitOps workflow with GitLab CI integration.

## STRUCTURE

```
cloudflare/
├── versions.tf              # Provider requirements (cloudflare ~> 4.0)
├── variables.tf             # Input variables (account_id, zone_id, api_token)
├── backend.tf               # GitLab HTTP state backend
├── workers.tf               # Worker scripts and routes
├── dns.tf                   # DNS records (A, CNAME, TXT)
├── kv.tf                    # KV namespace data sources (read-only)
├── d1.tf                    # D1 database data sources (read-only)
├── outputs.tf               # Output values
├── terraform.tfvars.example # Template for credentials
└── README.md                # Quick start guide
```

## WHERE TO LOOK

| Task              | Location      | Notes                          |
| ----------------- | ------------- | ------------------------------ |
| Add DNS record    | `dns.tf`      | A, CNAME, TXT records          |
| Add Worker route  | `workers.tf`  | Routes only; code via Wrangler |
| View KV namespace | `kv.tf`       | Read-only data source          |
| View D1 database  | `d1.tf`       | Read-only data source          |
| Change provider   | `versions.tf` | Cloudflare provider version    |
| Configure backend | `backend.tf`  | GitLab HTTP state              |

## CONVENTIONS

- **GitOps**: All changes via MR; `terraform:plan` runs on MR, `terraform:apply` on master merge.
- **State Lock**: GitLab HTTP backend with locking; credentials via CI variables.
- **Import First**: Existing resources must be imported before managing.
- **Read-Only Resources**: KV/D1 managed by Wrangler; Terraform only reads.

## ANTI-PATTERNS

| Anti-Pattern              | Why                        | Do Instead                          |
| ------------------------- | -------------------------- | ----------------------------------- |
| Create KV/D1 in Terraform | Wrangler creates these     | Use `data` sources only             |
| Skip import               | Duplicate resource errors  | Import existing before apply        |
| Local state               | Drift between developers   | Use GitLab HTTP backend             |
| Hardcode credentials      | Security violation         | Use `terraform.tfvars` (gitignored) |
| Manual DNS edits          | Drift from Terraform state | Edit `dns.tf` and apply             |

## COMMANDS

```bash
# Initialize
cd infrastructure/cloudflare
terraform init

# Plan (dry run)
terraform plan

# Apply changes
terraform apply

# Import existing worker
terraform import cloudflare_workers_script.portfolio $ACCOUNT_ID/resume-portfolio

# Check state
terraform state list

# Detect drift
terraform plan -detailed-exitcode
```

## CI/CD PIPELINE

| Job               | Trigger       | Purpose             |
| ----------------- | ------------- | ------------------- |
| `terraform:plan`  | MR created    | Show plan in MR     |
| `terraform:apply` | Merge master  | Auto-apply changes  |
| `terraform:drift` | Weekly (cron) | Detect config drift |

## DIVISION OF RESPONSIBILITY

| Layer         | Managed By | Changes Via              |
| ------------- | ---------- | ------------------------ |
| DNS records   | Terraform  | `dns.tf` + GitLab MR     |
| Worker routes | Terraform  | `workers.tf` + GitLab MR |
| Worker code   | Wrangler   | `npm run deploy`         |
| KV namespaces | Wrangler   | Create only              |
| D1 databases  | Wrangler   | Create only              |

## FILES

| File                       | Purpose                         |
| -------------------------- | ------------------------------- |
| `terraform.tfvars`         | Credentials (gitignored)        |
| `terraform.tfvars.example` | Template for credentials        |
| `.gitignore`               | Ignores `*.tfstate`, `*.tfvars` |
| `.terraform.lock.hcl`      | Provider version lock           |

## STATE BACKEND

```hcl
backend "http" {
  address        = "https://gitlab.jclee.me/api/v4/projects/1/terraform/state/cloudflare"
  lock_address   = "https://gitlab.jclee.me/api/v4/projects/1/terraform/state/cloudflare/lock"
  unlock_address = "https://gitlab.jclee.me/api/v4/projects/1/terraform/state/cloudflare/lock"
}
```

CI variables: `TF_HTTP_USERNAME` (gitlab-ci-token), `TF_HTTP_PASSWORD` (CI job token).
