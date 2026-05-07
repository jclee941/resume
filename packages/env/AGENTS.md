# ENV PACKAGE KNOWLEDGE BASE

**Generated:** 2026-05-07
**Commit:** `713f507e`
**Branch:** `master`

**Package:** `@resume/env`
**Type:** Environment validation + type-safe secrets
**Scope:** Per-app Zod schemas for runtime env var validation

## OVERVIEW

Type-safe environment variable validation for all workspace apps. Each app
provides a Zod schema describing required and optional env vars; this package
provides the `validateEnv()` runner that fails fast with a clear error when a
required env var is missing.

Created per SSOT-029 / issue #34.

## STRUCTURE

```text
packages/env/
└── src/
    ├── index.js              # barrel: validateEnv, EnvValidationError
    ├── parse.js              # validator + error class
    ├── schemas/
    │   ├── portfolio.js      # portfolio worker env schema
    │   ├── job-dashboard.js  # dashboard worker env schema
    │   └── job-server.js     # job-server runtime env schema
    └── __tests__/            # parse.test.js, schemas.test.js
```

## EXPORTS

| Import Path                   | Source                        | Purpose                           |
| ----------------------------- | ----------------------------- | --------------------------------- |
| `@resume/env`                 | `src/index.js`                | `validateEnv()`, `EnvValidationError` |
| `@resume/env/parse`           | `src/parse.js`                | Direct parser access              |
| `@resume/env/schemas/portfolio`      | `src/schemas/portfolio.js`    | `portfolioEnvSchema`              |
| `@resume/env/schemas/job-dashboard`  | `src/schemas/job-dashboard.js`| `jobDashboardEnvSchema`           |
| `@resume/env/schemas/job-server`     | `src/schemas/job-server.js`   | `jobServerEnvSchema`              |

## CONVENTIONS

- **Zod is the only runtime dep.** No other validators.
- **Per-app schemas** live under `./schemas/*.js` and are imported by each app
  at bootstrap (`Worker fetch`, Node entry).
- **Fail-fast:** `validateEnv()` throws `EnvValidationError` on missing/invalid
  vars so CI/logs surface the exact key by name.
- **Optional bindings** (e.g., `ASSETS`, `AI`, KV namespaces) are injected by
  the Workers runtime as objects, not strings — they are NOT validated here.
- **Type inference:** each schema exports a `@typedef` via `z.infer<typeof schema>`.

## ANTI-PATTERNS

- Never skip env validation at app bootstrap — always call `validateEnv()`.
- Never add secrets to schema defaults — secrets must come from the secrets
  manager (Cloudflare Workers Secrets / 1Password).
- Never validate Workers object bindings (KV, D1, R2) as strings — they are
  runtime-injected objects.

---

Parent: [../../AGENTS.md](../../AGENTS.md)
