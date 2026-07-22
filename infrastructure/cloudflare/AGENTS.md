# CLOUDFLARE TERRAFORM KNOWLEDGE BASE

**Generated:** 2026-07-22 (verified 164e83ac)
**Commit:** `164e83ac`
**Branch:** `master`

## OVERVIEW

Terraform declarations for Cloudflare DNS, a legacy Worker script/route pair,
and KV/D1 references. Production Worker deployment authority is Cloudflare
Workers Builds, not this Terraform subtree.

## STRUCTURE

```text
infrastructure/cloudflare/
├── backend.tf              # S3-compatible state backend
├── versions.tf             # provider/version pins
├── variables.tf            # input variables
├── dns.tf                  # DNS records
├── workers.tf              # legacy script upload from worker.js plus route
├── kv.tf                   # KV namespace references
├── d1.tf                   # D1 database references
├── outputs.tf              # output values
├── terraform.tfvars.example
├── multi-region/           # region-specific assets
└── r2/                     # R2-specific assets
```

## WHERE TO LOOK

| Task                | Location                   | Notes                                                                    |
| ------------------- | -------------------------- | ------------------------------------------------------------------------ |
| Backend/state       | `backend.tf`               | S3-compatible (bucket: `terraform-state`)                                |
| Worker script/route | `workers.tf`               | Reads generated `apps/portfolio/worker.js`; legacy, not deploy authority |
| DNS changes         | `dns.tf`                   | GitOps through PRs                                                       |
| KV/D1 refs          | `kv.tf`, `d1.tf`           | Read-only resource references                                            |
| CI validation       | `.github/workflows/ci.yml` | repository validation only; no Terraform apply                           |

## CONVENTIONS

- Import existing resources first; do not assume Terraform creates from scratch.
- State backend is S3-compatible; update docs and CI together if that changes.
- Keep Workers Builds as production deploy authority. Treat the script resource
  in `workers.tf` as legacy configuration to reconcile or retire deliberately.
- Treat KV and D1 as referenced infrastructure, not mutable application data.

## ANTI-PATTERNS

- Never run `terraform apply` locally against production.
- Never use `terraform apply` here as a routine Worker code deployment shortcut.
- Never hardcode account IDs, zone IDs, or route IDs without marking as examples.

---

Parent: [../AGENTS.md](../AGENTS.md)
