# SCHEMAS PACKAGE KNOWLEDGE BASE

**Generated:** 2026-10-09
**Commit:** `f24027a0`
**Branch:** `master`

## OVERVIEW

Boundary-specific Zod validators distributed as ESM source and a tracked CommonJS bundle.

Scope reason: score 9; distinct runtime-validation distribution.

## WHERE TO LOOK

| Task                  | Location                                        | Notes                                                 |
| --------------------- | ----------------------------------------------- | ----------------------------------------------------- |
| Public exports        | `src/index.js`, `package.json`                  | Root and supported subpaths                           |
| Common values         | `src/common.js`                                 | IDs, platforms, phone/email, timestamps               |
| Applications          | `src/application.js`, `src/application-core.js` | Create/update/status and core schemas                 |
| Dashboard priority    | `src/application-dashboard.js`                  | Wide priority enum, not a full dashboard model        |
| Foreign ATS packets   | `src/foreign-ats-application.js`                | Packet validation reached through application exports |
| Resume and portfolio  | `src/resume.js`, `src/portfolio.js`             | Structured resume and rendering inputs                |
| Auth/webhooks         | `src/auth.js`, `src/webhook.js`                 | Boundary payloads                                     |
| CommonJS distribution | `dist/index.cjs`                                | Tracked generated require target                      |
| Tests                 | `src/__tests__/`                                | Node application/resume suites                        |

## CONVENTIONS

- Package root `import` resolves to source; `require` resolves to `dist/index.cjs`.
- Rebuild the CJS target with `npm run build:cjs --workspace=@resume/schemas`; `prepare` also invokes it.
- The generated CJS bundle is an explicit tracked distribution exception and leaves Zod external.
- Only listed package subpaths are public; helper source files are not implicit entry points.
- Keep core and wide application status/priority variants distinct for their consumers.
- Run `npm run test:schemas` for this package and environment-schema coverage.

## ANTI-PATTERNS

- Do not hand-edit `dist/index.cjs` or let its exported behavior drift from source.
- Do not discard `safeParse` errors after a failed boundary validation.
- Do not repeatedly parse already-validated internal data to mask unclear ownership.
- Do not present every internal validator as a published REST contract.

Parent: [../AGENTS.md](../AGENTS.md)
