# PROJECT KNOWLEDGE BASE

**Generated:** 2026-06-28 (verified 76f0a897)
**Branch:** `master`

## OVERVIEW

Resume monorepo: Cloudflare Worker portfolio, job automation runtimes, dashboard
APIs, shared type/schema/contract packages, content SSoT data, and self-hosted
automation/observability support.

## STRUCTURE

```text
./
├── apps/
│   ├── portfolio/        # public Cloudflare Worker; worker.js is generated
│   ├── job-server/       # MCP/job automation runtime, crawlers, scripts
│   └── job-dashboard/    # dashboard Worker, queues, workflows
├── packages/
│   ├── cli/              # resume operator CLI
│   ├── data/             # authoritative resume/application content
│   ├── env/              # runtime environment validation
│   ├── shared/           # cross-package utilities and clients
│   ├── types/            # canonical JSDoc/TS domain types
│   ├── schemas/          # Zod runtime schemas
│   └── contracts/        # OpenAPI and Worker env contracts
├── applications/         # per-role application packets and generated run logs
├── tools/                # CI/build/deploy/verification scripts
├── tests/                # Jest, Node, Playwright suites
├── infrastructure/       # Cloudflare, DB, monitoring, system automation
├── docs/                 # ADRs, architecture, conventions, guides, security
├── ta/                   # Python/PPTX TA profile generation
├── supabase/functions/   # Deno edge functions
├── third_party/          # npm-managed vendored material
└── package.json          # workspace root and command hub
```

## WHERE TO LOOK

| Task | Location | Notes |
| --- | --- | --- |
| Portfolio runtime/build | `apps/portfolio/` | edit `entry.js`, HTML, `src/`, or `lib/`; never hand-edit `worker.js` |
| Job automation | `apps/job-server/` | MCP server, crawlers, auto-apply, scripts, platform clients |
| Dashboard/API workflows | `apps/job-dashboard/` | Worker fetch/queue/scheduled entry, handlers, middleware, workflows |
| Resume/content SSoT | `packages/data/` | `resumes/master/resume_data.json` is authoritative resume data |
| Application packets | `applications/` | role-specific resumes, cover letters, previews, run outputs |
| Types and validation | `packages/types/`, `packages/schemas/` | define domain types once, validate with Zod schemas |
| Contracts | `packages/contracts/` | OpenAPI spec and Cloudflare Worker env contract surface |
| Shared utilities | `packages/shared/` | errors, logger, retry, crypto, rate-limit, auth, browser, clients |
| Operational scripts | `tools/scripts/` | Go-first build, sync, deploy, verification, security tooling |
| Tests | `tests/` | unit/integration/e2e child guides define test-layer rules |
| CI/release | `.github/workflows/` | validation and release jobs; production deploy authority is Cloudflare Workers Builds |
| Architecture rules | `docs/conventions/architecture-rules.md` | 200-LOC rule, naming, automation SSoT, script language policy |
| Secrets/security | `docs/security/`, `tools/scripts/onepassword/` | secret rotation and local 1Password/session migration |

## CODE MAP

| Symbol/File | Type | Location | Role |
| --- | --- | --- | --- |
| `package.json` | script hub | `./package.json` | root build/test/sync/deploy command surface |
| `fetch` worker entry | Worker | `apps/portfolio/entry.js` | hand-authored portfolio edge entry before generated bundle |
| `generate-worker.js` | build generator | `apps/portfolio/` | creates `apps/portfolio/worker.js` from HTML/data/lib modules |
| `main()` | MCP bootstrap | `apps/job-server/src/index.js` | job-server process entry and shutdown handling |
| server bootstrap | Node/Fastify | `apps/job-server/src/server/index.js` | dashboard/server-side job automation entry |
| `fetch`/`queue`/`scheduled` | Worker | `apps/job-dashboard/src/index.js` | dashboard request, queue, and scheduled orchestrator |
| `Router` | class | `apps/job-dashboard/src/router.js` | route matching and Worker request dispatch |
| `validateEnv()` | function | `packages/env/src/parse.js` | environment validation choke point |
| `AppError`/`HttpError` | classes | `packages/shared/src/errors/index.js` | shared typed error hierarchy |
| `resumeSchema` | Zod schema | `packages/schemas/src/resume.js` | runtime resume validation SSoT |
| `APPLICATION_STATUSES` | domain constant | `packages/types/src/application.js` | canonical application status values |
| `openapi.yaml` | contract | `packages/contracts/` | API contract source |

## CONVENTIONS

- npm workspaces are the only build orchestrator; Bazel was removed by ADR 0008.
- Workspace dependencies use `*`; do not reintroduce `file:../..` links.
- `npm run build` runs SSoT sync before portfolio worker generation.
- Cloudflare Workers Builds owns production deploy authority. Local Wrangler
  commands are verification or emergency tools, not the normal release path.
- TypeScript strict-mode flags live in `tsconfig.json`; JS support and aliases
  live in `tsconfig.base.json`.
- Job automation follows hexagonal boundaries: routes/tools/crawlers call shared
  services and clients, not each other ad hoc.
- Secrets come from Cloudflare Workers Secrets or 1Password-managed local flows;
  never commit `.env*`, session JSON, cookies, or API tokens.
- New operational scripts are Go unless a child guide explicitly allows another
  runtime.

## ANTI-PATTERNS

- Never edit generated artifacts directly: `apps/portfolio/worker.js`, derived
  resume/application outputs, generated dashboards, or run artifacts.
- Never hardcode credentials, resume IDs, worker bindings, Cloudflare resource
  IDs, cookies, or session material.
- Never bypass CI/security/verification gates to make a deploy or release look
  green.
- Never use `networkidle` as a required Playwright load state for portfolio
  pages; use `domcontentloaded` or explicit waits.
- Never add new logic under deprecated job-server wrapper modules; import from
  `apps/job-server/src/shared/` or `@resume/shared/*`.
- Never define the same domain type in multiple packages; put it in
  `@resume/types` and validate via `@resume/schemas`.
- Never suppress type errors with `as any`, `@ts-ignore`, or broad unchecked
  casts.
- Never exceed the project 200-LOC source-file limit without splitting.
- Never include concrete performance metrics in portfolio or resume text; keep
  claims factual and verifiable without percentages, ratios, or absolute metrics.

## UNIQUE STYLES

- Mixed runtime stack: Cloudflare Workers, Node automation, Go operational
  scripts, Deno Supabase functions, and selective Python/PPTX tooling.
- Deep child AGENTS files already govern hot paths; add new child files only for
  distinct domains, not just large directories.
- Docs are split by purpose: ADRs for decisions, architecture for system shape,
  conventions for rules, guides for procedures, security for secret handling.
- Type/validation/contract split is intentional: `@resume/types` has no runtime
  dependency, `@resume/schemas` validates, `@resume/contracts` publishes API/env
  contracts.

## COMMANDS

```bash
npm run automate:ssot       # sync + build + typecheck + job-server node tests
npm run automate:full       # full validation pipeline
npm run build               # sync data and generate portfolio worker
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run test:e2e:smoke
npm run verify:production
npm run sync:data
npm run sync:all
npm run deploy:wrangler:root:dry-run
go run ./tools/ci/validate-cloudflare-native.go
gitleaks detect --source . --config .gitleaks.toml --redact
```

## NOTES

- `applications/` is now scoped because it is a distinct top-level content
  corpus outside npm workspaces.
- `apps/portfolio/worker.js` may appear in code search because it is committed
  as a generated edge bundle; fix the generator or source inputs instead.
- LSP was unavailable during this refresh because the MCP transport was closed;
  code-map evidence came from codegraph, filesystem structure, configs, and
  explorer passes.
