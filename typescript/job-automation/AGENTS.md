# JOB AUTOMATION KNOWLEDGE BASE

**Generated:** 2026-02-11  
**Commit:** cdb3786  
**Branch:** docs/job-automation-architecture

## OVERVIEW

MCP Server + Cloudflare Worker for stealth job automation. Hexagonal architecture: `shared/services/` (business logic) and `shared/clients/` (adapters). Dashboard served at **resume.jclee.me/job/\***.

**Architecture Components**:

- **Crawlers Layer**: HTTP-based job fetching with anti-detection (UA rotation, rate limiting, jitter)
- **Services Layer**: Pure business logic via dependency injection (10+ stateless services)
- **Client Adapters**: Platform-specific integrations (Wanted, JobKorea, Saramin, LinkedIn, Remember)
- **MCP Tools**: 9 tools exposing 30+ actions to Claude AI
- **Server Routes**: 13 Fastify routes for Worker/API integration
- **Worker Layer**: Cloudflare Worker with D1 database, KV cache, R2 storage, 8 Workflows

---

## STRUCTURE

```
job-automation/
├── src/
│   ├── index.js                 # MCP server entry (Fastify + MCP tools)
│   ├── server/routes/           # 13 Fastify route modules
│   ├── crawlers/                # BaseCrawler + 5 platform implementations
│   │   └── base-crawler.js      # HTTP fetch base (UA rotation, delay+jitter, 3 retries)
│   ├── auto-apply/              # AutoApplier, ApplicationManager
│   ├── shared/
│   │   ├── services/            # 10 stateless services (DI pattern)
│   │   │   ├── apply/           # UnifiedApplySystem, ApplyOrchestrator
│   │   │   ├── session/         # SessionManager (24h TTL, per-platform isolation)
│   │   │   ├── matching/        # JobMatcher (2-tier scoring: 60/75 thresholds)
│   │   │   └── slack/           # SlackService (webhook notifications)
│   │   ├── clients/             # 5 adapters (Wanted, JobKorea, Saramin, LinkedIn, Remember)
│   │   │   └── wanted/          # Wanted.co.kr API (40+ methods across 6 domain files)
│   │   ├── contracts/           # API/auth/session schemas
│   │   ├── utils/paths.js       # getResumeBasePath (no hardcoded paths)
│   │   └── validation/          # Input validators
│   └── tools/                   # 9 MCP tool implementations
├── workers/                     # Dashboard Cloudflare Worker
│   ├── src/
│   │   ├── index.js             # Worker entry (strips /job prefix, routes /api/*)
│   │   ├── handlers/            # 10+ API route handlers (class-based pattern)
│   │   └── workflows/           # 8 Cloudflare Workflows (cron-triggered)
│   └── wrangler.toml            # Worker config + D1/KV/R2 bindings
├── scripts/                     # 25 utility scripts (auth, session, monitoring)
│   ├── extract-cookies-cdp.js   # ⭐ CDP extraction (recommended)
│   ├── auth-sync.js             # ⭐ Multi-platform auth sync
│   ├── profile-sync/             # ⭐ Sync resume_data.json to platforms (8 modules)
│   ├── auto-all.js              # ⭐ Full automation pipeline
│   ├── quick-login.js           # ⚠️ Legacy Puppeteer login
│   └── 20 legacy scripts        # Old auth/extraction variants
├── platforms/                   # Platform-specific configs
└── docs/                        # Internal documentation
```

---

## ENTRY POINTS

| Component   | Entry                            | Purpose                                 |
| ----------- | -------------------------------- | --------------------------------------- |
| MCP Server  | `src/index.js`                   | Fastify HTTP + MCP tools (9 tools)      |
| Worker      | `workers/src/index.js`           | Dashboard (resume.jclee.me/job/\*)      |
| Auth        | `scripts/extract-cookies-cdp.js` | Session cookie extraction (recommended) |
| Orchestrate | `scripts/auto-all.js`            | Full automation pipeline                |

---

## WHERE TO LOOK

| Task                 | Location               | Notes                                             |
| -------------------- | ---------------------- | ------------------------------------------------- |
| Add Fastify route    | `src/server/routes/`   | Pattern: `export default async function(fastify)` |
| Add crawler          | `src/crawlers/`        | Extend `BaseCrawler` (UA rotation, delay+jitter)  |
| Add business logic   | `src/shared/services/` | Pure, stateless, DI-friendly                      |
| Add external adapter | `src/shared/clients/`  | Isolated per client (no cross-imports)            |
| Add MCP tool         | `src/tools/`           | Follow existing tool structure (9 patterns)       |
| Modify Worker        | `workers/src/`         | D1/KV/R2 bindings available, 8 workflows          |
| Configure scripts    | `scripts/`             | See SCRIPTS_GUIDE.md for all 25 scripts           |

---

## CODE MAP

| Class/Module         | Location                                | Purpose                          |
| -------------------- | --------------------------------------- | -------------------------------- |
| `BaseCrawler`        | `src/crawlers/base-crawler.js`          | HTTP fetch (UA rotation, delay)  |
| `UnifiedApplySystem` | `src/shared/services/apply/`            | Centralized job application      |
| `SessionManager`     | `src/shared/services/session/`          | Cookie persistence (24h TTL)     |
| `JobMatcher`         | `src/shared/services/matching/`         | 2-tier scoring (60/75 threshold) |
| `WantedClient`       | `src/shared/clients/wanted/`            | Wanted API (40+ methods)         |
| `AutoApplier`        | `src/auto-apply/auto-applier.js`        | Playwright form submission       |
| `ApplicationManager` | `src/auto-apply/application-manager.js` | Application status tracking      |
| `getResumeBasePath`  | `src/shared/utils/paths.js`             | Portable path resolution         |

---

## CRAWLERS ARCHITECTURE

### BaseCrawler (Core HTTP Layer)

**Location**: `src/crawlers/base-crawler.js` (130+ lines)

**Features**:

- **UA Rotation**: 12 Chrome versions (v120-v131) randomized per request
- **Rate Limiting**: 1s minimum delay + 0-500ms jitter
- **Retry Strategy**: 3 attempts with exponential backoff (2s, 4s, 8s)
- **Request Timeout**: 30s per request
- **Header Management**: Realistic browser headers, cookie injection
- **Session Support**: Cookie persistence via SessionManager

**Usage**:

```javascript
const crawler = new BaseCrawler(sessionManager);
const html = await crawler.fetch('https://api.wanted.co.kr/v4/jobs', {
  headers: { Accept: 'application/json' },
  cookies: sessionManager.getCookies('wanted'),
  method: 'POST',
  body: JSON.stringify({ ...params }),
});
```

### Platform Crawlers (Specialized)

| Platform     | Type          | Tech                   | Status       | Notes                                    |
| ------------ | ------------- | ---------------------- | ------------ | ---------------------------------------- |
| **Wanted**   | API-only      | Fetch API + JSON       | ✅ Active    | BaseCrawler sufficient                   |
| **JobKorea** | Browser-based | Puppeteer (no stealth) | ⚠️ Bot-prone | Needs `puppeteer-extra` + stealth        |
| **Saramin**  | Browser-based | Puppeteer (no stealth) | ⚠️ Bot-prone | Needs `puppeteer-extra` + stealth        |
| **LinkedIn** | Web scraping  | Fetch + regex          | ⚠️ Fragile   | HTML parsing fragile, Easy Apply support |
| **Remember** | Browser-based | Puppeteer (no stealth) | ⚠️ Bot-prone | Needs `puppeteer-extra` + stealth        |

**Anti-Detection Patterns**:

- **UA Rotation**: Randomize on each request (not cached)
- **Request Delay**: Minimum 1000ms + 0-500ms jitter between requests
- **Exponential Backoff**: 2s → 4s → 8s → fail
- **Headers Fidelity**: Real browser headers (Accept-Language, Referer, etc.)
- **Stealth Plugins**: `puppeteer-extra-plugin-stealth` for browser-based crawlers

---

## SHARED SERVICES ARCHITECTURE

### Service Layer Overview

**Location**: `src/shared/services/` (10+ services)

**Architecture Pattern**: Hexagonal with Dependency Injection

- Services are **pure, stateless** - no local state
- Dependencies injected via constructor
- SessionManager handles all state persistence
- Error handling: domain-specific error classes

### Core Services

| Service              | Location                        | Purpose                                | Stateless |
| -------------------- | ------------------------------- | -------------------------------------- | --------- |
| `UnifiedApplySystem` | `src/shared/services/apply/`    | Orchestrate multi-job application flow | ✅ Yes    |
| `SessionManager`     | `src/shared/services/session/`  | Persistent cookie storage (24h TTL)    | ✅ Yes    |
| `JobMatcher`         | `src/shared/services/matching/` | 2-tier job scoring system              | ✅ Yes    |
| `SlackService`       | `src/shared/services/slack/`    | Webhook-based notifications            | ✅ Yes    |
| `LoggerService`      | `src/shared/services/`          | ECS-format structured logging          | ✅ Yes    |

### JobMatcher (2-Tier Scoring System)

**Thresholds**:

- **< 60**: Skip job (auto-skip)
- **60-74**: REVIEW (show to user)
- **≥ 75**: AUTO_APPLY (submit automatically)

**Tier 1 (Fast, Local)**:

- Keyword matching against job title/description
- Experience level compatibility
- Company size/industry match
- Location preferences

**Tier 2 (AI-Based)**:

- Claude semantic analysis (if score 60-74)
- Natural language understanding
- Context-aware skill matching
- Industry expertise evaluation

---

## CLIENT ADAPTERS ARCHITECTURE

### Isolation Pattern

**Location**: `src/shared/clients/` (5 isolated client adapters)

**Design Principles**:

- Each client is **completely isolated** (no cross-imports)
- No shared code between clients (per platform differences)
- Clients expose consistent interface for services
- Error handling: platform-specific retry logic

### Wanted Client (WantedClient)

**Location**: `src/shared/clients/wanted/` (500+ lines across 6 files)

**Organization**:

```
wanted/
├── index.js           # Main export + DI setup
├── search.js          # Job search (40+ methods)
├── profile.js         # Profile management (SNS API)
├── resume.js          # Resume management (Chaos API v1/v2)
├── auth.js            # Authentication + session
└── utils.js           # Helpers (URL building, response parsing)
```

**API Methods**: 40+ across Wanted v4, SNS API, Chaos API:

- **Search**: Jobs, skills, companies, categories
- **Profile**: Email, phone, headline, introduction
- **Resume**: Create, read, update (careers, educations, skills, activities, language_certs)
- **Session**: Login, logout, cookie persistence (24h TTL)

---

## MCP TOOLS ARCHITECTURE

### Tool Structure

**Location**: `src/tools/` (9 tools, 30+ actions total)

**Tool Pattern**:

```javascript
export default {
  name: 'tool-name',
  description: 'Human-readable description',
  inputSchema: {
    type: 'object',
    properties: {
      /* JSDoc input params */
    },
    required: ['required_param'],
  },
  async handle(request, { sessionManager, wantedClient, logger }) {
    // Pure function - no side effects except logging
    // Validate input → Call service/client → Format response
    // Throw DomainError on business logic failures
  },
};
```

### Tool Catalog

| Tool             | Actions | Auth   | Purpose                                |
| ---------------- | ------- | ------ | -------------------------------------- |
| `search-jobs`    | 1       | ❌ No  | Search by category/keyword/filters     |
| `search-keyword` | 1       | ❌ No  | Keyword search (companies, skills)     |
| `get-job-detail` | 1       | ❌ No  | Fetch job posting detail               |
| `get-categories` | 1       | ❌ No  | List job categories for filtering      |
| `get-company`    | 1       | ❌ No  | Company info + open positions          |
| `auth`           | 3       | ✅ Yes | Login/logout/status                    |
| `profile`        | 4       | ✅ Yes | View/update headline, email, phone     |
| `resume`         | 20      | ✅ Yes | Resume CRUD (careers, skills, etc.)    |
| `resume-sync`    | 12      | ✅ Yes | Automation pipeline (export/sync/diff) |

**Total**: 11 public + 20 auth-required = **31 actions**

---

## SERVER ROUTES ARCHITECTURE

### Fastify Route Organization

**Location**: `src/server/routes/` (13+ modules)

**Route Pattern**:

```javascript
// Pattern: named export + async function
export default async function autoApplyRoute(fastify) {
  fastify.post('/auto-apply', async (request, reply) => {
    // 1. Validate auth
    // 2. Call service (via DI)
    // 3. Return response
  });
}
```

### Route Catalog

| Route               | Method  | Purpose                      | Auth      |
| ------------------- | ------- | ---------------------------- | --------- |
| `/api/auto-apply`   | POST    | Trigger job auto-application | ✅ Token  |
| `/api/applications` | GET     | List user applications       | ✅ Token  |
| `/api/stats`        | GET     | Application statistics       | ✅ Token  |
| `/api/profile`      | GET/PUT | View/update profile          | ✅ Token  |
| `/api/resume`       | GET/PUT | Resume management            | ✅ Token  |
| `/api/search`       | GET     | Job search                   | ❌ No     |
| `/api/health`       | GET     | Service health               | ❌ No     |
| `/api/metrics`      | GET     | Prometheus metrics           | ❌ No     |
| `/api/sync-auth`    | POST    | Distribute cookies to Worker | ✅ Secret |
| `/api/sync-profile` | POST    | Sync profile to platforms    | ✅ Secret |
| `/*`                | ALL     | 404 + CORS                   | ❌ No     |

**Middleware Stack**:

- **Error Handler**: Catch all errors, format response, log (no credentials)
- **CSRF Protection**: Verify request token
- **Rate Limiting**: Token bucket algorithm (60 req/min per IP)
- **Logger**: ECS-format request/response logging
- **Auth**: Bearer token validation

---

## DATA FLOW ARCHITECTURE

### MCP Request → Response Cycle

**Complete Request Path**:

```
User (Claude): "Find iOS jobs and apply to top matches"
         ↓
    MCP Tool Call (search-jobs + auto-apply)
         ↓
Fastify Route Handler (/api/search + /api/auto-apply)
         ↓
Service Orchestration (DI Container)
    - WantedClient.search()
    - JobMatcher.scoreJobs()
    - UnifiedApplySystem.applyToAll()
         ↓
Crawler Execution (BaseCrawler.fetch)
    - Randomize UA
    - Inject session cookies
    - Add 1s + 0-500ms jitter
    - Retry 3x with exponential backoff
         ↓
External API (Wanted, JobKorea, etc.)
         ↓
Response Processing
    - Parse JSON/HTML
    - Format standardized response
    - Log metrics (response time, match score)
         ↓
MCP Response → Claude
```

**Detailed Service Orchestration**:

1. **Search Phase** (500-800ms): Fetch jobs from Wanted API via BaseCrawler
2. **Score Phase** (50-100ms Tier1 + 2-5s Tier2): JobMatcher evaluates each job
3. **Apply Phase** (10-20s per job): AutoApplier submits forms via Playwright
4. **Notify Phase** (async): SlackService posts results to webhook

### Session Lifecycle

```
1. Extract Cookies (auth-sync.js)
   - Puppeteer-extra + stealth plugins login
   - Extract auth cookies
   - Store in ~/.opencode/data/sessions.json (24h TTL)

2. Inject into Requests
   - SessionManager.load() checks TTL
   - Cookies added to fetch headers
   - Per-platform isolation (wanted ≠ jobkorea)

3. Sync to Worker (sync-auth endpoint)
   - POST cookies to Worker
   - Worker stores in KV (24h TTL)
   - Accessible to browser handlers

4. Expiration
   - After 24h: SessionManager warns
   - Request fresh extraction
   - Fallback to quick-login.js (slower)
```

---

## ANTI-DETECTION PATTERNS

### HTTP-Level Techniques

1. **User-Agent Rotation**: 12 Chrome versions randomized per request
2. **Request Delay**: 1000ms + 0-500ms jitter (prevents fingerprinting)
3. **Exponential Backoff**: 2s → 4s → 8s → fail (respects rate limits)
4. **Header Realism**: Accept-Language, Referer, Cache-Control (real browser)
5. **Cookie Persistence**: Session-based (24h TTL per platform)

### Browser-Level Techniques

- **Puppeteer-Extra**: Stealth plugins for browser-based crawlers
- **Chrome DevTools Protocol**: Direct extraction (no browser overhead)
- **Headless Detection Evasion**: Disable automation flags
- **Fingerprint Spoofing**: Random viewport size, timezone, language

### CloudFront WAF Bypass

Wanted blocks headless browsers:

- **Current**: `puppeteer-extra` + stealth plugins (works but slow)
- **Recommended**: Manual cookie extraction via Chrome DevTools Protocol
- **Fallback**: `extract-cookies-cdp.js` (fast, reliable, no bot detection)

---

## ANTI-PATTERNS

| Anti-Pattern                   | Why                | Do Instead                               |
| ------------------------------ | ------------------ | ---------------------------------------- |
| Naked Playwright/Puppeteer     | Bot detection      | Use `puppeteer-extra` + stealth          |
| Fixed UA strings               | Fingerprinting     | BaseCrawler randomizes per request       |
| Aggressive polling             | Rate limits/bans   | Use jitter + exponential backoff         |
| Skills v2 API                  | Server bugs        | Use Skills v1 with `text` field          |
| Links API                      | 500 errors         | Skip until fixed                         |
| Direct state in services       | Testing nightmare  | Use SessionManager/DI                    |
| Cross-client imports           | Circular deps      | Each client isolated                     |
| Hardcoded credentials          | Security           | Use `.env` or `wrangler secret`          |
| Hardcoded `~/dev/resume` paths | Breaks portability | Use `getResumeBasePath()`                |
| Duplicate workers/job code     | Code drift         | Single source in workers/, copy on build |

---

## PLATFORM CRAWLERS

| Platform | Tech              | Status       | Recommendation                  |
| -------- | ----------------- | ------------ | ------------------------------- |
| Wanted   | Fetch API (JSON)  | ✅ Works     | Use API directly (no browser)   |
| JobKorea | Puppeteer (naked) | ⚠️ Bot-prone | Add `puppeteer-extra` + stealth |
| Saramin  | Puppeteer (naked) | ⚠️ Bot-prone | Add `puppeteer-extra` + stealth |
| LinkedIn | Fetch + regex     | ⚠️ Fragile   | Fragile HTML parsing            |
| Remember | Puppeteer (naked) | ⚠️ Bot-prone | Add `puppeteer-extra` + stealth |

---

## API NOTES (CRITICAL)

| API          | Status  | Notes                                           |
| ------------ | ------- | ----------------------------------------------- |
| Skills v1    | WORKING | Use `text` field only, v2 has bugs              |
| Skills v2    | BROKEN  | Server error when toggling highlights           |
| Links API    | BROKEN  | 500 error on update                             |
| SNS API      | WORKING | Profile data (email, phone, headline)           |
| Chaos API v1 | WORKING | Skills CRUD                                     |
| Chaos API v2 | WORKING | Careers, educations, activities, language_certs |

---

## CLOUDFLARE WORKFLOWS

| Workflow            | File            | Schedule       | Purpose                     |
| ------------------- | --------------- | -------------- | --------------------------- |
| HealthCheckWorkflow | health-check.js | _/5 _ \* \* \* | 5-min uptime + Slack alerts |
| BackupWorkflow      | backup.js       | 0 3 \* \* \*   | Daily D1→KV backup          |
| CleanupWorkflow     | cleanup.js      | 0 4 \* \* 0    | Weekly cleanup              |
| DailyReportWorkflow | daily-report.js | 0 9 \* \* \*   | Daily application stats     |
| AuthRefreshWorkflow | auth-refresh.js | 0 0 \* \* 1-5  | Monday-Friday auth refresh  |
| ProfileSyncWorkflow | profile-sync.js | 0 2 \* \* 1    | Weekly Monday profile sync  |
| ResumeSyncWorkflow  | resume-sync.js  | 0 1 \* \* \*   | Daily resume sync           |
| CacheWarmupWorkflow | cache-warmup.js | 0 6 \* \* \*   | Pre-warm job cache          |

---

## SCRIPTS GUIDE

**Location**: `SCRIPTS_GUIDE.md` (detailed documentation of all 25 scripts)

### Recommended Scripts

| Script                   | Status    | Type        | Purpose                            |
| ------------------------ | --------- | ----------- | ---------------------------------- |
| `extract-cookies-cdp.js` | ✅ Active | Auth        | Fast CDP cookie extraction         |
| `auth-sync.js`           | ✅ Active | Auth        | Multi-platform auth sync           |
| `auth-persistent.js`     | ✅ Active | Auth        | Long-running persistent auth       |
| `profile-sync.js`        | ✅ Active | Sync        | Sync resume_data.json to platforms |
| `auto-all.js`            | ✅ Active | Orchestrate | Full automation pipeline           |
| `skill-tag-map.js`       | ✅ Active | Utility     | SSOT skill mapping                 |
| `metrics-exporter.js`    | ✅ Active | Monitor     | Prometheus metrics export          |

### Legacy Scripts (Do Not Use)

- `quick-login.js` - Slow Puppeteer login (use `extract-cookies-cdp.js`)
- `direct-login*.js` (v1-v4) - Iterations, superseded by `auth-sync.js`
- `extract-cookies*.js` - Various slow extraction methods
- 15+ debug and experimental scripts

---

## WORKER BINDINGS

| Binding         | Type | Name            | Purpose                       |
| --------------- | ---- | --------------- | ----------------------------- |
| `DB`            | D1   | job_dashboard   | Application tracking database |
| `SESSIONS`      | KV   | JOB_CACHE       | Session + job cache (1h TTL)  |
| `RATE_LIMIT_KV` | KV   | JOB_RATE_LIMIT  | Request rate limiting         |
| `SCREENSHOTS`   | R2   | job-screenshots | Screenshot storage            |

---

## CONVENTIONS

- **Hexagonal Arch**: Business logic in `services/`, adapters in `clients/`
- **DI Pattern**: Services receive dependencies via constructor (no singletons)
- **Stateless**: Services don't store state; use SessionManager for persistence
- **Typed Errors**: Domain-specific error classes (not generic Error)
- **Route Pattern**: `export default async function(fastify) { ... }`
- **Tool Pattern**: Named export with handle function (MCP tool contract)
- **Naming**: camelCase (properties/methods), PascalCase (classes)
- **Session Storage**: `~/.opencode/data/sessions.json` (24h TTL per platform)
- **Logging**: ECS format (no credentials ever logged)

---

## DOCUMENTATION

| File                    | Purpose                            | Audience                |
| ----------------------- | ---------------------------------- | ----------------------- |
| `ARCHITECTURE.md`       | Internal structure + patterns      | Developers              |
| `ANTI_DETECTION.md`     | Security + stealth techniques      | Security-conscious devs |
| `DATA_FLOW.md`          | Request/response cycles + diagrams | Architects              |
| `SCRIPTS_GUIDE.md`      | All 25 scripts with examples       | DevOps/Operators        |
| `AGENTS.md` (this file) | Quick reference + entry points     | All agents              |

---

## COMMANDS

```bash
# MCP Server
cd typescript/job-automation
npm run dev              # Start dev server
npm run start            # Production server
npm test                 # Run tests

# Worker
cd workers
wrangler deploy          # Deploy to Cloudflare
wrangler d1 execute JOB_AUTOMATION_DB --file=migrations/*.sql

# Authentication
node scripts/extract-cookies-cdp.js    # Get cookies (recommended)
node scripts/auth-sync.js              # Multi-platform sync
node scripts/auth-persistent.js        # Long-running auth

# Automation
node scripts/auto-all.js --all         # Full pipeline
node scripts/profile-sync/index.js --apply   # Sync resume to platforms

# Monitoring
node scripts/metrics-exporter.js       # Export Prometheus metrics
curl http://localhost:9090/metrics     # Scrape metrics
```

---

## REFACTORING CANDIDATES

| File                   | Lines   | Issue            | Recommended Fix                              |
| ---------------------- | ------- | ---------------- | -------------------------------------------- |
| ~~`profile-sync.js`~~  | ~~966~~ | ✅ Refactored    | Split to `scripts/profile-sync/` (8 modules) |
| `resume.js` (MCP tool) | 869     | 23 switch cases  | Command pattern                              |
| ~~`cli.js`~~           | ~~672~~ | ✅ Refactored    | Split to `auto-apply/cli/` (6 modules)       |
| `worker-api-routes.js` | 566     | 10 mixed routes  | Split csp.js/metrics.js/vitals.js            |
| `generate-worker.js`   | 1041    | Monolithic build | Extract CSP/routing modules                  |

---

## CRITICAL NOTES FOR AGENTS

1. **Session Management**: Always check SessionManager for cookies before API calls
2. **Error Handling**: Use domain-specific error classes (not generic Error)
3. **Logging**: Never log credentials, use ECS format with field sanitization
4. **Rate Limiting**: BaseCrawler handles delays + jitter automatically
5. **Stateless Services**: Never cache state in service instances
6. **API Constraints**: Skills v1 only, Links API broken, use SNS API for profile
7. **Anti-Detection**: UA rotation automatic in BaseCrawler, add jitter to polling
8. **Worker Access**: D1/KV/R2 bindings via `env` parameter in handlers
