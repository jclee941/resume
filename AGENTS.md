# PROJECT KNOWLEDGE BASE

**Generated:** 2026-10-11
**Commit:** `28de5bcd`
**Branch:** `master`

## OVERVIEW

Cloudflare-native resume monorepo: one Worker serves portfolio and in-process
dashboard, with Cron Triggers, six Workflows, `BrowserSessionDO`, queues, KV, D1, and Browser Rendering.
Personal content belongs to D1 `content_files` (SSoT, ADR 0011); the working tree
holds a gitignored materialized copy. See `docs/guides/CONTENT_PACK.md`.

## STRUCTURE

```text
./
├── apps/                 # portfolio edge entry + job-dashboard runtime
├── packages/             # cli, data, env, shared, types, schemas, contracts
├── applications/         # materialized application packets and run outputs
├── tools/                # Go operations, JS validators, PDF/PPTX generators
├── tests/                # Jest, Node, Playwright; app suites also colocated
├── infrastructure/       # Cloudflare resources and observability configuration
├── docs/                 # current contracts alongside historical records
├── ta/                   # materialized presentations; only guidance is tracked
├── third_party/          # license coordination and historical Bazel proposals
├── wrangler.jsonc        # sole runtime configuration
└── package.json          # npm workspace command hub
```

## WHERE TO LOOK

| Task                           | Location                                                                      | Notes                                                                               |
| ------------------------------ | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Edge routing and build         | `apps/portfolio/AGENTS.md`                                                    | Source entry, browser assets, build/runtime split                                   |
| Dashboard, MCP, automation     | `apps/job-dashboard/AGENTS.md`                                                | Child guides cover handlers, queues, workflows, services                            |
| MCP protocol and tools         | `apps/job-dashboard/src/mcp/AGENTS.md`                                        | Stateless HTTP guards, REST-backed operations, D1 content reads                     |
| Canonical and tailored content | `packages/data/AGENTS.md`, `applications/AGENTS.md`                           | Master locale JSON is canonical; role variants have an independent minimum contract |
| Content transport and guards   | `tools/scripts/content/AGENTS.md`                                             | Manifest, D1 pull/push/ensure, generated fixtures                                   |
| Package boundaries             | `packages/AGENTS.md`                                                          | Types, schemas, contracts, env, shared exports, CLI                                 |
| Operations and rendering       | `tools/AGENTS.md`, `tools/scripts/AGENTS.md`, `tools/scripts/build/AGENTS.md` | Go module roots; Pandoc/XeLaTeX PDFs and Python PPTX                                |
| Tests and browser fixtures     | `tests/AGENTS.md`, `tests/e2e/fixtures/AGENTS.md`                             | Runner ownership and mock/external dashboard selection                              |
| CI and architecture            | `.github/AGENTS.md`, `docs/AGENTS.md`                                         | Validation-only CI, current contracts versus history                                |
| Infrastructure and secrets     | `infrastructure/AGENTS.md`, `tools/scripts/onepassword/AGENTS.md`             | Resource ownership, observability, credential flows                                 |
| Presentations and licenses     | `ta/AGENTS.md`, `third_party/AGENTS.md`                                       | Materialized presentations; historical Bazel proposals are not build authority      |

## CODE MAP

Refs are textual matching lines / files, not semantic caller counts; tests count.
Runtime counts cover tracked JS/CJS/MJS, including declarations, excluding schemas `dist`.
Operations counts cover all tracked files, including definitions, docs, dist, and tests;
counts are the digests' snapshot before guide edits.

| Symbol                       | Type           | Location                                                | Refs     | Role                                              |
| ---------------------------- | -------------- | ------------------------------------------------------- | -------- | ------------------------------------------------- |
| `jsonResponse`               | function       | `apps/job-dashboard/src/middleware/cors.js:70`          | 172 / 39 | Dashboard responses                               |
| `validateEnv`                | function       | `packages/env/src/parse.js:40`                          | 38 / 8   | Environment parser; portfolio also uses this name |
| `AppError`                   | class          | `packages/shared/src/errors/index.js:44`                | 54 / 5   | Typed error base                                  |
| `withBrowserSession`         | function       | `apps/job-dashboard/src/services/browser-session.js:40` | 132 / 18 | Borrow/release Browser Rendering sessions         |
| `runWorkerBuild`             | function       | `apps/portfolio/lib/build-orchestrator.js:130`          | 26 / 3   | Worker build orchestration                        |
| `ApplicationWorkflow`        | class          | `apps/job-dashboard/src/workflows/application.js:79`    | 22 / 13  | Application orchestration                         |
| `loadPack`                   | async function | `tools/scripts/content/pack.mjs:40`                     | 20 / 10  | Shared pack definition                            |
| `runSync`                    | function       | `tools/scripts/utils/resume-sync-runner.js:124`         | 17 / 8   | Three-locale validation and generation            |
| `generateWebData`            | function       | `tools/scripts/utils/resume-web-data-generator.js:99`   | 44 / 5   | Portfolio projections                             |
| `ownerIdentity`              | function       | `tests/helpers/owner-data.js:50`                        | 19 / 9   | Materialized test identity                        |
| `createDashboardEnvironment` | async function | `tests/e2e/fixtures/dashboard-environment.cjs:41`       | 15 / 8   | Mock/external dashboard selection                 |

## CONVENTIONS

- Nine npm workspaces alone orchestrate builds (Bazel removed, ADR 0008); workspace dependencies use `*`, never `file:../..`.
- Node requires `>=22`; ESLint blocks unsanctioned cross-app imports.
- `npm run build` ensures content, syncs SSoT, then generates the portfolio Worker.
- GitHub CI uses `CONTENT_SOURCE=fixtures`; Workers Builds uses `WORKERS_CI=1`, refusing fixtures and pulling D1 fail-closed.
- `tools/scripts/content/content-pack.json` drives pack membership, ignore rules, guards, and D1 sync; local ensure requires a materialization manifest and fixture ensure guards unpushed edits.
- Dashboard HTTP, queue, and scheduled events enter through `apps/portfolio/entry.js` (ADR 0009); `/job/mcp` maps to `/mcp`, retaining REST submission gates.
- MCP uses stateless Streamable HTTP, admin Bearer and Host/Origin validation; no cookie authentication or CORS.
- Public `/` is Korean; `/en/` and `/ja/` are explicit routes, not language redirects.
- Cloudflare Workers Builds owns production deploys; local Wrangler is verification or emergency only. Root `npm run deploy` intentionally fails.
- Shared TS flags/aliases live in `tsconfig.base.json`; root `checkJs` is off and `tsconfig.strict.json` ratchets an explicit JS allowlist.
- Entry points only compose/register; handlers → services → repositories → clients, with external access behind adapters.
- Secrets use Cloudflare Workers Secrets or 1Password flows; never commit `.env*`, session JSON, cookies, or API tokens.
- Operations are Go-first; JS-domain generators and deterministic validators are child-guide exceptions.
- Define each domain type once in dependency-free `@resume/types`, validate in `@resume/schemas`, publish contracts in `@resume/contracts`.

## ANTI-PATTERNS

- Never hand-edit generated artifacts: `apps/portfolio/worker.js`, derived resume/application outputs, dashboards, run artifacts, or fixtures; regenerate from source.
- Never commit pack paths or personal content, including application PDFs. CI runs `content guard --tracked`; pre-commit runs `content guard --staged`.
- Never hardcode credentials, resume IDs, Worker bindings, Cloudflare resource IDs, cookies, or session material.
- Never bypass CI, security, approval, disabled-platform, or company-history gates; avoid duplicate application side effects.
- Never nest Workflow `step.*` calls inside `step.do` or fall back from D1 to fixtures.
- Never require Playwright `networkidle` for portfolio pages; use `domcontentloaded` or explicit waits.
- Never suppress type errors with `as any`, `@ts-ignore`, or broad unchecked casts.
- Never exceed the 200-LOC source-file limit without splitting.
- Never include concrete performance metrics in resume or portfolio text: no percentages, ratios, or absolute metrics.

## UNIQUE STYLES

- Child guides own domain detail; add guidance for distinct boundaries, not directory size.
- Docs separate ADRs, architecture, conventions, guides, and security; historical docs are not current contracts.
- `@resume/shared` is subpath-only: use `browser/service`, `crypto/webcrypto`, `auth/hmac`, and explicit platform subpaths; `crypto` exposes constants.
- `@resume/contracts/src/env.js` exports `ENV_TYPE_MARKER`, not `Env`; binding typedefs live in `@resume/types/env`.
- `packages/schemas/dist/index.cjs` is a tracked generated exception; rebuild via `npm run build:cjs --workspace=@resume/schemas`. ESM uses source.
- Workers Logs is default; Loki is opt-in, Elasticsearch absent. Compose declares Jaeger; Tempo is a separate configuration reference, not the active Compose backend.
- Most runtime code is ESM JS/JSDoc; portfolio build modules are CommonJS. Scripts use Go 1.25.0, enrichment Go 1.22; moduleless `tools/ci` tests use `GO111MODULE=off`.

## COMMANDS

```bash
npm run automate:ssot       # PDF sync, build, typecheck
npm run automate:full       # adds PPTX, lint, tests, Cloudflare-native check
npm run build              # content ensure, data sync, Worker generation
npm run content:pull       # D1 materialization; credentials required
npm run content:push       # upload edited content pack
node tools/scripts/content/make-fixtures.mjs
npm run lint
npm run lint:agents
npm run lint:loc
npm run lint:naming
npm run typecheck
npm run typecheck:strict
npm test                   # Jest, Node, Python, explicit Go targets
npm run test:e2e           # separate Playwright suite
npm run verify:production
npm run sync:data
npm run verify:architecture-hardening:core
npm run content:guard -- --tracked
npm run deploy:wrangler:root:dry-run
go run ./tools/ci/validate-cloudflare-native.go
gitleaks detect --source . --config .gitleaks.toml --redact
```

## NOTES

- Sync capabilities cover Wanted, JobKorea, SK Careers, Remember (Browser Rendering REST); Saramin is disabled. Capability does not prove auto-apply is enabled.
- Daily cron refreshes only Wanted sessions. JobKorea login is browser-local: history logs in before fetching; profile/workflow inject `mintJobKoreaSession`; never replay `auth:jobkorea` in another borrowed browser.
- Migrations retain `0001_init.sql`; `0008` is a one-time timestamp correction, not repeatable DDL.
- `npm test` chains Jest, five Node groups, Python, and explicit Go targets. Playwright is separate, absent from CI; only `mobile.spec.js` matches mobile projects.
- CI validates with Node 22, Python 3.12, the scripts module's Go version, fixtures, pre-install content guard, and final Wrangler dry-run; Actions are SHA-pinned.
- Terraform has no apply workflow; legacy upload/data sources are not runtime binding authority. Build, proposal, and release success do not prove production state.
- `lint:agents` may print content defects without a failing exit status; inspect diagnostics as well as the exit code.
- `affected` and env-drift are not mandatory CI steps; release CLIs have no automated prepare/archive workflow.
