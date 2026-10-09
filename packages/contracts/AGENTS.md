# CONTRACTS PACKAGE KNOWLEDGE BASE

**Generated:** 2026-10-09
**Commit:** `f24027a0`
**Branch:** `master`

## OVERVIEW

Published REST OpenAPI contract and the environment marker re-export surface.

Scope reason: existing distinct external-contract domain.

## WHERE TO LOOK

| Task                    | Location              | Notes                                          |
| ----------------------- | --------------------- | ---------------------------------------------- |
| REST contract           | `openapi.yaml`        | Canonical OpenAPI 3.0.3 document               |
| Package exports         | `package.json`        | Root, environment, and OpenAPI subpaths        |
| Barrel                  | `src/index.js`        | Re-exports the environment module              |
| Environment marker      | `src/env.js`          | Re-exports only `ENV_TYPE_MARKER`              |
| Actual binding typedefs | `../types/src/env.js` | `WorkerEnv`, `PortfolioEnv`, `JobDashboardEnv` |
| Lint configuration      | `../../redocly.yaml`  | OpenAPI validation rules                       |

## CONVENTIONS

- Run `npm run validate:openapi` after changing the published specification.
- Match REST route behavior and status responses when updating contract paths.
- The JavaScript export is a marker, not a runtime `Env` interface object.
- Keep environment type definitions in the types package and presentation here minimal.
- The API overview under `docs/api/` points consumers to this spec.
- Internal validation schemas are not automatically public REST contracts.

## ANTI-PATTERNS

- Do not maintain another writable OpenAPI copy in an application directory.
- Do not claim importing the marker performs runtime environment validation.
- Do not document a runtime binding export absent from `src/env.js`.
- Do not change a published path without checking its route and schema consumers.

Parent: [../AGENTS.md](../AGENTS.md)
