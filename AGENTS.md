# PROJECT KNOWLEDGE BASE

**Generated:** 2026-04-29 (verified fd0ba22)
**Branch:** `master`

## OVERVIEW

Resume monorepo: Cloudflare Worker portfolio, job automation runtimes, dashboard
APIs, shared data/types/schemas/contracts/utility packages, and self-hosted
observability/automation configs.

## STRUCTURE

```text
./
├── apps/
│   ├── portfolio/        # public worker + generated edge bundle
│   ├── job-server/       # MCP/job automation runtime
│   └── job-dashboard/    # dashboard worker + workflows
├── packages/
│   ├── cli/              # resume CLI
│   ├── env/              # environment validation + type-safe secrets
│   ├── data/             # SSoT resumes and JSON schema
│   ├── shared/           # cross-package utilities (errors, logger, retry, crypto, rate-limit, auth, browser, clients)
│   ├── types/            # canonical JSDoc/TS type definitions (zero runtime deps)
│   ├── schemas/          # runtime Zod validation schemas
│   └── contracts/        # OpenAPI spec + Cloudflare Worker Env interface
├── tools/                # CI, build, deploy, verification scripts (Go + JS)
├── tests/                # Jest, integration, Playwright E2E
├── infrastructure/       # Cloudflare, monitoring, n8n, DB config
├── docs/                 # guides, ADRs, architecture, conventions, security
├── ta/                   # TA profile generation (Python/PPTX)
├── supabase/             # Supabase edge functions
├── third_party/          # vendored external dependencies (npm-managed)
├── .github/              # CI/release/maintenance control plane
└── package.json          # workspace root + operator scripts
```

## WHERE TO LOOK

| Task                          | Location                                 | Notes                                                                  |
| ----------------------------- | ---------------------------------------- | ---------------------------------------------------------------------- |
| Portfolio build/runtime       | `apps/portfolio/`                        | `worker.js` is generated; edit source/build pipeline instead           |
| Wanted/job automation         | `apps/job-server/`                       | API clients, crawlers, MCP tools, sync/auth scripts                    |
| Dashboard/API workflows       | `apps/job-dashboard/`                    | handlers, middleware, Cloudflare workflows                             |
| Authoritative resume content  | `packages/data/`                         | `packages/data/resumes/master/resume_data.json` is the SSoT            |
| Shared types (JSDoc/TS)       | `packages/types/`                        | Canonical type SSoT — Application, Resume, WantedJob, WorkerEnv, etc.  |
| Runtime validation (Zod)      | `packages/schemas/`                      | API payload + resume + auth schemas; types inferred via z.infer<>      |
| Cross-app contracts           | `packages/contracts/`                    | openapi.yaml + Env interface re-export                                 |
| Cross-package utilities       | `packages/shared/`                       | errors, logger, retry, crypto, rate-limit, auth, browser, clients      |
| Workspace commands            | `package.json`                           | `automate:ssot`, `automate:full`, `build`, `test`                      |
| CI/release behavior           | `.github/workflows/`                     | GitHub Actions only — GitLab CI archive removed during Epic 5          |
| Shared operational scripts    | `tools/scripts/`                         | build, deployment, verification, sync utilities                        |
| Tests by layer                | `tests/`                                 | `unit/`, `integration/`, `e2e/` with child guides                      |
| Monitoring and n8n automation | `infrastructure/`                        | dashboards, alerting, webhook workflows; n8n Go binaries source        |
| Design/procedure docs         | `docs/`                                  | ADRs, architecture, conventions, security, guides                      |
| Architecture rules            | `docs/conventions/architecture-rules.md` | 200-LOC limit, no catch-all names, n8n SSoT for workflows (was rules/) |
| Security playbooks            | `docs/security/`                         | SECRET_ROTATION_PLAYBOOK.md, secret manager guidance                   |
| TA profile generation         | `ta/`                                    | Python PPTX scripts, not a workspace package                           |

## CONVENTIONS

- npm workspaces are the **only** build orchestrator. Bazel was dropped (see
  `docs/adr/0008-drop-bazel-facade.md`).
- Workspace deps use `*` (npm workspaces resolves) — never `file:../..` paths.
- Cloudflare Workers Builds owns production deploy authority; local deploy
  scripts are non-authoritative.
- `apps/portfolio/worker.js` is generated from source/build inputs; treat it as
  an artifact.
- Job automation code follows hexagonal boundaries: routes/tools/crawlers call
  shared services and clients, not each other ad hoc.
- Wanted sync automation uses `WANTED_EMAIL` + either `WANTED_COOKIES` or
  password fallback via `WANTED_ONEID_CLIENT_ID`.
- CI is validation-first: secret-scan (gitleaks), lint, typecheck, unit/E2E,
  security, Cloudflare-native validation, then release/verify.
- TypeScript strict-mode flags live in `tsconfig.json`; the JS-only base lives
  in `tsconfig.base.json` (was `jsconfig.json`). Avoid adding new unsuppressed
  strict violations.
- Secrets MUST come from secrets manager (Cloudflare Workers Secrets /
  1Password); never commit `.env`, `.env.secrets`, `.env.automation`, session
  JSONs.

## ANTI-PATTERNS (THIS PROJECT)

- Never edit generated artifacts directly (`apps/portfolio/worker.js`, derived
  resume outputs, generated dashboards).
- Never hardcode credentials, resume IDs, worker bindings, or Cloudflare
  resource IDs.
- Never commit `.env*` files containing real values, session cookies, or API
  tokens. Pre-commit gitleaks hook and CI `secret-scan` job will block.
- Never use `networkidle` as a required Playwright load state for
  terminal-animation pages; use `domcontentloaded` or explicit waits.
- Never bypass CI/security/verification gates to make deploy or release look
  green.
- Never add new logic under deprecated wrapper modules; import from
  `apps/job-server/src/shared/` or `@resume/shared/*` directly.
- Never re-introduce Bazel files (BUILD.bazel, MODULE.bazel, WORKSPACE,
  .bazelrc) without an ADR superseding 0008.
- Never define a domain type in two packages — put it in `@resume/types` and
  import from there.
- Never write a hand-rolled validator when a `@resume/schemas` Zod schema fits —
  extend the schema instead.

## Additional Anti-Patterns (from docs/conventions/architecture-rules.md)

- Never use `.sh` for operational scripts (use Go `.go` instead).
- Never suppress type errors with `as any` or `@ts-ignore`.
- Never batch MCP tool calls (`mcphub_*`); call each directly.
- Never auto-init a git repo with `initializeIfNotPresent=true`.
- Never place runtime artifacts in source domains (`logs/`, `data/`, `tmp/`).
- Never use catch-all names like `utils.ts` or `helpers.js`; use specific names
  (`date-formatter.js`).
- Never exceed 200 LOC per file without splitting (this project enforces the
  soft 200-LOC limit as HARD; general fallback is 500). See
  `docs/conventions/architecture-rules.md`. Epic 6 file-size hygiene is
  complete — the previously oversized job-server/job-dashboard handlers have
  been split; do not re-grow them.

## UNIQUE STYLES

- Mixed runtime stack: Cloudflare Worker edge app, Node-based automation
  runtimes, and selective Python build tooling.
- Deep AGENTS hierarchy already exists in app/test/tool trees; add new child
  files only where a directory has distinct rules, not just many files.
- Docs split by responsibility: ADRs for durable decisions, architecture docs
  for system shape, conventions for required rules, guides for operational
  how-to, security for secret handling, reports/analysis for historical output.
- Monitoring is split by backend role: Elasticsearch for app logs,
  Loki/Grafana/n8n for ops/infra workflows.
- Type / validation split: pure JSDoc types live in `@resume/types`, Zod runtime
  schemas live in `@resume/schemas`, contracts in `@resume/contracts`. Schemas
  infer their TS types from themselves to prevent drift.

## COMMANDS

```bash
# Full automation pipelines
npm run automate:ssot     # SSOT sync + build + typecheck + test:node
npm run automate:full     # Full CI pipeline (sync + lint + test + build + validate)

# Build & development
npm run build             # Generate worker.js from HTML templates
npm run dev               # Local dev with Miniflare
npm run dev:wrangler      # Wrangler dev mode

# Testing
npm test                  # All tests (Jest + Node)
npm run test:jest         # Jest unit/integration tests
npm run test:node         # Node native tests (job-server)
npm run test:e2e          # Playwright E2E tests
npm run test:e2e:smoke    # Smoke tests (worker-health + deploy-verification)
npm run verify:production # Verify against live production site

# Validation & quality
npm run lint              # ESLint check (single root config now)
npm run lint:fix          # ESLint auto-fix
npm run typecheck         # TypeScript strict mode check
npm run format            # Prettier format
npm run format:check      # Prettier check only

# Data sync
npm run sync:data         # Sync resume data from SSoT
npm run sync:pptx         # Generate PPTX profiles (Shinhan)
npm run sync:all          # Both sync operations

# Security
gitleaks detect --source . --config .gitleaks.toml --redact   # Manual secret scan
pre-commit install                                              # Install pre-commit hooks
```

## NOTES

- 48 child AGENTS.md files exist across `apps/`, `tests/`, `tools/`,
`infrastructure/`, and `packages/`; avoid duplicating their scope from the
root.

- `infrastructure/n8n/` and `infrastructure/monitoring/` are distinct enough to
  warrant child AGENTS files; `docs/` stays governed at the docs-root level.
- `supabase/functions/` contains Supabase edge functions — distinct runtime, not
  part of npm workspaces.
  #QR|- Go scripts in `infrastructure/n8n/` (13 files) — shell-to-Go migration
  XB| complete per monorepo standards.
- New packages (types/schemas/contracts) created in Epic 2 each have their own
  focused AGENTS.md.
- Foundation modules in `@resume/shared` (retry/crypto/rate-limit/auth) created
  in Epic 4; app-local consumers will be migrated in follow-up PRs.

## SSOT IMPROVEMENT STATUS

Active improvement plan: `docs/architecture/SSOT_IMPROVEMENT_PLAN.md`

| Epic   | Scope                                                                                         | Status                                                                                                                |
| ------ | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Epic 0 | P0 security: committed secrets purge, gitignore hardening, gitleaks CI gate, KV ownership doc | Completed (working tree). History rewrite + force push pending owner per `docs/security/SECRET_ROTATION_PLAYBOOK.md`. |
| Epic 1 | Build/Config SSOT: drop Bazel, fix tsconfig, decouple ESLint, workspace:\*                    | Completed                                                                                                             |
| Epic 2 | Types/Schemas/Contracts SSOT: new packages/types, /schemas, /contracts                        | Completed (creation). Migrating callers is incremental.                                                               |
| Epic 3 | Env/Secrets SSOT                                                                              | Partial. Cloudflare Workers Secrets adopted as default; full secrets manager (Doppler/Keyflare) deferred.             |
| Epic 4 | Domain SSOT consolidation                                                                     | Foundation modules created in @resume/shared. App-local migration is per-domain follow-up PRs.                        |
| Epic 5 | Documentation SSOT                                                                            | Completed. .gitlab-legacy/ removed, rules/ moved to docs/conventions/, root binaries deleted.                         |
| Epic 6 | File-size hygiene                                                                             | Completed. job-dashboard/job-server oversized handlers split; largest source files now under the 200-LOC project limit.  |

#AY|- Never include concrete performance metrics (percentages, ratios, or absolute numbers) in
#QH| portfolio/resume text. Describe outcomes factually without quantified claims (e.g., say
#WR| "automated manual workflows to reduce operational burden" instead of "80% reduction").
#ER| Be conservative—state only what is verifiable.
