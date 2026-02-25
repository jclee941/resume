# PROJECT KNOWLEDGE BASE

**Generated:** 2026-02-24 12:34:06 KST
**Commit:** 055bcc5
**Branch:** master

## OVERVIEW

Google3-style monorepo for a Cloudflare-hosted portfolio site and job-automation platform (single `resume` worker runtime). CI validates code; Cloudflare Workers Builds handles production deployment.

## STRUCTURE

```text
resume/
├── typescript/
│   ├── portfolio-worker/          # portfolio edge app + static generator
│   │   ├── lib/                   # 25 build/runtime JS modules
│   │   └── src/                   # source HTML/CSS/theme
│   ├── job-automation/            # MCP server + dashboard worker
│   │   ├── src/                   # MCP server core (hexagonal arch)
│   │   ├── workers/               # embedded dashboard runtime modules (served by resume worker)
│   │   ├── scripts/               # auth/sync utility scripts
│   │   └── platforms/             # platform-specific crawlers
│   ├── cli/                       # resume-cli (Commander.js)
│   └── data/                      # SSoT resume data and schemas
├── tools/                         # CI/build/deploy scripts
│   ├── ci/                        # affected.sh, validate-cloudflare-native.sh
│   └── scripts/                   # build, deployment, monitoring, utils
├── tests/                         # unit (Jest) / e2e (Playwright) / integration
├── infrastructure/                # Terraform + monitoring + D1 migrations
├── docs/                          # architecture, guides, planning
├── .github/                       # workflows, composite actions, rulesets
├── third_party/                   # Bazel dependency coordination
├── BUILD.bazel / MODULE.bazel     # Bazel facade layer
└── AGENTS.md hierarchy            # root + 31 domain guides
```

## WHERE TO LOOK

| Task                      | Location                                          | Notes                             |
| ------------------------- | ------------------------------------------------- | --------------------------------- |
| Portfolio worker behavior | `typescript/portfolio-worker/`                    | `worker.js` is generated          |
| Portfolio build pipeline  | `typescript/portfolio-worker/generate-worker.js`  | HTML→CSP→inline→worker.js         |
| Portfolio runtime modules | `typescript/portfolio-worker/lib/`                | 25 stateless JS modules           |
| Portfolio source styles   | `typescript/portfolio-worker/src/`                | CSS variables, dark-only theme    |
| Job automation MCP server | `typescript/job-automation/src/`                  | hexagonal: services/clients/tools |
| Job dashboard runtime     | `typescript/job-automation/workers/`              | embedded `/job/*` runtime modules |
| Job crawlers (stealth)    | `typescript/job-automation/src/crawlers/`         | Playwright + stealth patches      |
| Auto-apply system         | `typescript/job-automation/src/auto-apply/`       | form fill + rate limiting         |
| Auth/sync scripts         | `typescript/job-automation/scripts/`              | quick-login, cookie extraction    |
| Canonical resume data     | `typescript/data/resumes/master/resume_data.json` | SSoT                              |
| CI validation rules       | `.github/workflows/ci.yml`, `tools/ci/`           | validation-only pipeline          |
| Deployment policy         | `docs/guides/CLOUDFLARE_GITHUB_AUTO_DEPLOY.md`    | Cloudflare Builds authority       |
| Infrastructure as Code    | `infrastructure/cloudflare/`                      | Terraform for CF resources        |
| Test suites               | `tests/`                                          | unit/e2e/integration hub          |

## CODE MAP

| Symbol           | Type     | Location                                                  | Role                             |
| ---------------- | -------- | --------------------------------------------------------- | -------------------------------- |
| `main`           | function | `typescript/job-automation/src/index.js`                  | MCP server bootstrap (Fastify)   |
| default `fetch`  | handler  | `typescript/portfolio-worker/entry.js`                    | unified edge router              |
| default `fetch`  | handler  | `typescript/job-automation/workers/src/index.js`          | embedded dashboard API handler   |
| `run`            | function | `typescript/cli/bin/run.js`                               | CLI entrypoint (Commander)       |
| generator flow   | script   | `typescript/portfolio-worker/generate-worker.js`          | HTML/CSS/data → worker.js        |
| `WantedAPI`      | class    | `typescript/job-automation/src/shared/clients/wanted/`    | 40+ methods, 6 files             |
| `BaseCrawler`    | class    | `typescript/job-automation/src/crawlers/base-crawler.js`  | stealth patches, UA rotation     |
| `JobMatcher`     | class    | `typescript/job-automation/src/shared/services/matching/` | <60 skip, 60-74 review, ≥75 auto |
| `SessionManager` | class    | `typescript/job-automation/src/shared/services/session/`  | 24h TTL, cookie persistence      |
| `BaseHandler`    | class    | `typescript/job-automation/workers/src/handlers/`         | 13 handler subclasses            |

## CONVENTIONS

- Bazel is a coordination facade; everyday commands are npm scripts.
- Keep production runtime centered on `typescript/portfolio-worker/wrangler.toml`.
- ESM JavaScript with ESLint flat config (`eslint.config.cjs`), 69-warning ratchet baseline.
- Prettier: printWidth 100, singleQuote, trailingComma es5.
- tsconfig: NOT strict (`noImplicitAny` false, `strictNullChecks` false).
- Node 22 (`.nvmrc`). 5 npm workspaces.
- Root and domain ownership enforced (`OWNERS`, `.github/CODEOWNERS`).
- CI is validation-only; production deploy via Cloudflare Workers Builds (git-push).
- Use child AGENTS as deltas; avoid duplicating root guidance.

## ANTI-PATTERNS (THIS PROJECT)

- Never edit `typescript/portfolio-worker/worker.js` directly (generated).
- Never `trim()` inline scripts before CSP hash generation.
- Never bypass SSoT by editing derived resume artifacts.
- Never treat GitHub Actions as production deploy authority.
- Never hardcode env-specific resource names across docs/scripts.
- Never use naked Puppeteer — always stealth plugins + UA rotation.
- Never aggressive polling on job platforms (1s+ jitter between requests).
- Never cross-client imports in job-automation shared layer.
- Never store credentials in client code or commit cookies.

## COMMANDS

```bash
# core validation
npm run lint
npm run typecheck
npm run build
bash tools/ci/validate-cloudflare-native.sh

# test suites
npm run test:jest
npm run test:e2e

# portfolio generator
cd typescript/portfolio-worker && node generate-worker.js

# data sync
npm run sync:data
```

## AGENTS HIERARCHY

| Path                                                               | Focus                             |
| ------------------------------------------------------------------ | --------------------------------- |
| `typescript/portfolio-worker/AGENTS.md`                            | portfolio runtime/build pipeline  |
| `typescript/portfolio-worker/src/AGENTS.md`                        | source HTML/CSS/theme rules       |
| `typescript/portfolio-worker/lib/AGENTS.md`                        | 25 build/runtime modules          |
| `typescript/job-automation/AGENTS.md`                              | MCP server app domain             |
| `typescript/job-automation/src/AGENTS.md`                          | MCP server core architecture      |
| `typescript/job-automation/src/tools/AGENTS.md`                    | 9 MCP tool definitions            |
| `typescript/job-automation/src/server/routes/AGENTS.md`            | 13 Fastify route modules          |
| `typescript/job-automation/src/shared/AGENTS.md`                   | hexagonal arch core               |
| `typescript/job-automation/src/shared/clients/AGENTS.md`           | API client adapters               |
| `typescript/job-automation/src/shared/services/AGENTS.md`          | 10 domain service dirs            |
| `typescript/job-automation/src/shared/services/matching/AGENTS.md` | matching thresholds + AI fallback |
| `typescript/job-automation/src/auto-apply/AGENTS.md`               | stealth auto-submission           |
| `typescript/job-automation/src/crawlers/AGENTS.md`                 | stealth Playwright crawlers       |
| `typescript/job-automation/workers/AGENTS.md`                      | dashboard worker domain           |
| `typescript/job-automation/workers/src/handlers/AGENTS.md`         | worker handler contracts          |
| `typescript/job-automation/workers/src/workflows/AGENTS.md`        | workflow modules and triggers     |
| `typescript/job-automation/workers/src/middleware/AGENTS.md`       | request middleware rules          |
| `typescript/job-automation/scripts/AGENTS.md`                      | auth/sync utility scripts         |
| `typescript/job-automation/platforms/AGENTS.md`                    | platform-specific crawlers        |
| `typescript/cli/AGENTS.md`                                         | CLI wrappers                      |
| `typescript/data/AGENTS.md`                                        | resume SSoT and schema flow       |
| `typescript/data/resumes/technical/nextrade/AGENTS.md`             | Nextrade project docs             |
| `tools/AGENTS.md`                                                  | build/deploy script layer         |
| `tools/ci/AGENTS.md`                                               | CI helper scripts and guards      |
| `tools/scripts/AGENTS.md`                                          | automation script suite           |
| `tools/scripts/build/AGENTS.md`                                    | asset generation scripts          |
| `tools/scripts/utils/AGENTS.md`                                    | shared utility scripts            |
| `tools/scripts/deployment/AGENTS.md`                               | deployment helper scripts         |
| `tools/scripts/bazel/AGENTS.md`                                    | bazel facade shell scripts        |
| `tests/AGENTS.md`                                                  | test strategy and gotchas         |
| `tests/e2e/AGENTS.md`                                              | Playwright E2E conventions        |
| `tests/unit/AGENTS.md`                                             | Jest unit test conventions        |
| `tests/integration/AGENTS.md`                                      | integration test conventions      |
| `.github/AGENTS.md`                                                | workflow/repo automation          |
| `.github/workflows/AGENTS.md`                                      | workflow-level patterns/guards    |
| `docs/AGENTS.md`                                                   | documentation hub                 |
| `infrastructure/AGENTS.md`                                         | IaC + monitoring                  |
| `infrastructure/cloudflare/AGENTS.md`                              | Terraform for CF resources        |
| `third_party/AGENTS.md`                                            | Bazel dependency policy           |

## NOTES

- 73K+ lines of source code across 5 npm workspaces.
- Production worker name: `resume`. D1: `resume-prod-db`, `job-dashboard-db`.
- KV bindings: `SESSIONS`, `RATE_LIMIT_KV`, `NONCE_KV`. Queue: `crawl-tasks`.
- 7 Cloudflare Workflows: job-crawling, application, resume-sync, daily-report, health-check, backup, cleanup.
- Skills v2 API and Links API on Wanted are broken — use v1 only.
- Test E2E uses `domcontentloaded` not `networkidle` (terminal animations cause timeouts).
