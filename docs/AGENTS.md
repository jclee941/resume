# DOCUMENTATION HUB KNOWLEDGE BASE

**Generated:** 2026-10-09
**Commit:** `f24027a0`
**Branch:** `master`

## OVERVIEW

Documentation hub containing current contracts alongside dated audits, plans, and operator procedures.

Boundary: required domain guide; structural score 5 across seven documentation subdirectories.

## STRUCTURE

```text
docs/
├── adr/            # numbered decisions and template
├── api/            # pointer to the published API contract
├── architecture/   # live system descriptions plus dated analysis
├── conventions/    # normative architecture and copy rules
├── guides/         # operator procedures and older implementation reports
├── runbooks/       # rotation and pending operator actions
└── security/       # security policies and playbooks
```

## WHERE TO LOOK

| Task                       | Location                                                              | Notes                                       |
| -------------------------- | --------------------------------------------------------------------- | ------------------------------------------- |
| Decision status            | `README.md`, `adr/`                                                   | Accepted and superseded ADR index           |
| Live topology              | `ARCHITECTURE.md`, `architecture/system-overview.md`                  | Check against current source                |
| Component and KV ownership | `architecture/component-inventory.md`, `architecture/kv-ownership.md` | Machine-checked current-state set           |
| Delivery pipeline          | `architecture/DEPLOYMENT_PIPELINE.md`                                 | Current deployment boundaries               |
| Content procedures         | `guides/CONTENT_PACK.md`                                              | Materialization and fixture generation      |
| Remote MCP                 | `guides/MCP_SERVER.md`                                                | Operator-facing tool contract               |
| Secret classification      | `security/wrangler-vars-vs-secrets.md`                                | Guard policy reference                      |
| Engineering policy         | `conventions/architecture-rules.md`                                   | Normative rule owner                        |
| API specification          | `api/README.md`                                                       | Defers to `packages/contracts/openapi.yaml` |

## CONVENTIONS

- ADR filenames use sequential four-digit IDs; keep status and index links aligned.
- Preserve established uppercase filenames; use relative links for repository references.
- Historical audits and plans remain tracked, including retired-component descriptions.
- Label time-bound findings rather than presenting them as current operational instructions.
- `npm run verify:architecture-governance` checks ADR governance and selected current-state files, not every guide.
- Validate procedure commands against `package.json` and the actual script path before documenting them.

## ANTI-PATTERNS

- Do not promote a historical plan or dated audit into live architecture authority.
- Do not claim all historical reports were archived; several remain in this tree.
- Do not duplicate normative rules when a canonical policy document can be linked.
- Do not copy retired command names from older deployment or Bazel guides.

---

Parent: [../AGENTS.md](../AGENTS.md)
