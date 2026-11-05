# PROJECT KNOWLEDGE BASE

**Generated:** 2026-11-05
**Commit:** `2dfb061d`
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

| Task                       | Location                                                                      | Notes                                         |
| -------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------- |
| Edge and dashboard runtime | `apps/portfolio/AGENTS.md`, `apps/job-dashboard/AGENTS.md`                    | Entry composition and runtime domains         |
| MCP protocol               | `apps/job-dashboard/src/mcp/AGENTS.md`                                        | In-process transport and REST gates           |
| Queue consumers            | `apps/job-dashboard/src/queues/AGENTS.md`                                     | Batch routing, processing, DLQ                |
| Workflow orchestration     | `apps/job-dashboard/src/workflows/AGENTS.md`                                  | Workflow gates and terminal outcomes          |
| Content ownership          | `packages/data/AGENTS.md`, `applications/AGENTS.md`                           | Materialized inputs, role variants, packets   |
| Content transport          | `tools/scripts/content/AGENTS.md`                                             | Manifest, D1 materialization, fixtures        |
| Package boundaries         | `packages/AGENTS.md`                                                          | Types, schemas, contracts, shared exports     |
| Operations and rendering   | `tools/AGENTS.md`, `tools/scripts/AGENTS.md`, `tools/scripts/build/AGENTS.md` | Execution roots and document generation       |
| Tests and browser fixtures | `tests/AGENTS.md`, `tests/e2e/fixtures/AGENTS.md`                             | Runner ownership and mock/external selection  |
| CI and documentation       | `.github/AGENTS.md`, `docs/AGENTS.md`                                         | Validation pipeline and document authority    |
| Infrastructure and secrets | `infrastructure/AGENTS.md`, `tools/scripts/onepassword/AGENTS.md`             | Resources, observability, credential flows    |
| Presentations and licenses | `ta/AGENTS.md`, `third_party/AGENTS.md`                                       | Materialized presentations and review records |

## CODE MAP

Definitions were source-checked at HEAD by the subtree writers. Reference centrality is
unmeasured; no counts are claimed.

| Symbol                       | Type           | Location                                                | Refs       | Role                                    |
| ---------------------------- | -------------- | ------------------------------------------------------- | ---------- | --------------------------------------- |
| `jsonResponse`               | function       | `apps/job-dashboard/src/middleware/cors.js:70`          | unmeasured | HTTP responses                          |
| `validateEnv`                | function       | `packages/env/src/parse.js:40`                          | unmeasured | Environment parsing                     |
| `AppError`                   | class          | `packages/shared/src/errors/index.js:44`                | unmeasured | Typed errors                            |
| `withBrowserSession`         | async function | `apps/job-dashboard/src/services/browser-session.js:40` | unmeasured | Browser session acquisition and release |
| `runWorkerBuild`             | async function | `apps/portfolio/lib/build-orchestrator.js:131`          | unmeasured | Worker generation                       |
| `ApplicationWorkflow`        | class          | `apps/job-dashboard/src/workflows/application.js:79`    | unmeasured | Application orchestration               |
| `routeQueueBatch`            | function       | `apps/job-dashboard/src/queues/queue-consumer.js:61`    | unmeasured | Queue batch dispatch; unknown throws    |
| `handleMcpRequest`           | function       | `apps/job-dashboard/src/mcp/handler.js:20`              | unmeasured | Stateless MCP entry                     |
| `loadPack`                   | async function | `tools/scripts/content/pack.mjs:40`                     | unmeasured | Pack definition                         |
| `runSync`                    | function       | `tools/scripts/utils/resume-sync-runner.js:124`         | unmeasured | Locale generation                       |
| `generateWebData`            | function       | `tools/scripts/utils/resume-web-data-generator.js:99`   | unmeasured | Public projections                      |
| `ownerIdentity`              | function       | `tests/helpers/owner-data.js:50`                        | unmeasured | Materialized expectations               |
| `createDashboardEnvironment` | async function | `tests/e2e/fixtures/dashboard-environment.cjs:41`       | unmeasured | Browser environment selection           |

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

## ANTI-PATTERNS

- Never hand-edit generated Worker bundles, derived content, dashboards, run artifacts or fixtures; regenerate from source.
- Never commit personal content, application PDFs, credentials, cookies or session material; never hardcode resource identifiers.
- Never bypass security, approval, disabled-platform or historical-company gates; avoid duplicate application side effects.
- Never substitute fixtures for D1 content or treat build, proposal, release or stub success as proof of production behavior.
- Never suppress type errors with `as any`, `@ts-ignore` or broad unchecked casts.
- Keep source files within the 200 code-LOC limit.
- Never include concrete performance metrics in resume or portfolio text: no percentages, ratios or absolute metrics.

## UNIQUE STYLES

- Child guides own domain detail; add guidance for distinct boundaries, not directory size.
- Most runtime code is ESM JS/JSDoc; portfolio build modules are CommonJS.
- Operations are Go-first; Node bootstrap/validators and JS generators are documented exceptions. The scripts module uses Go 1.25.0; enrichment uses Go 1.22; `tools/ci` holds standalone checks.
- `@resume/shared` is subpath-only; its crypto exports include WebCrypto encryption/decryption aliases.
- Minimal resume Zod schemas validate API slices, not the full-master JSON Schema contract.
- Prettier uses width 100, two spaces, single quotes, semicolons and LF.

## COMMANDS

```bash
npm run dev
npm run build              # content ensure -> sync:data -> build:worker
npm run sync:data
npm run lint
npm run lint:agents
npm run lint:loc
npm run lint:naming
npm run typecheck
npm run typecheck:strict
npm test                   # Jest, dashboard, schemas, shared, tools, CLI, Python, Go
npm run test:e2e           # separate Playwright suite
npm run validate:openapi
npm run foreign-apply:dry-run -- --ats-stub
```

## NOTES

- CI has one read-only Validate job: SHA-pinned actions, Node 22, Python 3.12, module Go, pre-install content guard, checksum-verified gitleaks/actionlint, explicit tests, architecture checks and Wrangler dry-run. No E2E or deployment step.
- Preview has neither routes nor crons; root runtime configuration owns scheduled events.
- Terraform D1/KV declarations are data sources; the legacy Worker declaration is not runtime binding authority.
- Workers Logs is default; Loki is opt-in; Elasticsearch is absent. Compose uses Jaeger; Tempo is a reference configuration.
- Historical documentation may retain stale topology/CI claims; current configuration takes precedence. `verify:architecture-governance` checks ADRs plus the set declared in `tools/scripts/verification/architecture-docs-current-state.mjs`, not the whole archive.
- `lint:agents` may print defects without failing; inspect diagnostics. The Wrangler secrets classifier echoes matched source lines.
- Repository templates specify Conventional Commit PR titles and prefixed branches; external branch protection and required checks remain unverified.
- `test:jest` discovers `tests/unit` and `tests/integration` `*.test.js`; `*.spec.js` is Playwright only. `test:go` does not cover deployment/deploy, monitoring or verify-deployment helpers.
- Source inspection is not production verification; live Cloudflare behavior remains unverified.
