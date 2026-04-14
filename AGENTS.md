# PROJECT KNOWLEDGE BASE

**Generated:** 2026-04-14
**Commit:** `c2629c9`
**Branch:** `master`

## OVERVIEW

Resume monorepo: Cloudflare Worker portfolio, job automation runtimes, dashboard APIs, shared data/CLI packages, and self-hosted observability/automation configs.

## STRUCTURE

```text
./
├── apps/
│   ├── portfolio/        # public worker + generated edge bundle
│   ├── job-server/       # MCP/job automation runtime
│   └── job-dashboard/    # dashboard worker + workflows
├── packages/
│   ├── cli/              # resume CLI
│   ├── data/             # SSoT resumes and schemas
│   └── shared/           # cross-package shared utilities
├── tools/                # CI, build, deploy, verification scripts
├── tests/                # Jest, integration, Playwright E2E
├── infrastructure/       # Cloudflare, monitoring, n8n, DB config
├── docs/                 # guides, ADRs, architecture, reports
├── ta/                   # TA profile generation (Python/PPTX)
├── supabase/             # Supabase edge functions
├── third_party/          # vendored external dependencies
├── .github/              # CI/release/maintenance control plane
└── package.json          # workspace root + operator scripts
```

## WHERE TO LOOK

| Task                          | Location              | Notes                                                                      |
| ----------------------------- | --------------------- | -------------------------------------------------------------------------- |
| Portfolio build/runtime       | `apps/portfolio/`     | `worker.js` is generated; edit source/build pipeline instead               |
| Wanted/job automation         | `apps/job-server/`    | API clients, crawlers, MCP tools, sync/auth scripts                        |
| Dashboard/API workflows       | `apps/job-dashboard/` | handlers, middleware, Cloudflare workflows                                 |
| Authoritative resume content  | `packages/data/`      | `packages/data/resumes/master/resume_data.json` is the SSoT                |
| Workspace commands            | `package.json`        | `automate:ssot`, `automate:full`, `build`, `test`                          |
| CI/release behavior           | `.github/workflows/` + `.gitlab-legacy/` | GitHub Actions (ci.yml active); archived GitLab CI reference under `.gitlab-legacy/ci/`
| Shared operational scripts    | `tools/scripts/`      | build, deployment, verification, sync utilities                            |
| Tests by layer                | `tests/`              | `unit/`, `integration/`, `e2e/` with child guides                          |
| Monitoring and n8n automation | `infrastructure/`     | dashboards, alerting, webhook workflows                                    |
| Design/procedure docs         | `docs/`               | root docs guide plus ADR/architecture child guides                         |
| TA profile generation         | `ta/`                 | Python PPTX scripts, not a workspace package                               |
| Shared utilities              | `packages/shared/`    | Shared code used across internal packages                                  |

## CONVENTIONS

- npm workspaces are the day-to-day entrypoint; Bazel exists as a facade/query layer, not the primary developer workflow.
- Cloudflare Workers Builds owns production deploy authority; local deploy scripts are non-authoritative.
- `apps/portfolio/worker.js` is generated from source/build inputs; treat it as an artifact.
- Job automation code follows hexagonal boundaries: routes/tools/crawlers call shared services and clients, not each other ad hoc.
- Wanted sync automation uses `WANTED_EMAIL` + either `WANTED_COOKIES` or password fallback via `WANTED_ONEID_CLIENT_ID`.
- CI is validation-first: lint, typecheck, unit/E2E, security, Cloudflare-native validation, then release/verify.
- TypeScript strict-mode changes land in `tsconfig.json`; keep `apps/job-server/` and `packages/data/` compatible with `npx tsc --noEmit -p tsconfig.json` and avoid adding new unsuppressed strict violations.

## ANTI-PATTERNS (THIS PROJECT)

- Never edit generated artifacts directly (`apps/portfolio/worker.js`, derived resume outputs, generated dashboards).
- Never hardcode credentials, resume IDs, worker bindings, or Cloudflare resource IDs.
- Never use `networkidle` as a required Playwright load state for terminal-animation pages; use `domcontentloaded` or explicit waits.
- Never bypass CI/security/verification gates to make deploy or release look green.
- Never add new logic under deprecated wrapper modules; import from `apps/job-server/src/shared/` directly.
- Never treat docs under `analysis/` or `reports/` as normative rules; canonical rules live in AGENTS or focused guide files.

## Additional Anti-Patterns (from Tier 0 rules)

- Never use `.sh` for operational scripts (use Go `.go` instead).
- Never suppress type errors with `as any` or `@ts-ignore`.
- Never batch MCP tool calls (`mcphub_*`); call each directly.
- Never auto-init a git repo with `initializeIfNotPresent=true`.
- Never place runtime artifacts in source domains (`logs/`, `data/`, `tmp/`).
- Never use catch-all names like `utils.ts` or `helpers.js`; use specific names (`date-formatter.js`).
- Never exceed 200 LOC per file without splitting (see `rules/00-code-modularization.md`). Large files exist in job-server (notifications.js 1043L, application.js 851L) — known tech debt.

## UNIQUE STYLES

- Mixed runtime stack: Cloudflare Worker edge app, Node-based automation runtimes, and selective Python build tooling.
- Deep AGENTS hierarchy already exists in app/test/tool trees; add new child files only where a directory has distinct rules, not just many files.
- Docs split by responsibility: ADRs for durable decisions, architecture docs for system shape, guides for operational how-to, reports/analysis for historical output.
- Monitoring is split by backend role: Elasticsearch for app logs, Loki/Grafana/n8n for ops/infra workflows.

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
npm run lint              # ESLint check
npm run lint:fix          # ESLint auto-fix
npm run typecheck         # TypeScript strict mode check
npm run format            # Prettier format
npm run format:check      # Prettier check only

# Data sync
npm run sync:data         # Sync resume data from SSoT
npm run sync:pptx         # Generate PPTX profiles (Shinhan)
npm run sync:all          # Both sync operations
```

## NOTES

- 43 child AGENTS.md files exist across `apps/`, `tests/`, `tools/`, `infrastructure/`, and `packages/`; avoid duplicating their scope from the root.
- `infrastructure/n8n/` and `infrastructure/monitoring/` are distinct enough to warrant child AGENTS files; `docs/` stays governed at the docs-root level.
- `bazel-*` symlinks at repo root can confuse file-search tools; prefer project-root relative paths and ignore build outputs when documenting source layout.
- `supabase/functions/` contains Supabase edge functions — distinct runtime, not part of npm workspaces.
- Shell scripts persist in `infrastructure/n8n/` (9 files) — pending Go migration per monorepo standards.
