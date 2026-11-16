# PROJECT KNOWLEDGE BASE

**Generated:** 2026-11-16
**Commit:** `ebccda00`
**Branch:** `master`

## OVERVIEW

Cloudflare-native resume monorepo: one Worker serves the portfolio and in-process dashboard,
with scheduled events, Workflows, a Durable Object, queues, KV, D1 and Browser Rendering.
D1 `content_files` owns content under ADR 0011; local personal content is materialized, not tracked.

## STRUCTURE

```text
./
├── apps/                 # portfolio edge entry + dashboard runtime
├── packages/             # shared contracts, validation, environment and data boundaries
├── applications/         # materialized application packets and run outputs
├── tools/                # Go operations, JS validators, PDF/PPTX generators
├── tests/                # Jest, Node, Playwright; app suites also colocated
├── infrastructure/       # resources and observability configuration
├── docs/                 # current contracts alongside historical records
├── ta/                   # materialized presentations; only guidance is tracked
├── third_party/          # license-review records and historical proposals
├── wrangler.jsonc        # sole runtime configuration
└── package.json          # npm workspace command hub
```

## WHERE TO LOOK

| Task                         | Location                                                                                                        | Notes                                                                          |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Portfolio edge and build     | `apps/portfolio/AGENTS.md`, `apps/portfolio/lib/AGENTS.md`, `apps/portfolio/src/AGENTS.md`                      | Entry, CJS build transforms, browser modules                                   |
| Dashboard composition        | `apps/job-dashboard/AGENTS.md`, `apps/job-dashboard/src/AGENTS.md`                                              | Package, D1 migrations, HTTP/queue/cron policy                                 |
| Dashboard requests           | `apps/job-dashboard/src/handlers/AGENTS.md`, `apps/job-dashboard/src/routes/AGENTS.md`                          | Adapters, auto-apply gates, route registrars                                   |
| Dashboard HTTP edge and UI   | `apps/job-dashboard/src/middleware/AGENTS.md`, `apps/job-dashboard/src/views/AGENTS.md`                         | CORS/CSRF, `jsonResponse`, template UI, CSP                                    |
| MCP and queues               | `apps/job-dashboard/src/mcp/AGENTS.md`, `apps/job-dashboard/src/queues/AGENTS.md`                               | Stateless MCP guard; batch routing, DLQ                                        |
| Integrations and workflows   | `apps/job-dashboard/src/services/AGENTS.md`, `apps/job-dashboard/src/workflows/AGENTS.md`                       | Sessions, sync, job collectors; Workflow gates                                 |
| Package boundaries           | `packages/AGENTS.md`, `packages/types/AGENTS.md`, `packages/schemas/AGENTS.md`                                  | Typedefs, Zod validators, tracked CJS                                          |
| Contracts and environment    | `packages/contracts/AGENTS.md`, `packages/env/AGENTS.md`                                                        | Canonical OpenAPI, Zod env parsing                                             |
| Shared runtime and CLI       | `packages/shared/AGENTS.md`, `packages/cli/AGENTS.md`                                                           | Subpath helpers, `resume-cli` deploy/verify                                    |
| Content data                 | `packages/data/AGENTS.md`, `packages/data/resumes/AGENTS.md`, `packages/data/resumes/applications/AGENTS.md`    | Schema, canonical vs tailored, variants; technical evidence guide nested below |
| Packets, slides, licenses    | `applications/AGENTS.md`, `ta/AGENTS.md`, `third_party/AGENTS.md`                                               | Materialized outputs and review records                                        |
| Content transport            | `tools/scripts/content/AGENTS.md`                                                                               | Manifest, D1 materialization, fixtures, guard                                  |
| Operations roots             | `tools/AGENTS.md`, `tools/ci/AGENTS.md`, `tools/scripts/AGENTS.md`                                              | Go module layout, standalone CI checks                                         |
| Rendering and generators     | `tools/scripts/build/AGENTS.md`, `tools/scripts/utils/AGENTS.md`, `tools/scripts/enrichment/AGENTS.md`          | PDF/PPTX, locale sync, web data, enrichment                                    |
| Release and verification     | `tools/scripts/release/AGENTS.md`, `tools/scripts/deployment/AGENTS.md`, `tools/scripts/verification/AGENTS.md` | Versioning, publish, governance checks                                         |
| Secrets and security         | `tools/scripts/onepassword/AGENTS.md`, `tools/scripts/security/AGENTS.md`, `infrastructure/AGENTS.md`           | Credential flows, guards, resources                                            |
| Cloudflare and observability | `infrastructure/cloudflare/AGENTS.md`, `infrastructure/monitoring/AGENTS.md`                                    | Terraform data sources, Compose stack                                          |
| Tests                        | `tests/AGENTS.md`, `tests/unit/AGENTS.md`, `tests/integration/AGENTS.md`                                        | Runner ownership, fake-dom harness                                             |
| Browser tests                | `tests/e2e/AGENTS.md`, `tests/e2e/fixtures/AGENTS.md`                                                           | Playwright, mock/external selection                                            |
| CI and documentation         | `.github/AGENTS.md`, `docs/AGENTS.md`                                                                           | Validation pipeline and document authority                                     |

## CODE MAP

Definitions were source-checked at HEAD by the subtree writers. Reference centrality is
unmeasured; no counts are claimed.

| Symbol                       | Type           | Location                                                           | Refs       | Role                                    |
| ---------------------------- | -------------- | ------------------------------------------------------------------ | ---------- | --------------------------------------- |
| `jsonResponse`               | function       | `apps/job-dashboard/src/middleware/cors.js:70`                     | unmeasured | HTTP responses                          |
| `validateEnv`                | function       | `packages/env/src/parse.js:40`                                     | unmeasured | Environment parsing                     |
| `AppError`                   | class          | `packages/shared/src/errors/index.js:44`                           | unmeasured | Typed errors                            |
| `TokenBucketRateLimiter`     | class          | `packages/shared/src/rate-limit/kv-token-bucket.js:58`             | unmeasured | Fail-closed KV rate limiting            |
| `withBrowserSession`         | async function | `apps/job-dashboard/src/services/browser-session.js:40`            | unmeasured | Browser session acquisition and release |
| `syncResumePlatform`         | async function | `apps/job-dashboard/src/services/resume-platform-sync/index.js:48` | unmeasured | Resume platform sync                    |
| `BIGTECH_COLLECTORS`         | const          | `apps/job-dashboard/src/services/bigtech-jobs/index.js:18`         | unmeasured | Job collector registry                  |
| `runWorkerBuild`             | async function | `apps/portfolio/lib/build-orchestrator.js:131`                     | unmeasured | Worker generation                       |
| `ApplicationWorkflow`        | class          | `apps/job-dashboard/src/workflows/application.js:80`               | unmeasured | Application orchestration               |
| `routeQueueBatch`            | function       | `apps/job-dashboard/src/queues/queue-consumer.js:61`               | unmeasured | Queue batch dispatch; unknown throws    |
| `handleMcpRequest`           | function       | `apps/job-dashboard/src/mcp/handler.js:20`                         | unmeasured | Stateless MCP entry                     |
| `loadPack`                   | async function | `tools/scripts/content/pack.mjs:40`                                | unmeasured | Pack definition                         |
| `guard`                      | async function | `tools/scripts/content/guard.mjs:128`                              | unmeasured | Personal-content guard                  |
| `runSync`                    | function       | `tools/scripts/utils/resume-sync-runner.js:124`                    | unmeasured | Locale generation                       |
| `generateWebData`            | function       | `tools/scripts/utils/resume-web-data-generator.js:98`              | unmeasured | Public projections                      |
| `ownerIdentity`              | function       | `tests/helpers/owner-data.js:50`                                   | unmeasured | Materialized expectations               |
| `createDashboardEnvironment` | async function | `tests/e2e/fixtures/dashboard-environment.cjs:41`                  | unmeasured | Browser environment selection           |

## CONVENTIONS

- Nine npm workspaces orchestrate builds; Node requires `>=22`. Workspace dependencies use `*`, not `file:../..`.
- `npm run build`: content ensure -> `sync:data` -> `build:worker`.
- GitHub CI uses `CONTENT_SOURCE=fixtures`; Workers Builds uses `WORKERS_CI=1`, refuses fixtures and pulls D1 fail-closed.
- `wrangler.jsonc` composes `apps/portfolio/entry.js`, assets, D1, three KV bindings, Browser Rendering, AI, one Durable Object, six Workflows and two queue consumers.
- The portfolio entry forwards dashboard HTTP, queue and cron events; MCP stays in-process with REST submission gates.
- Workers Builds owns production deployments; root and dashboard deploy scripts deliberately fail. Production sync and scheduled automation remain Cloudflare-native.
- `tsconfig.base.json` owns NodeNext aliases and `checkJs:false`; `tsconfig.strict.json` enables checking on an explicit allowlist.
- ESLint forbids cross-app imports except the portfolio entry importing dashboard `src/index.js`.
- Domain types belong in `@resume/types`, boundary validation in `@resume/schemas`, published contracts in `@resume/contracts`.
- The content-pack manifest controls materialization, fixtures and guards; local ensure requires a manifest. Master, role variants and packets retain separate ownership.
- Content CLI `content:{ensure,pull,push,status,manifest,guard}` runs `tools/scripts/content/cli.mjs`; CI runs `guard --tracked` before `npm ci`.

## ANTI-PATTERNS

- Never hand-edit generated Worker bundles, derived content, dashboards, run artifacts or fixtures; regenerate from source.
- Never commit personal content, application PDFs, credentials, cookies or session material; never hardcode resource identifiers.
- Never bypass security, approval, disabled-platform or historical-company gates; avoid duplicate application side effects.
- Never substitute fixtures for D1 content or treat build, proposal, release or stub success as proof of production behavior.
- Never suppress type errors with `as any`, `@ts-ignore` or broad unchecked casts.
- Keep source files within the 200 code-LOC limit.
- Never include concrete performance metrics in resume or portfolio text: no percentages, ratios or absolute metrics.
- Never put personal identifiers, contact data or applied-company names in AGENTS.md guides.
- Never `terraform apply` locally against production; never treat `affected` or env-drift checks as CI gates or add CI write permissions.
- Keep rate limiting fail-closed; never cache nonce-bearing HTML in `sw.js`.

## UNIQUE STYLES

- Child guides own domain detail; add guidance for distinct boundaries, not directory size.
- Most runtime code is ESM JS/JSDoc; portfolio build modules are CommonJS.
- Operations are Go-first; Node bootstrap/validators and JS generators are documented exceptions. The scripts module uses Go 1.25.0; enrichment uses Go 1.22; `tools/ci` holds standalone checks.
- `@resume/shared` is subpath-only; its crypto exports include WebCrypto encryption/decryption aliases.
- Minimal resume Zod schemas validate API slices, not the full-master JSON Schema contract.
- Prettier uses width 100, two spaces, single quotes, semicolons, ES5 trailing commas and LF.
- `@resume/schemas` tracks built CJS (`dist/index.cjs`); rebuild with `build:cjs`, never hand-edit.

## COMMANDS

```bash
npm run dev
npm run build              # content ensure -> sync:data -> build:worker
npm run sync:data
npm run lint
npm run lint:agents
npm run pr                 # push branch, open PR, enable squash auto-merge
npm run lint:loc
npm run lint:naming
npm run typecheck
npm run typecheck:strict
npm test                   # Jest, dashboard, schemas, shared, tools, CLI, Python, Go
npm run test:e2e           # separate Playwright suite
npm run validate:openapi
npm run verify:architecture-governance
npm run content:status
npm run build:cjs --workspace=@resume/schemas
npm run foreign-apply:dry-run -- --ats-stub
```

## NOTES

- CI has one read-only Validate job: SHA-pinned actions, Node 22, Python 3.12, module Go, pre-install content guard, checksum-verified gitleaks/actionlint, explicit tests, architecture checks and Wrangler dry-run. No E2E or deployment step.
- Preview has neither routes nor crons; root runtime configuration owns scheduled events.
- Terraform D1/KV declarations are data sources; the legacy Worker declaration is not runtime binding authority.
- Workers Logs is default; Loki is opt-in; Elasticsearch is absent. Compose runs Grafana, Prometheus, Loki, Alertmanager and Jaeger; Tempo is a reference configuration only.
- Historical documentation may retain stale topology/CI claims; current configuration takes precedence. `verify:architecture-governance` checks ADRs plus the set declared in `tools/scripts/verification/architecture-docs-current-state.mjs`, not the whole archive.
- `lint:agents` may print defects without failing; inspect diagnostics. The Wrangler secrets classifier echoes matched source lines.
- Repository templates specify Conventional Commit PR titles and prefixed branches; master is protected by the `master: PR + Validate` ruleset (see `.github/AGENTS.md`); changes land through PRs with squash auto-merge.
- `test:jest` discovers `tests/unit` and `tests/integration` `*.test.js`; `*.spec.js` is Playwright only. `test:go` does not cover `deploy/`, `deployment/`, `monitoring/`, `local-dev-up/`, `utils/auto-job-search` or the security guard.
- Source inspection is not production verification; live Cloudflare behavior remains unverified.
