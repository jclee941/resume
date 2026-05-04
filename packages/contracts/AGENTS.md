# CONTRACTS PACKAGE KNOWLEDGE BASE

**Package:** `@resume/contracts`
**Type:** Cross-app API + binding contracts

## OVERVIEW

Stable surface contracts shared between workers + the job-server runtime.

This package owns the single canonical version of:

- `openapi.yaml` — the REST API spec (formerly at `apps/job-server/openapi.yaml`)
- `Env` interface for Cloudflare Worker bindings (re-exports from `@resume/types/env`)

## STRUCTURE

```text
packages/contracts/
├── openapi.yaml         # canonical API spec (was apps/job-server/openapi.yaml)
└── src/
    ├── index.js         # barrel
    └── env.js           # Env interface re-export
```

## CONVENTIONS

- **OpenAPI is canonical.** Both `apps/job-server` (server) and
  `apps/job-dashboard` (consumer) read from this single spec.
- **Env types live here, definitions in `@resume/types/env`.** This package
  presents the contract; the type definitions themselves are SSoT in
  `@resume/types`.
- **Backward-compat for OpenAPI consumers.** The old path
  `apps/job-server/openapi.yaml` is preserved as a copy until all consumers
  are migrated; downstream PR will remove it.

## ANTI-PATTERNS

- Never edit `openapi.yaml` in two places — this is the only writable copy.
- Never define a binding type without also adding it to `@resume/types/env`.
