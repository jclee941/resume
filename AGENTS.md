# PROJECT KNOWLEDGE BASE

**Generated:** 2026-02-11
**Commit:** 941e396
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
├── BUILD.bazel                    # Root build aliases
├── MODULE.bazel                   # Bzlmod configuration
└── OWNERS                         # Root code owners
```

## ENTRY POINTS

| Component        | Entry Point                                       | Notes                               |
| ---------------- | ------------------------------------------------- | ----------------------------------- |
| MCP Server       | `typescript/job-automation/src/index.js`          | Fastify + MCP tools                 |
| Portfolio Build  | `typescript/portfolio-worker/generate-worker.js`  | HTML → Worker compiler              |
| Dashboard Worker | `typescript/job-automation/workers/src/index.js`  | resume.jclee.me/job/\* entry        |
| CLI Tool         | `typescript/cli/bin/run.js`                       | `resume-cli` Commander.js           |
| Resume Data      | `typescript/data/resumes/master/resume_data.json` | Canonical SSoT                      |
| Unified Router   | `typescript/portfolio-worker/entry.js`            | Routes portfolio + /job/\* dispatch |

## CODE MAP

| Component             | Location                                                 | Purpose                                |
| --------------------- | -------------------------------------------------------- | -------------------------------------- |
| `BaseCrawler`         | `typescript/job-automation/src/crawlers/base-crawler.js` | Anti-bot stealth base class            |
| `UnifiedApplySystem`  | `typescript/job-automation/src/shared/services/apply/`   | Centralized job application            |
| `SessionManager`      | `typescript/job-automation/src/shared/services/session/` | Session persistence                    |
| `WantedClient`        | `typescript/job-automation/src/shared/clients/wanted/`   | Wanted.co.kr API client                |
| `generate-worker.js`  | `typescript/portfolio-worker/generate-worker.js`         | HTML → worker.js compiler              |
| `security-headers.js` | `typescript/portfolio-worker/lib/security-headers.js`    | CSP baseline, HSTS                     |
| `sync-resume-data.js` | `tools/scripts/utils/sync-resume-data.js`                | SSoT propagation script                |
| `getResumeBasePath`   | `typescript/job-automation/src/shared/utils/paths.js`    | Replaces hardcoded ~/dev/resume paths  |
| `terminalCommands`    | `typescript/portfolio-worker/index.html`                 | Interactive CLI commands               |
| `Workflows`           | `typescript/job-automation/workers/src/workflows/`       | 8 Cloudflare Workflows                 |
| `entry.js`            | `typescript/portfolio-worker/entry.js`                   | Unified dispatcher: /job/\*→jobHandler |

## BUILD COMMANDS

```bash
bazel build //typescript/portfolio-worker:build   # Build portfolio
bazel build //typescript/job-automation:test       # Run tests
bazel build //tools:deploy                        # Deploy all
npm run build:all                                 # Direct npm (Bazel wraps these)
npm run test:unit                                 # Jest unit tests
npm run sync:data                                 # Propagate SSoT
```

## ANTI-PATTERNS

| Anti-Pattern                   | Why                         | Do Instead                                         |
| ------------------------------ | --------------------------- | -------------------------------------------------- |
| Edit `worker.js` directly      | Regenerated on build        | Edit `generate-worker.js` or HTML                  |
| `trim()` before CSP hash       | Whitespace affects SHA-256  | Hash exact source string                           |
| Naked Puppeteer/Playwright     | Bot detection               | Use `BaseCrawler` with stealth                     |
| Cross-client imports           | Circular dependencies       | Each client isolated in own dir                    |
| Hardcode secrets               | Security violation          | Use `.env` or `wrangler secret`                    |
| Skip OWNERS review             | Breaks code ownership       | Get OWNERS approval                                |
| Edit resume in multiple places | Data inconsistency          | Edit only `resume_data.json` (SSoT)                |
| Duplicate shared↔workers code  | workers/ vs shared/ drift   | Keep business logic in shared/, import in workers/ |
| Ignore SECURITY_WARNING.md     | Contains 8 exposed API keys | Read and act on warnings                           |

## REFACTORING CANDIDATES

| File                   | Lines | Issue              | Recommended Fix                    |
| ---------------------- | ----- | ------------------ | ---------------------------------- |
| `profile-sync.js`      | 966   | 21 fn, 3 platforms | Command pattern per platform       |
| `resume.js` (MCP tool) | 869   | 23 switch cases    | Command pattern                    |
| `cli.js`               | 672   | 12 switch stmts    | Extract handler classes            |
| `worker-api-routes.js` | 566   | 10 mixed routes    | Split csp.js/metrics.js/vitals.js  |
| `generate-worker.js`   | 1041  | Monolithic build   | Extract CSP/routing modules        |
| `dashboard.html`       | 1386  | Inline everything  | Extract JS/CSS into separate files |

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

## CONVENTIONS

- **Google3**: Language dirs (`typescript/`), OWNERS files, BUILD.bazel, default-private visibility
- **ESM** modules, ESLint flat config (`eslint.config.cjs`), no Prettier, JSDoc for public APIs
- **Scripts**: Always `pwd` = project root, use `npm run <script>` from root

## AGENTS.MD HIERARCHY

Subdirectory AGENTS.md files provide domain-specific context:

| Path                                          | Focus                                        |
| --------------------------------------------- | -------------------------------------------- |
| `typescript/portfolio-worker/AGENTS.md`       | Terminal UI, build pipeline, CSP             |
| `typescript/job-automation/AGENTS.md`         | MCP server, crawlers, shared services        |
| `typescript/job-automation/workers/AGENTS.md` | Dashboard worker, workflows, D1/KV bindings  |
| `typescript/cli/AGENTS.md`                    | CLI tool usage, Wrangler wrapper             |
| `typescript/data/AGENTS.md`                   | SSoT schema, sync process                    |
| `tests/AGENTS.md`                             | Test patterns, coverage reqs, wait strategy  |
| `tools/AGENTS.md`                             | Build scripts, CI utilities                  |
| `.github/AGENTS.md`                           | CI/CD pipeline, PR workflows, actions        |
| `infrastructure/AGENTS.md`                    | Observability stack (Grafana/ELK/Prometheus) |
| `docs/AGENTS.md`                              | Documentation hub                            |
| `third_party/AGENTS.md`                       | npm deps, One Version Rule                   |
