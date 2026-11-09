# Cloudflare Infrastructure (Terraform)

Terraform configuration for Cloudflare Workers, DNS, KV, and D1.

> **Reference only; not applied.** This directory contains Terraform
> declarations and data-source references. There is no active Terraform
> plan/apply workflow in this repository. Do not use this page as an apply
> procedure or infer remote infrastructure state from these files. See the
> [infrastructure ownership guide](../AGENTS.md) and root
> [`wrangler.jsonc`](../../wrangler.jsonc) for the deployed Worker
> configuration.

## Review the declarations

Review the `.tf` declarations and their ownership before proposing a change.
This documentation does not authorize or describe `terraform apply`.

## Import references

The following shows the variable shape for an import command. Resolve and
verify resource ownership and IDs from an authorized source before any
operator action; the example contains no account or zone identifiers.

```bash
export ACCOUNT_ID=<account-id>
export ZONE_ID=<zone-id>

terraform import cloudflare_workers_script.portfolio $ACCOUNT_ID/resume-portfolio
terraform import cloudflare_workers_script.job_dashboard $ACCOUNT_ID/job-dashboard
terraform import cloudflare_workers_route.portfolio_resume $ZONE_ID/<route-id>
terraform import cloudflare_workers_route.job_dashboard $ZONE_ID/<route-id>
```

## Files

| File         | Purpose                      |
| ------------ | ---------------------------- |
| versions.tf  | Provider requirements        |
| variables.tf | Input variables              |
| backend.tf   | S3-compatible remote backend |
| workers.tf   | Worker scripts and routes    |
| dns.tf       | DNS records                  |
| kv.tf        | KV namespace data sources    |
| d1.tf        | D1 database data sources     |
| outputs.tf   | Output values                |

## Workflow ownership

No `.github/workflows/release.yml` or active Terraform automation is present.
GitHub Actions validates the repository; Cloudflare Workers Builds owns
production Worker deployment. The configured Terraform backend is
S3-compatible, but this README does not establish who currently owns its
remote state.

## Division of Responsibility

| Area                  | Repository declaration                   | Current ownership boundary                            |
| --------------------- | ---------------------------------------- | ----------------------------------------------------- |
| DNS and Worker routes | Terraform files                          | No active Terraform apply workflow is configured      |
| KV namespaces and D1  | Read-only Terraform data sources         | Compare with root Worker bindings; schema is separate |
| Worker code           | Root `wrangler.jsonc` and Worker sources | Cloudflare Workers Builds                             |
| Zone response headers | Historical note below                    | Remote state is not verified                          |

## Historical zone response-header note

> Remote state has not been verified.

The zone-wide "Add security headers" Managed Transform is disabled so the
Worker's own headers (`X-Frame-Options: DENY`,
`X-XSS-Protection: 0`, `Referrer-Policy: strict-origin-when-cross-origin`) reach
browsers. A response-header Transform Rule re-applies the former managed values
(`nosniff`, `SAMEORIGIN`, `same-origin`, `1; mode=block`, `Expect-CT`) to every
other host, so they are unchanged.
