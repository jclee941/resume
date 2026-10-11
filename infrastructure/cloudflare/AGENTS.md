# CLOUDFLARE TERRAFORM KNOWLEDGE BASE

**Generated:** 2026-10-11
**Commit:** `28de5bcd`
**Branch:** `master`

## OVERVIEW

Terraform DNS and Worker declarations, existing KV/D1 references, and supporting edge-storage examples.

Boundary: score 1; retained distinct Terraform state and resource-ownership domain.

## WHERE TO LOOK

| Task                    | Location                     | Notes                                          |
| ----------------------- | ---------------------------- | ---------------------------------------------- |
| State backend           | `backend.tf`                 | S3-compatible backend                          |
| Provider constraints    | `versions.tf`                | Terraform and provider requirements            |
| Inputs and outputs      | `variables.tf`, `outputs.tf` | Public configuration interface                 |
| DNS records             | `dns.tf`                     | Zone records                                   |
| Worker script and route | `workers.tf`                 | Legacy script upload declaration               |
| Existing namespaces     | `kv.tf`                      | Terraform data sources, not namespace creation |
| Existing database       | `d1.tf`                      | D1 data source; schema is managed elsewhere    |
| Regional examples       | `multi-region/`              | Cache, failover, geo-routing JSON              |
| Storage examples        | `r2/`                        | Bucket configuration and lifecycle examples    |

## CONVENTIONS

- Keep account/domain values behind the declared variables.
- Import and reconcile existing resources before proposing a lifecycle change.
- Data-source entries may include historical namespaces; compare with root `wrangler.jsonc` before treating them as active bindings.
- `workers.tf` still references a generated bundle through a relative file path; validate that path before any deliberate reconciliation.
- Region and R2 JSON are supporting configuration examples, not additional deploy entrypoints.
- Provider authentication currently uses API key/email variables; the backend is S3-compatible.
- The legacy script resource reads `apps/portfolio/worker.js`; it does not compose the root Worker entrypoint.

## ANTI-PATTERNS

- Do not use the legacy script resource as a shortcut for shipping Worker code.
- Do not replace read-only KV/D1 data sources with managed resources without reviewing ownership.
- Do not infer application bindings solely from Terraform output names.
- Do not assume an example JSON file is applied by the validation workflow.

---

Parent: [../AGENTS.md](../AGENTS.md)
