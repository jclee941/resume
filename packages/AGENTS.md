# WORKSPACE PACKAGES KNOWLEDGE BASE

**Generated:** 2026-06-30
**Commit:** `766d220c`
**Branch:** `master`

## OVERVIEW

Workspace packages publish shared contracts, runtime validation, data, CLI, and
cross-app utilities consumed by portfolio, dashboard, and job automation code.

## STRUCTURE

```text
packages/
├── cli/        # resume operator CLI
├── contracts/  # OpenAPI and Worker env contracts
├── data/       # canonical resume/application content
├── env/        # environment parsing and validation
├── schemas/    # Zod runtime schemas
├── shared/     # cross-package runtime utilities and clients
└── types/      # dependency-light domain constants and typedefs
```

## WHERE TO LOOK

| Task                      | Location             | Notes                                        |
| ------------------------- | -------------------- | -------------------------------------------- |
| Domain constants/typedefs | `types/`             | no runtime validation dependency             |
| Runtime validation        | `schemas/`           | Zod schemas mirror canonical types           |
| Environment contracts     | `env/`, `contracts/` | parse env values; publish API/env surface    |
| Resume/content SSoT       | `data/`              | authoritative data and platform mappings     |
| Shared runtime helpers    | `shared/`            | errors, logging, rate-limit, clients, crypto |
| Operator commands         | `cli/`               | Node CLI entry and verification helpers      |

## CONVENTIONS

- Workspace dependencies use `"*"`; do not use `file:` links between packages.
- Define domain shape once in `@resume/types`, then validate through
  `@resume/schemas` when runtime checks are needed.
- Keep `@resume/types` dependency-light. Runtime helpers belong in `shared`,
  validation in `schemas`, and published contracts in `contracts`.
- Package entry points should be thin re-export surfaces or focused command
  entry files.
- Child package AGENTS files own package-specific commands, anti-patterns, and
  data ownership details.

## ANTI-PATTERNS

- Do not duplicate a domain type across packages.
- Do not import app-local modules from packages.
- Do not put secrets, tokens, cookies, or live Cloudflare IDs in package data,
  fixtures, schema defaults, or CLI code.
- Do not bypass schemas with unchecked casts or broad runtime assumptions.
- Do not move generated resume/application outputs into source package data
  unless the owning child guide allows it.

Parent: [../AGENTS.md](../AGENTS.md)
