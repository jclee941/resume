# CLOUDFLARE TERRAFORM KNOWLEDGE BASE

**Generated:** 2026-03-17
**Commit:** `882b837`
**Branch:** `master`

## OVERVIEW

Terraform IaC for Cloudflare DNS, worker routes, KV/D1 references, and related account resources. Worker code deployment is separate from Terraform.

## STRUCTURE

```text
infrastructure/cloudflare/
├── backend.tf              # S3-compatible backend (bucket: terraform-state)
├── versions.tf             # provider/version pins
├── variables.tf            # input variables
├── dns.tf                  # DNS records
├── workers.tf              # worker scripts and routes
├── kv.tf                   # KV data sources / references
├── d1.tf                   # D1 data sources / references
├── outputs.tf              # output values
├── terraform.tfvars.example
├── multi-region/           # region-specific Terraform assets
└── r2/                     # R2-specific Terraform assets
```

## WHERE TO LOOK

| Task                   | Location                          | Notes                                                |
| ---------------------- | --------------------------------- | ---------------------------------------------------- |
| Backend/state behavior | `backend.tf`                      | S3-compatible backend (bucket: terraform-state)  |
| Worker route bindings  | `workers.tf`                      | Terraform manages routes, not worker source code     |
| DNS changes            | `dns.tf`                          | GitOps through PRs                                   |
| KV/D1 references       | `kv.tf`, `d1.tf`                  | treat as read-only resource references               |
| Operator overview      | `README.md`                       | import flow, quick start, division of responsibility |
| CI flow                | `.github/workflows/terraform.yml` | plan/apply/drift workflow, current authority         |

## CONVENTIONS

- Import existing resources first; do not assume Terraform creates the full estate from scratch.
- State backend is S3-compatible (bucket: `terraform-state`); update docs and workflow assumptions together if that changes.
- Worker code and data plane changes go through Wrangler / build pipelines, not Terraform.
- Treat KV namespaces and D1 databases as referenced infrastructure, not mutable application data managed here.

## ANTI-PATTERNS

- Never run `terraform apply` locally against production just to test.
- Never document nonexistent files like `main.tf` when the directory is split by concern.
- Never manage worker JavaScript source via Terraform.
- Never hardcode account IDs, zone IDs, or route IDs in prose without clearly marking them examples.

## NOTES

- `README.md` is more trustworthy than the old AGENTS content was: it reflects `backend.tf` and the current file layout.
- This subtree is distinct from general infrastructure because Terraform ownership boundaries matter here more than in `monitoring/` or `n8n/`.
