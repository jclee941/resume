# WORKSPACE PACKAGES KNOWLEDGE BASE

**Generated:** 2026-10-09
**Commit:** `f24027a0`
**Branch:** `master`

## OVERVIEW

Reusable package boundaries and public import surfaces shared by the application runtimes.

Scope reason: score 11; existing workspace-boundary guide.

## STRUCTURE

```text
packages/
  cli/        Operator command entry and verification
  contracts/  Published OpenAPI and environment marker surface
  data/       Resume schema, mapping data, and materialized content ownership
  env/        Environment parsing with per-app schemas
  schemas/    Runtime schemas with ESM and CommonJS distribution
  shared/     Runtime helpers, clients, and platform mappings
  types/      Domain typedefs, constants, and pure normalizers
```

## WHERE TO LOOK

| Task                 | Location                                 | Notes                                     |
| -------------------- | ---------------------------------------- | ----------------------------------------- |
| Export compatibility | Each `package.json`                      | Public subpaths are explicit contracts    |
| CommonJS consumers   | `schemas/AGENTS.md`                      | Tracked generated CJS bundle exception    |
| Runtime helpers      | `shared/AGENTS.md`                       | Subpath-only API; no root export          |
| Package tests        | `cli/`, `env/`, `schemas/`, `shared/`    | Colocated Node test suites                |
| Canonical data rules | `data/AGENTS.md`                         | Separate master inputs from role variants |
| Binding presentation | `contracts/AGENTS.md`, `types/AGENTS.md` | Marker re-export versus actual typedefs   |

## CONVENTIONS

- Most code packages are ESM; consumers needing CommonJS use schemas' published require target.
- Keep import compatibility in package exports, not accidental deep source paths.
- The data package has no executable entry or build scripts.
- Root test scripts aggregate package tests; a missing package-local script is not missing coverage.
- Child guides own local command details and package-specific distribution rules.

## ANTI-PATTERNS

- Do not make a reusable package depend on app-local handlers or views.
- Do not infer an export from a source filename; check the export map.
- Do not add a second package orchestrator beside the root script hub.
- Do not make a package barrel perform startup I/O merely because a consumer imports it.

Parent: [../AGENTS.md](../AGENTS.md)
