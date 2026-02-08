# JOB AUTOMATION KNOWLEDGE BASE

**Generated:** 2026-02-09
**Commit:** 29d46c2
**Branch:** master

## OVERVIEW

MCP Server + Cloudflare Worker for stealth job automation. Hexagonal architecture: `shared/services/` (business logic) and `shared/clients/` (adapters). Dashboard now served at **resume.jclee.me/job/\*** (previously job.jclee.me).

## STRUCTURE

```
job-automation/
├── src/
│   ├── index.js                 # MCP server entry (Fastify + MCP tools)
│   ├── server/routes/           # 13 Fastify route modules
│   ├── crawlers/                # BaseCrawler + platform implementations
│   │   └── base-crawler.js      # CRITICAL: Stealth base class
│   ├── auto-apply/              # AutoApplier, ApplicationManager
│   ├── shared/
│   │   ├── services/            # Pure business logic (10 services)
│   │   │   ├── apply/           # ApplyOrchestrator, UnifiedApplySystem
│   │   │   ├── session/         # SessionManager (cookie persistence)
│   │   │   ├── matching/        # JobMatcher, AIMatcher
│   │   │   └── slack/           # SlackService
│   │   ├── clients/             # Adapters (D1, Vault, Wanted API)
│   │   │   └── wanted/          # Wanted.co.kr API client
│   │   ├── contracts/           # API/auth/session schemas
│   │   ├── utils/paths.js       # getResumeBasePath (no hardcoded paths)
│   │   └── validation/          # Input validators
│   └── tools/                   # 9 MCP tool implementations
├── workers/                     # Dashboard Cloudflare Worker
│   ├── src/
│   │   ├── index.js             # Worker entry (strips /job prefix)
│   │   ├── handlers/             # API route handlers
│   │   └── workflows/            # 8 Cloudflare Workflows
│   └── wrangler.toml            # Worker config + cron triggers
├── scripts/                     # 25 utility scripts
│   ├── quick-login.js           # Current auth method
│   └── extract-cookies-cdp.js   # Cookie extraction (recommended)
├── platforms/                   # Platform-specific configs
└── docs/                        # Internal documentation
```

## ENTRY POINTS

| Component  | Entry                    | Purpose                    |
| ---------- | ------------------------ | -------------------------- |
| MCP Server | `src/index.js`           | Fastify HTTP + MCP tools   |
| Worker     | `workers/src/index.js`   | Dashboard (job.jclee.me)   |
| Auth       | `scripts/quick-login.js` | Session cookie acquisition |

## WHERE TO LOOK

| Task                 | Location               | Notes                                             |
| -------------------- | ---------------------- | ------------------------------------------------- |
| Add Fastify route    | `src/server/routes/`   | Pattern: `export default async function(fastify)` |
| Add crawler          | `src/crawlers/`        | Extend `BaseCrawler`                              |
| Add business logic   | `src/shared/services/` | Pure, stateless, DI-friendly                      |
| Add external adapter | `src/shared/clients/`  | Isolated per client                               |
| Add MCP tool         | `src/tools/`           | Follow existing tool structure                    |
| Modify Worker        | `workers/src/`         | D1/KV bindings available                          |

## CODE MAP

| Class/Module         | Location                                | Purpose                         |
| -------------------- | --------------------------------------- | ------------------------------- |
| `BaseCrawler`        | `src/crawlers/base-crawler.js`          | Stealth Puppeteer base          |
| `UnifiedApplySystem` | `src/shared/services/apply/`            | Centralized job application     |
| `SessionManager`     | `src/shared/services/session/`          | Cookie persistence              |
| `JobMatcher`         | `src/shared/services/matching/`         | Skill-to-job matching           |
| `WantedClient`       | `src/shared/clients/wanted/`            | Wanted.co.kr API                |
| `AutoApplier`        | `src/auto-apply/auto-applier.js`        | Playwright form submission      |
| `ApplicationManager` | `src/auto-apply/application-manager.js` | Application status tracking     |
| `getResumeBasePath`  | `src/shared/utils/paths.js`             | Replaces hardcoded ~/dev/resume |

## PLATFORM CRAWLERS

| Platform | Tech                       | Notes                       |
| -------- | -------------------------- | --------------------------- |
| Wanted   | playwright-extra + stealth | Heavy WAF, frequent changes |
| JobKorea | Cheerio (static HTML)      | Simpler anti-bot            |
| Saramin  | playwright-extra + stealth | Dynamic content             |
| LinkedIn | Strict detection           | Use with caution            |

## API NOTES (CRITICAL)

| API       | Status  | Notes                                               |
| --------- | ------- | --------------------------------------------------- |
| Skills v1 | WORKING | Use `text` field only, v2 has bugs                  |
| Skills v2 | BROKEN  | Server error when toggling highlights               |
| Links API | BROKEN  | 500 error on update                                 |
| SNS API   | WORKING | Profile data (email, phone)                         |
| Chaos API | WORKING | Resume structure (projects, experiences, education) |

## CLOUDFLARE WORKFLOWS

| Workflow            | File            | Schedule       | Purpose                     |
| ------------------- | --------------- | -------------- | --------------------------- |
| HealthCheckWorkflow | health-check.js | _/5 _ \* \* \* | 5-min uptime + Slack alerts |
| BackupWorkflow      | backup.js       | 0 3 \* \* \*   | Daily D1→KV backup          |
| CleanupWorkflow     | cleanup.js      | 0 4 \* \* 0    | Weekly cleanup              |
| DailyReportWorkflow | daily-report.js | 0 9 \* \* \*   | Daily stats                 |
| AuthRefreshWorkflow | auth-refresh.js | 0 0 \* \* 1-5  | Auth token refresh          |
| ProfileSyncWorkflow | profile-sync.js | 0 2 \* \* 1    | Weekly profile sync         |
| ResumeSyncWorkflow  | resume-sync.js  | 0 1 \* \* \*   | Daily resume sync           |
| CacheWarmupWorkflow | cache-warmup.js | 0 6 \* \* \*   | Cache pre-warming           |

## CONVENTIONS

- **Hexagonal Arch**: Business logic in `services/`, adapters in `clients/`.
- **DI Pattern**: Services receive dependencies via constructor.
- **Stateless**: Services don't store state; use SessionManager for cookies.
- **Typed Errors**: Domain-specific error classes.
- **Route Pattern**: `export default async function(fastify) { ... }`
- **Imports**: Use `shared/` directly; `lib/` wrappers were deleted.

## ANTI-PATTERNS

| Anti-Pattern                               | Why                                     | Do Instead                               |
| ------------------------------------------ | --------------------------------------- | ---------------------------------------- |
| Naked Playwright/Puppeteer                 | Bot detection                           | Extend `BaseCrawler`                     |
| Fixed User-Agent strings                   | Fingerprinting                          | Use randomized UA from BaseCrawler       |
| Aggressive polling                         | Rate limits/bans                        | Use jitter + backoff                     |
| Skills v2 API                              | Server bugs                             | Use Skills v1 with `text` field          |
| Links API                                  | 500 errors                              | Skip until fixed                         |
| Direct state in services                   | Testing nightmare                       | Use SessionManager/DI                    |
| Cross-client imports                       | Circular deps                           | Each client isolated                     |
| Hardcoded credentials                      | Security                                | Use `.env` or Vault                      |
| Hardcoded `~/dev/resume` paths             | Breaks portability                      | Use `getResumeBasePath()` from paths.js  |
| Duplicate workers/↔portfolio/src/job/ code | styles.js, resume-sync.js exist in both | Single source in workers/, copy on build |

## COMMANDS

```bash
# MCP Server
cd typescript/job-automation
npm run dev              # Start dev server
npm run start            # Production server

# Worker
cd workers
./deploy.sh              # Deploy to Cloudflare
wrangler d1 execute JOB_AUTOMATION_DB --file=migrations/XXXX.sql

# Authentication
node scripts/quick-login.js    # Get session cookies
node scripts/auth-sync.js      # Sync cookies to Worker

# Testing
npm test                 # Run tests
```

## WORKER BINDINGS

| Binding         | Type | Purpose                |
| --------------- | ---- | ---------------------- |
| `DB`            | D1   | job_dashboard          |
| `SESSIONS`      | KV   | JOB_CACHE              |
| `RATE_LIMIT_KV` | KV   | Rate limiting          |
| `SCREENSHOTS`   | R2   | job-screenshots        |
| `Workflows`     | -    | 8 registered workflows |
