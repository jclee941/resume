# PROJECT KNOWLEDGE BASE

**Generated:** 2026-02-09
**Commit:** 29d46c2
**Branch:** master
**Build System:** Bazel + npm (Google3-style hybrid)

## OVERVIEW

Google3-style monorepo (TypeScript/Cloudflare Workers) for Resume Portfolio & Job Automation.

| Application      | Domain              | Technology          | Purpose                    |
| ---------------- | ------------------- | ------------------- | -------------------------- |
| portfolio-worker | resume.jclee.me     | Cloudflare Worker   | Edge-deployed portfolio    |
| job-automation   | resume.jclee.me/job | MCP Server + Worker | Job application automation |
| resume-cli       | (local)             | Commander.js        | Deployment orchestration   |

**Key Principles:**

- **SSoT**: All data flows from `typescript/data/resumes/master/resume_data.json`
- **Bazel Facade**: Bazel coordinates, npm executes (hybrid Google3)
- **Zero-Runtime I/O**: Portfolio worker inlines all assets at build time
- **Stealth-First**: Job automation uses anti-detection crawlers

## STRUCTURE

```
resume/
├── typescript/                    # Language-based source directory
│   ├── cli/                       # Deployment CLI (Commander.js)
│   ├── data/                      # SSoT: Resume JSONs & schemas
│   ├── job-automation/            # MCP Server + Dashboard Worker
│   │   ├── src/                   # Core application
│   │   │   ├── crawlers/          # Anti-bot stealth crawlers
│   │   │   ├── shared/            # Cross-cutting services
│   │   │   └── tools/             # MCP tool implementations
│   │   └── workers/               # Dashboard Cloudflare Worker
│   │       └── src/workflows/     # Cloudflare Workflow definitions
│   └── portfolio-worker/          # Edge portfolio worker
│       ├── lib/                   # Stateless modules (security-headers.js)
│       ├── src/job/               # Job-related modules
│       ├── src/styles/            # Modular CSS (animations, components)
│       └── data.json              # Build-time resume data snapshot
├── tools/                         # Build, deploy, CI scripts
│   ├── scripts/build/             # npm script wrappers
│   └── ci/                        # affected.sh, CI helpers
├── tests/                         # Jest unit + Playwright E2E
├── infrastructure/                # Grafana/Elasticsearch/Prometheus/n8n
├── third_party/                   # npm deps (One Version Rule)
├── docs/                          # Documentation hub
├── .github/                       # CI/CD, CODEOWNERS, Dependabot, labeler
│   ├── actions/setup/             # Composite action (Node/npm/Playwright)
│   ├── workflows/ci.yml           # CI pipeline v2.0
│   ├── CODEOWNERS                 # PR auto-reviewer assignment
│   ├── dependabot.yml             # Automated dependency updates
│   └── labeler.yml                # PR auto-labeling rules
├── SECURITY_WARNING.md            # Exposed API key warnings
├── BUILD.bazel                    # Root build aliases
├── MODULE.bazel                   # Bzlmod configuration
└── OWNERS                         # Root code owners
```

## ENTRY POINTS

| Component        | Entry Point                                       | Notes                        |
| ---------------- | ------------------------------------------------- | ---------------------------- |
| MCP Server       | `typescript/job-automation/src/index.js`          | Fastify + MCP tools          |
| Portfolio Build  | `typescript/portfolio-worker/generate-worker.js`  | HTML → Worker compiler       |
| Dashboard Worker | `typescript/job-automation/workers/src/index.js`  | resume.jclee.me/job/\* entry |
| CLI Tool         | `typescript/cli/bin/run.js`                       | `resume-cli` Commander.js    |
| Resume Data      | `typescript/data/resumes/master/resume_data.json` | Canonical SSoT               |

## CODE MAP

| Component             | Location                                                 | Purpose                               |
| --------------------- | -------------------------------------------------------- | ------------------------------------- |
| `BaseCrawler`         | `typescript/job-automation/src/crawlers/base-crawler.js` | Anti-bot stealth base class           |
| `UnifiedApplySystem`  | `typescript/job-automation/src/shared/services/apply/`   | Centralized job application           |
| `SessionManager`      | `typescript/job-automation/src/shared/services/session/` | Session persistence                   |
| `WantedClient`        | `typescript/job-automation/src/shared/clients/wanted/`   | Wanted.co.kr API client               |
| `generate-worker.js`  | `typescript/portfolio-worker/generate-worker.js`         | HTML → worker.js compiler             |
| `security-headers.js` | `typescript/portfolio-worker/lib/security-headers.js`    | CSP baseline, HSTS                    |
| `sync-resume-data.js` | `tools/scripts/utils/sync-resume-data.js`                | SSoT propagation script               |
| `getResumeBasePath`   | `typescript/job-automation/src/shared/utils/paths.js`    | Replaces hardcoded ~/dev/resume paths |
| `terminalCommands`    | `typescript/portfolio-worker/index.html`                 | Interactive CLI commands              |
| `Workflows`           | `typescript/job-automation/workers/src/workflows/`       | 8 Cloudflare Workflows                |

## BAZEL TARGETS

```bash
# Query all targets
bazel query "//..."

# Build portfolio (triggers npm under hood)
bazel build //typescript/portfolio-worker:build

# Run tests
bazel build //typescript/job-automation:test

# Deploy all applications
bazel build //tools:deploy

# Find affected targets (CI)
./tools/ci/affected.sh origin/master
```

**Note:** Bazel wraps npm scripts. For direct execution:

```bash
npm run build:all     # Build all
npm run test:all      # Run all tests
npm run sync:data     # Propagate SSoT changes
```

## ANTI-PATTERNS

| Anti-Pattern                   | Why                                                | Do Instead                                                    |
| ------------------------------ | -------------------------------------------------- | ------------------------------------------------------------- |
| Edit `worker.js` directly      | Regenerated on build                               | Edit `generate-worker.js` or HTML                             |
| `trim()` before CSP hash       | Whitespace affects SHA-256                         | Hash exact source string                                      |
| Naked Puppeteer/Playwright     | Bot detection                                      | Use `BaseCrawler` with stealth                                |
| Cross-client imports           | Circular dependencies                              | Each client isolated in own dir                               |
| Hardcode secrets               | Security violation                                 | Use `.env` or `wrangler secret`                               |
| Skip OWNERS review             | Breaks code ownership                              | Get OWNERS approval                                           |
| Edit resume in multiple places | Data inconsistency                                 | Edit only `resume_data.json` (SSoT)                           |
| Duplicate shared code          | workers/ vs shared/ drift                          | Keep business logic in shared/                                |
| Duplicate shared↔workers code  | portfolio/src/job/ mirrors workers/src/ (37 files) | Consolidate: single source in workers/, import from portfolio |
| Ignore SECURITY_WARNING.md     | Contains 6 exposed API keys                        | Read and act on warnings                                      |

## REFACTORING CANDIDATES

| File                   | Lines    | Issue                       | Recommended Fix                      |
| ---------------------- | -------- | --------------------------- | ------------------------------------ |
| `webhooks.js`          | 1129     | God Object                  | Split into handlers/ by event type   |
| `resume-sync.js`       | 955      | 450-line switch             | Command pattern                      |
| `generate-worker.js`   | 1041     | Monolithic build            | Extract CSP/routing modules          |
| `worker.js`            | 1534     | Generated monolith          | Modularize generate-worker.js output |
| `dashboard.html`       | 1386     | Inline everything           | Extract JS/CSS into separate files   |
| `profile-sync.js`      | 966      | Complex sync logic          | Split into validators + transformers |
| `src/job/` (portfolio) | 37 files | Full mirror of workers/src/ | Deduplicate: single source, import   |

## BUILD PIPELINE

### Portfolio Worker

```
typescript/data/resumes/master/resume_data.json  (SSoT)
    ↓ sync-resume-data.js
typescript/portfolio-worker/index.html
    ↓ generate-worker.js (escape backticks, compute CSP hashes)
typescript/portfolio-worker/worker.js  (NEVER EDIT)
    ↓ wrangler deploy
resume.jclee.me (Cloudflare Edge)
```

### Job Automation

```
MCP Server: src/index.js → Fastify HTTP + MCP tools
    ├── Crawlers: BaseCrawler → platform-specific (Wanted, Saramin, etc.)
    └── Services: UnifiedApplySystem → SessionManager → Clients

Dashboard Worker: workers/src/index.js → Cloudflare Worker
    ├── resume.jclee.me/job/* (strips /job prefix internally)
    ├── Bindings: D1 (job_dashboard), KV (JOB_CACHE), R2 (job-screenshots)
    └── 8 Cloudflare Workflows (see CLOUDFLARE WORKFLOWS section)
```

## CLOUDFLARE WORKFLOWS

| Workflow            | File                      | Schedule       | Purpose                                |
| ------------------- | ------------------------- | -------------- | -------------------------------------- |
| HealthCheckWorkflow | workflows/health-check.js | _/5 _ \* \* \* | 5-min uptime monitoring + Slack alerts |
| BackupWorkflow      | workflows/backup.js       | 0 3 \* \* \*   | Daily D1 → KV backup, 7-day retention  |
| CleanupWorkflow     | workflows/cleanup.js      | 0 4 \* \* 0    | Weekly expired session/log cleanup     |
| DailyReportWorkflow | workflows/daily-report.js | 0 9 \* \* \*   | Daily job stats aggregation            |
| AuthRefreshWorkflow | workflows/auth-refresh.js | 0 0 \* \* 1-5  | Weekday auth token refresh             |
| ProfileSyncWorkflow | workflows/profile-sync.js | 0 2 \* \* 1    | Weekly profile sync from SSoT          |
| ResumeSyncWorkflow  | workflows/resume-sync.js  | 0 1 \* \* \*   | Daily resume data propagation          |
| CacheWarmupWorkflow | workflows/cache-warmup.js | 0 6 \* \* \*   | Daily cache pre-warming                |

## CI/CD PIPELINE

**GitHub Actions** (`.github/workflows/ci.yml` v2.0):

| Trigger               | Action                                                          |
| --------------------- | --------------------------------------------------------------- |
| Push to `master`      | Analyze → Lint/Test → Build → Deploy → Verify                   |
| Deploy/verify failure | Auto-rollback via `wrangler rollback`                           |
| PR opened/updated     | Ephemeral preview worker (`resume-pr-{N}`)                      |
| PR to `master`        | Analyze → Lint/Test → Build → Preview comment                   |
| `workflow_dispatch`   | Manual deploy with `force_deploy`/`dry_run`/`skip_tests` inputs |

**Pipeline Architecture (13 jobs):**

```
analyze → lint ──────────────────┐
        → typecheck ─────────────┤
        → test-unit ─────────────┤→ build → deploy → verify → notify
        → test-e2e ──────────────┤              ↓ (on failure)
        → security-scan ─────────┘          rollback
```

| Job               | Purpose                                                     |
| ----------------- | ----------------------------------------------------------- |
| `analyze`         | Affected target detection via `affected.sh`                 |
| `lint`            | ESLint flat config                                          |
| `typecheck`       | TypeScript type checking                                    |
| `test-unit`       | Jest unit tests (skippable via `skip_tests`)                |
| `test-e2e`        | Playwright E2E (skippable, browser cached ~500MB)           |
| `security-scan`   | npm audit + secret detection                                |
| `build`           | `generate-worker.js` → `worker.js` (strict gate)            |
| `deploy`          | `wrangler deploy --env production` + GitHub Deployments API |
| `verify`          | CF API age check + HTTP health (`/` and `/job/health`)      |
| `rollback`        | `wrangler rollback` on deploy/verify failure                |
| `notify`          | Slack notification on deploy outcome                        |
| `deploy-preview`  | PR ephemeral worker (`resume-pr-{N}`)                       |
| `cleanup-preview` | Cleanup preview workers on PR close                         |

**Key Design Decisions:**

- **Composite Action** (`.github/actions/setup/action.yml`): Eliminates 6x Node/npm setup duplication
- **Strict Deploy Gate**: `success()` (not `always()&&!failure()&&!cancelled()`) with `force_deploy` bypass
- **Separated Concurrency**: PR gets `pr-{N}` (cancel-in-progress), deploy gets `deploy-production` (queue)
- **Playwright Cache**: Browser binaries cached via composite action (~500MB/run savings)
- **Verify Strategy**: CF API worker age as primary check; HTTP health as warning-only (Bot Fight Mode blocks CI IPs)

**Deployed Target:**

- Single worker "resume" → `resume.jclee.me` (serves both portfolio and `/job/*` dashboard)

**Required Secrets:** `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `AUTH_SYNC_SECRET`, `ENCRYPTION_KEY`

**Manual Deployment (Fallback):**

```bash
source ~/.env && cd typescript/portfolio-worker && \
  CLOUDFLARE_API_KEY="$CLOUDFLARE_API_KEY" \
  CLOUDFLARE_EMAIL="$CLOUDFLARE_EMAIL" \
  npx wrangler deploy --env production
```

## TESTING

| Type   | Framework  | Location      | Coverage Floor |
| ------ | ---------- | ------------- | -------------- |
| Unit   | Jest       | `tests/unit/` | 90%            |
| E2E    | Playwright | `tests/e2e/`  | Critical paths |
| Visual | Playwright | `*.spec.js`   | 5% pixel diff  |

**Special Requirements:**

- `generate-worker.js` requires 100% coverage
- All tests data-driven from `typescript/data` SSoT
- E2E defaults to production URL
- E2E uses `domcontentloaded` wait strategy for portfolio

## CONVENTIONS

### Google3 Style

- **Language Directories**: `typescript/`, not `apps/` or `packages/`
- **OWNERS Files**: Every package has code ownership
- **BUILD.bazel**: Explicit dependency declarations
- **Visibility**: Default private, explicit exports

### Code Style

- ESM modules (`type: "module"` in package.json)
- ESLint flat config (`eslint.config.cjs`), no Prettier
- JSDoc for public APIs

### Scripts

- All scripts assume `pwd` is project root
- Use `npm run <script>` from root, not subdirectories

## FILES

| File                     | Purpose                                   |
| ------------------------ | ----------------------------------------- |
| `MODULE.bazel`           | Bzlmod deps (rules_shell)                 |
| `WORKSPACE`              | Legacy Bazel compat                       |
| `.bazelrc`               | Build configurations                      |
| `BUILD.bazel`            | Package build rules (root aliases)        |
| `OWNERS`                 | Root code ownership                       |
| `package.json`           | npm workspaces root                       |
| `eslint.config.cjs`      | ESLint flat config (117-warning baseline) |
| `SECURITY_WARNING.md`    | Exposed API key warnings                  |
| `.github/CODEOWNERS`     | PR auto-reviewer assignment (from OWNERS) |
| `.github/dependabot.yml` | Automated npm dependency updates          |
| `.github/labeler.yml`    | PR auto-labeling by path                  |

## AGENTS.MD HIERARCHY

Subdirectory AGENTS.md files provide domain-specific context:

| Path                                          | Focus                                       |
| --------------------------------------------- | ------------------------------------------- |
| `typescript/cli/AGENTS.md`                    | CLI tool usage, Wrangler wrapper            |
| `typescript/data/AGENTS.md`                   | SSoT schema, sync process                   |
| `typescript/job-automation/AGENTS.md`         | MCP server, crawlers, workers               |
| `typescript/job-automation/workers/AGENTS.md` | Dashboard worker, workflows, D1/KV bindings |
| `typescript/portfolio-worker/AGENTS.md`       | Terminal UI, CLI, build pipeline, CSP       |
| `tests/AGENTS.md`                             | Test patterns, coverage reqs, wait strategy |
| `tools/AGENTS.md`                             | Build scripts, CI utilities                 |
| `infrastructure/AGENTS.md`                    | Observability stack (Grafana)               |
| `docs/AGENTS.md`                              | Documentation hub, \_vendor/bmad warning    |
| `third_party/AGENTS.md`                       | npm deps, One Version Rule                  |

See subdirectory AGENTS.md for deeper context on each component.
