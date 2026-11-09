# Dashboard Development Guide

This guide describes the dashboard as part of the repository workspace. The
dashboard is imported by the portfolio Worker and does not have a separate
development, build, or test command.

## Table of Contents

- [Prerequisites and setup](#prerequisites-and-setup)
- [Run the merged Worker](#run-the-merged-worker)
- [Checks](#checks)
- [Source map](#source-map)
- [Changing the API](#changing-the-api)
- [Database changes](#database-changes)
- [Workflow changes](#workflow-changes)
- [CI and deployment ownership](#ci-and-deployment-ownership)
- [Related references](#related-references)

## Prerequisites and setup

Use Node.js 22 or later and npm from the repository root:

```bash
npm install
```

Dependencies are managed by the root npm workspace. Do not install or run
Wrangler from `apps/job-dashboard/`; the root configuration owns the merged
Worker.

## Run the merged Worker

Start local development from the repository root:

```bash
npm run dev
```

This runs Wrangler against the root `wrangler.jsonc` in local mode on port 8787.
The portfolio is served at `http://localhost:8787/`; dashboard requests use
`http://localhost:8787/job/`, for example
`http://localhost:8787/job/health`.

## Checks

Run the checks from the repository root:

| Command                    | Scope                                  |
| -------------------------- | -------------------------------------- |
| `npm run test:dashboard`   | Colocated dashboard Node tests         |
| `npm run test:jest`        | Root Jest unit and integration suites  |
| `npm run validate:openapi` | Canonical REST contract                |
| `npm run test:e2e`         | Separate Playwright suite, when needed |

The GitHub workflow currently has one read-only `Validate` job. It runs the
explicit workspace tests and does not run Playwright E2E or deploy the Worker.

## Source map

| Concern                               | Current owner                                                                                          |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Worker composition and request policy | [`src/index.js`](./src/index.js)                                                                       |
| Route registration                    | [`src/routes/`](./src/routes/)                                                                         |
| Authentication and CSRF               | [`src/services/auth.js`](./src/services/auth.js), [`src/middleware/csrf.js`](./src/middleware/csrf.js) |
| Request handlers                      | [`src/handlers/`](./src/handlers/)                                                                     |
| Workflow classes                      | [`src/workflows/`](./src/workflows/)                                                                   |
| Queue and scheduled events            | [`src/queues/`](./src/queues/), [`src/handlers/scheduled/`](./src/handlers/scheduled/)                 |
| Bindings and Worker entry             | [`../../wrangler.jsonc`](../../wrangler.jsonc), [`../portfolio/entry.js`](../portfolio/entry.js)       |

The portfolio entry imports the dashboard module in-process. The dashboard
normalizes the `/job` prefix, applies request policy, and dispatches through the
route registrars.

## Changing the API

Add or update routes in the owning module under `src/routes/`, then update the
published contract in [`../../packages/contracts/openapi.yaml`](../../packages/contracts/openapi.yaml)
when the route is part of the REST API. Keep authentication, CSRF, and request
validation consistent with the shared request path in `src/index.js`.

The [API reference](./API_REFERENCE.md) is an orientation page; OpenAPI owns
operation paths, schemas, and security requirements.

## Database changes

Add sequential migrations under [`migrations/`](./migrations/). Preserve the
baseline, mirror schema-changing migrations in [`schema.sql`](./schema.sql),
and keep the migration replay and SQL contract suites green:

```bash
npm run test:jest -- tests/unit/job-dashboard/migration-lineage.test.js
npm run test:jest -- tests/unit/job-dashboard/d1-schema-contract.test.js
```

The dashboard `AGENTS.md` explains the baseline and migration conventions.
Migration execution and remote database operations are not part of this
development guide.

## Workflow changes

Workflow classes are exported from `src/workflows/index.js` and registered by
the root [`wrangler.jsonc`](../../wrangler.jsonc), through
[`../portfolio/entry.js`](../portfolio/entry.js). Keep class exports, configured
bindings, and event payload producers and consumers aligned.

## CI and deployment ownership

GitHub Actions runs repository validation only. Production Worker builds and
deployments are owned by Cloudflare Workers Builds; use the root configuration
and deployment guidance rather than a dashboard-local Wrangler command. The
root and dashboard standalone deploy scripts are intentionally disabled.

## Related references

- [Dashboard README](./README.md)
- [Architecture diagrams](./DIAGRAMS.md)
- [Canonical API contract](../../packages/contracts/openapi.yaml)
- [Dashboard ownership and commands](./AGENTS.md)
- [Root development and validation scripts](../../package.json)
