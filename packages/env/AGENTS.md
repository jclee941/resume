# ENV PACKAGE KNOWLEDGE BASE

**Generated:** 2026-10-09
**Commit:** `f24027a0`
**Branch:** `master`

## OVERVIEW

Zod-based parsing of environment values with named, structured validation errors.

Scope reason: existing distinct environment-boundary domain.

## WHERE TO LOOK

| Task             | Location                                    | Notes                                                          |
| ---------------- | ------------------------------------------- | -------------------------------------------------------------- |
| Public barrel    | `src/index.js`                              | `validateEnv` and `EnvValidationError`                         |
| Parser           | `src/parse.js`                              | Validates schema/source arguments and returns parsed values    |
| Portfolio values | `src/schemas/portfolio.js`                  | Portfolio-specific environment schema                          |
| Dashboard values | `src/schemas/job-dashboard.js`              | Required encryption key; optional logging/OAuth/webhook values |
| Parser checks    | `src/__tests__/parse.test.js`               | Invalid source/schema and error behavior                       |
| Schema checks    | `src/__tests__/schemas.test.js`             | Per-app defaults and accepted values                           |
| Consumer adapter | `../../apps/job-dashboard/src/utils/env.js` | Per-env-object memoization                                     |

## CONVENTIONS

- Zod is the only runtime dependency.
- `validateEnv(schema, source, { appName })` returns the schema's parsed/coerced result.
- Invalid parser arguments throw `TypeError`; failed validation throws `EnvValidationError`.
- Validation errors expose the application name and structured issues, with property paths in the message.
- Object bindings such as KV, D1, and R2 are injected separately, not checked as string environment variables.
- Schema modules export inferred JSDoc types alongside their schemas.
- `npm run test:schemas` runs both this package's tests and the schemas package's tests.

## ANTI-PATTERNS

- Do not validate object bindings as serialized strings.
- Do not place live secrets in defaults or validation messages.
- Do not return raw source values after successful parsing; preserve coercions.
- Do not claim every application entry currently invokes this package without checking its imports.

Parent: [../AGENTS.md](../AGENTS.md)
