# PROJECT KNOWLEDGE BASE

**Generated:** 2026-10-14
**Commit:** `493d44f6`
**Branch:** `master`

## OVERVIEW

Cloudflare-native resume monorepo: one Worker serves portfolio and in-process dashboard,
with Cron Triggers, six Workflows, `BrowserSessionDO`, queues, KV, D1, and Browser Rendering.
D1 `content_files` is the content source of truth under ADR 0011
(`docs/adr/0011-content-pack-in-d1.md`); the working tree holds gitignored materialized copies.
See `docs/guides/CONTENT_PACK.md` for the content-pack workflow.

## STRUCTURE

```text
./
├── apps/                 # portfolio edge entry + dashboard runtime
├── packages/             # nine-workspace build's shared package boundaries
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
| Content ownership          | `packages/data/AGENTS.md`, `applications/AGENTS.md`                           | Canonical data, role variants, packets        |
| Content transport          | `tools/scripts/content/AGENTS.md`                                             | Manifest, D1 materialization, fixtures        |
| Package boundaries         | `packages/AGENTS.md`                                                          | Types, schemas, contracts, shared exports     |
| Operations and rendering   | `tools/AGENTS.md`, `tools/scripts/AGENTS.md`, `tools/scripts/build/AGENTS.md` | Execution roots and document generation       |
| Tests and browser fixtures | `tests/AGENTS.md`, `tests/e2e/fixtures/AGENTS.md`                             | Runner ownership and mock/external selection  |
| CI and documentation       | `.github/AGENTS.md`, `docs/AGENTS.md`                                         | Validation pipeline and document authority    |
| Infrastructure and secrets | `infrastructure/AGENTS.md`, `tools/scripts/onepassword/AGENTS.md`             | Resources, observability, credential flows    |
| Presentations and licenses | `ta/AGENTS.md`, `third_party/AGENTS.md`                                       | Materialized presentations and review records |

## CODE MAP

Runtime rows through `ApplicationWorkflow`: LSP references, including declarations, imports,
type uses and visible tests; not runtime callers or repo-wide textual hits.
Remaining rows: literal matching lines / files in tracked JS/CJS/MJS under `tools/` and `tests/`,
including definitions and tests; LSP confirmed definitions, not repo-wide reference counts.

| Symbol                       | Type           | Location                                                | Refs   | Role                                                                       |
| ---------------------------- | -------------- | ------------------------------------------------------- | ------ | -------------------------------------------------------------------------- |
| `jsonResponse`               | function       | `apps/job-dashboard/src/middleware/cors.js:70`          | 74     | HTTP responses                                                             |
| `validateEnv`                | function       | `packages/env/src/parse.js:40`                          | 4      | Environment parsing; separate `validateEnv` in `apps/portfolio/lib/env.js` |
| `AppError`                   | class          | `packages/shared/src/errors/index.js:44`                | 13     | Typed errors                                                               |
| `withBrowserSession`         | function       | `apps/job-dashboard/src/services/browser-session.js:40` | 43     | Browser borrowing                                                          |
| `runWorkerBuild`             | function       | `apps/portfolio/lib/build-orchestrator.js:130`          | 2      | Worker generation                                                          |
| `ApplicationWorkflow`        | class          | `apps/job-dashboard/src/workflows/application.js:79`    | 11     | Application orchestration                                                  |
| `loadPack`                   | async function | `tools/scripts/content/pack.mjs:40`                     | 19 / 9 | Pack definition                                                            |
| `runSync`                    | function       | `tools/scripts/utils/resume-sync-runner.js:124`         | 16 / 7 | Locale generation                                                          |
| `generateWebData`            | function       | `tools/scripts/utils/resume-web-data-generator.js:99`   | 44 / 5 | Public projections                                                         |
| `ownerIdentity`              | function       | `tests/helpers/owner-data.js:50`                        | 18 / 8 | Materialized expectations                                                  |
| `createDashboardEnvironment` | async function | `tests/e2e/fixtures/dashboard-environment.cjs:41`       | 14 / 7 | Mock/external selection                                                    |

## CONVENTIONS

- Nine npm workspaces orchestrate builds; Node requires `>=22`. Workspace dependencies use `*`, not `file:../..`.
- `npm run build`: content ensure -> `sync:data` -> `build:worker`.
- GitHub CI uses `CONTENT_SOURCE=fixtures`; Workers Builds uses `WORKERS_CI=1`, refuses fixtures and pulls D1 fail-closed.
- `wrangler.jsonc` composes `apps/portfolio/entry.js`, assets, JOB_DB, three KV bindings, Browser Rendering, AI, one Durable Object, six Workflows and two queue consumers.
- The portfolio entry forwards dashboard HTTP, queue and cron events; MCP stays in-process with REST submission gates.
- Workers Builds owns production deployments; root `npm run deploy` deliberately fails. Production sync and scheduled automation remain Cloudflare-native.
- `tsconfig.base.json` owns NodeNext aliases and `checkJs:false`; `tsconfig.strict.json` enables checking on an explicit allowlist.
- ESLint forbids cross-app imports except the composed dashboard entry.
- Domain types belong in `@resume/types`, boundary validation in `@resume/schemas`, published contracts in `@resume/contracts`.
- The content-pack manifest controls materialization, fixtures and guards; local ensure requires a manifest. Master, role variants and packets retain separate ownership.

## ANTI-PATTERNS

- Never hand-edit generated Worker bundles, derived content, dashboards, run artifacts or fixtures; regenerate from source.
- Never commit personal content, application PDFs, credentials, cookies or session material; never hardcode resource identifiers.
- Never bypass security, approval, disabled-platform or historical-company gates; avoid duplicate application side effects.
- Never substitute fixtures for D1 content or treat build, proposal, release or stub success as proof of production behavior.
- Never suppress type errors with `as any`, `@ts-ignore` or broad unchecked casts.
- Keep source files within the 200-LOC limit; `lint:loc` excludes blank/comment lines, multiline literal bodies, tests and generated bundles.
- Never include concrete performance metrics in resume or portfolio text: no percentages, ratios or absolute metrics.

## UNIQUE STYLES

- Child guides own domain detail; add guidance for distinct boundaries, not directory size.
- Most runtime code is ESM JS/JSDoc; portfolio build modules are CommonJS.
- Operations are Go-first; Node bootstrap/validators and JS generators are documented exceptions. Module roots: scripts Go 1.25.0, enrichment Go 1.22, moduleless `tools/ci`.
- `@resume/shared` is subpath-only. Its `crypto` export includes encryption, decryption, WebCrypto aliases and constants; `session` includes constants, cookies and normalization. Explicit narrower subpaths remain available.
- Minimal resume Zod schemas validate API slices, not the full-master JSON Schema contract.
- Prettier uses width 100, two spaces, single quotes, semicolons and LF.

## COMMANDS

```bash
npm run automate:ssot       # PDF sync, build, typecheck
npm run automate:full       # adds PPTX, lint, tests, native check
npm run build
npm run content:pull        # D1 materialization; credentials required
npm run content:push        # upload edited content pack
node tools/scripts/content/make-fixtures.mjs
npm run content:guard -- --tracked
npm run lint
npm run lint:agents
npm run lint:loc
npm run lint:naming
npm run typecheck
npm run typecheck:strict
npm test                   # Jest, five Node groups, Python, explicit Go targets
npm run test:e2e           # separate Playwright suite
npm run verify:production
npm run sync:data
npm run verify:architecture-hardening:core
npm run deploy:wrangler:root:dry-run
npm run foreign-apply:dry-run -- --ats-stub
npm run security:audit
gitleaks detect --source . --config .gitleaks.toml --redact
go run ./tools/ci/validate-cloudflare-native.go
```

## NOTES

- CI has one read-only validation job: SHA-pinned actions, Node 22, Python 3.12, the scripts module's Go version, pre-install content guard, explicit test lanes and Wrangler dry-run. No Playwright or deployment step.
- Daily/hourly crons belong to the root runtime configuration; preview has neither routes nor crons.
- Terraform has no apply workflow; legacy uploads are not runtime binding authority.
- Workers Logs is default; Loki is opt-in; Elasticsearch is absent. Compose uses Jaeger; Tempo is a reference configuration.
- Historical documentation may retain stale topology/CI claims; current configuration takes precedence.
- `lint:agents` may print defects without failing; inspect diagnostics. `security:audit` checks vulnerabilities, not licenses; the Wrangler secrets classifier is not a CI step.
- External branch rules are not established by `ci.yml`; infrastructure mocks remain reference-only with undeclared `better-sqlite3`.
