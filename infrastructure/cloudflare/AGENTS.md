# CLOUDFLARE TERRAFORM KNOWLEDGE BASE

**Generated:** 2026-02-22 22:30:00 KST
**Commit:** 623fd03
**Branch:** master

## OVERVIEW

Terraform IaC for Cloudflare resources. GitLab HTTP state backend.

## FILES

| File           | Purpose                   |
| -------------- | ------------------------- |
| `main.tf`      | provider + backend config |
| `dns.tf`       | DNS records               |
| `workers.tf`   | worker route bindings     |
| `kv.tf`        | KV namespace declarations |
| `d1.tf`        | D1 database declarations  |
| `variables.tf` | input variables           |
| `outputs.tf`   | output values             |
| `versions.tf`  | provider version pins     |

## CI FLOW

- PR: `terraform plan` → comment on PR.
- Merge/dispatch: `terraform apply`.
- Weekly: drift detection.

## CONVENTIONS

- Provider `cloudflare ~> 4.0`.
- Import-first for existing resources.
- KV/D1 read-only in Terraform — data managed via Wrangler.

## ANTI-PATTERNS

- Never run `terraform apply` locally against production.
- Never manage worker code via Terraform — use Wrangler.
