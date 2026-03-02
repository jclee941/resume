# Job Automation - Internal Architecture Guide

**Last Updated**: 2026-02-11  
**Status**: Comprehensive architecture mapping for developers  
**Purpose**: Document internal patterns, anti-detection techniques, and service organization

## CRAWLERS ARCHITECTURE

### BaseCrawler (HTTP-Only, No Browser)

**Location**: `src/crawlers/base-crawler.js` (130+ lines)

**Design**: Event-driven HTTP client with stealth anti-detection patterns:

| Feature                | Implementation                          |
| ---------------------- | --------------------------------------- |
| **UA Rotation**        | 12 randomized Chrome versions (v128-131) per request |
| **Request Delay**      | 1s minimum between requests              |
| **Jitter**             | Random 0-500ms added to delays           |
| **Retry Logic**        | 3 retries with exponential backoff (2s, 4s, 8s) |
| **Timeout**            | 30s per request                         |
| **Headers**            | Accept-Language: ko-KR, Accept: JSON/HTML |
| **Cookie Handling**    | Automatic via SessionManager            |
| **Event System**       | `retry`, `rateLimit`, `timeout` events  |

**Pattern**: Static methods for stateless HTTP operations

### Platform Crawlers

| Platform | File                    | Tech              | Notes                                      |
| -------- | ----------------------- | ----------------- | ------------------------------------------ |
| Wanted   | `wanted-crawler.js`     | Fetch API (HTTP)  | API-only, no browser needed, BaseCrawler  |
| JobKorea | `jobkorea-crawler.js`   | Puppeteer         | Uses puppeteer-extra + stealth plugins    |
| Saramin  | `saramin-crawler.js`    | Puppeteer         | Uses puppeteer-extra + stealth plugins    |
| LinkedIn | `linkedin-crawler.js`   | Fetch + regex     | Fragile HTML scraping (subject to changes) |
| Remember | `remember-crawler.js`   | Puppeteer         | Uses puppeteer-extra + stealth plugins    |

**Key Constraint**: NO Puppeteer/Playwright in `crawlers/` directory. Browser automation isolated in `src/auto-apply/` (only for form submission, not job search).

## SHARED SERVICES ARCHITECTURE

### DI Pattern + Stateless Design

All services use constructor-based dependency injection and store no instance state. SessionManager provides the only stateful component (cookie persistence).

| Service                | File                             | Lines | Pattern                           |
| ---------------------- | -------------------------------- | ----- | --------------------------------- |
| `UnifiedApplySystem`   | `src/shared/services/apply/`     | 150+  | Search → filter → apply pipeline  |
| `SessionManager`       | `src/shared/services/session/`   | 80+   | Static methods, 24h TTL          |
| `JobMatcher`           | `src/shared/services/matching/`  | 120+  | 2-tier scoring (60/75 thresholds) |
| `JobFilter`            | `src/shared/services/filter/`    | 90+   | Experience, location, salary      |
| `SlackService`         | `src/shared/services/slack/`     | 60+   | Failure notifications             |
| `SkillAnalyzer`        | `src/shared/services/skills/`    | 100+  | Candidate ↔ job skill matching    |
| `ErrorService`         | `src/shared/services/error/`     | 70+   | Domain-specific error handling    |
| `LogService`           | `src/shared/services/logging/`   | 60+   | ECS-format structured logging     |
| `AuthService`          | `src/shared/services/auth/`      | 80+   | Token validation, cookie refresh  |
| `CacheService`         | `src/shared/services/cache/`     | 50+   | Job/company data caching          |

### JobMatcher 2-Tier Scoring System

**Thresholds**:
- < 60: Skip (low_score)
- 60-74: Manual review (review)
- >= 75: Auto-apply (auto_apply)

**Pattern**: Static methods for scoring operations

### SessionManager Storage

**Location**: `~/.opencode/data/sessions.json`

**Structure**: Per-platform isolated cookies with 24h TTL

**Pattern**: Static methods only (no instances)

## CLIENT ADAPTERS ARCHITECTURE

### Isolation Principle

Each client is self-contained in its own directory. **No cross-client imports**. This prevents circular dependencies and keeps business logic independent from specific platform implementations.

| Client    | Location                      | Lines | Methods | API Version |
| --------- | ----------------------------- | ----- | ------- | ----------- |
| Wanted    | `src/shared/clients/wanted/`  | 500+  | 40+     | v4/v2/v1    |
| JobKorea  | `src/shared/clients/jobkorea/` | 300+ | 25+     | Custom      |
| Saramin   | `src/shared/clients/saramin/`  | 280+  | 20+     | Custom      |
| LinkedIn  | `src/shared/clients/linkedin/` | 220+  | 15+     | HTML scrape |
| Remember  | `src/shared/clients/remember/` | 240+  | 18+     | Custom      |

### Wanted API Client (40+ methods)

**Location**: `src/shared/clients/wanted/`

**Endpoint Organization** (separate files per domain):

| File                | Methods | Purpose                              |
| ------------------- | ------- | ------------------------------------ |
| `jobs.js`           | 8+      | Search, filter, detail endpoints     |
| `resume.js`         | 12+     | Career, education, skill CRUD        |
| `profile.js`        | 5+      | Profile data, headline, introduction |
| `auth.js`           | 3+      | Cookie validation, token refresh     |
| `applications.js`   | 7+      | Application history, recommendations |
| `companies.js`      | 5+      | Company info, ratings                |

## MCP TOOLS ARCHITECTURE

### Standard MCP Format

All tools follow the MCP tool contract with name, description, inputSchema, and async handle function.

### MCP Tools Catalog (11 Public + Auth-Required)

| Tool                    | File                   | Type     | Actions | Purpose                        |
| ----------------------- | ---------------------- | -------- | ------- | ------------------------------ |
| `wanted_search_jobs`    | `src/tools/search-jobs.js`       | Public   | 1       | Category-based job search      |
| `wanted_search_keyword` | `src/tools/search-keyword.js`    | Public   | 1       | Keyword-based job search       |
| `wanted_get_job_detail` | `src/tools/get-job-detail.js`    | Public   | 1       | Fetch job details              |
| `wanted_get_categories` | `src/tools/get-categories.js`    | Public   | 1       | List job categories            |
| `wanted_get_company`    | `src/tools/get-company.js`       | Public   | 1       | Company info + open jobs       |
| `wanted_auth`           | `src/tools/auth.js`              | Auth-req | 3       | Cookie/token management       |
| `wanted_profile`        | `src/tools/profile.js`           | Auth-req | 2       | Profile view, bookmarks, apps  |
| `wanted_resume`         | `src/tools/resume.js`            | Auth-req | 20      | Resume CRUD operations         |
| `wanted_resume_sync`    | `src/tools/resume-sync.js`       | Auth-req | 12      | Export, diff, sync, pipeline   |

### Command Pattern in Tools

Resume sync tool uses explicit command pattern for sub-actions:

```
action: 'export'    → Export resume to JSON
action: 'diff'      → Compare local vs remote
action: 'sync'      → Apply local changes to remote
action: 'import'    → Load from JSON file
action: 'sync_careers'  → Update only careers
action: 'sync_skills'   → Update only skills
action: 'sync_educations' → Update only education
action: 'pipeline_status' → Check automation status
action: 'pipeline_run'    → Execute full pipeline
action: 'pipeline_schedule' → Schedule via n8n
```

## SERVER ROUTES ARCHITECTURE

### Route Organization (13+ routes)

| Route File                | Endpoint           | Purpose                           |
| ------------------------- | ------------------ | --------------------------------- |
| `auto-apply-status.js`    | `/auto-apply`      | Check auto-apply status          |
| `auto-apply-run.js`       | `/auto-apply/run`  | Trigger auto-apply pipeline      |
| `stats.js`                | `/stats`           | Application statistics           |
| `profile.js`              | `/profile`         | User profile data                |
| `health.js`               | `/health`          | Service health check             |
| `search.js`               | `/search`          | Job search with filters          |
| `applications.js`         | `/applications`    | Application list/detail          |
| `dashboard.js`            | `/dashboard`       | Dashboard data aggregation       |
| `resume.js`               | `/resume`          | Resume operations                |
| `auth.js`                 | `/auth`            | Authentication endpoints         |
| `webhooks.js`             | `/webhooks`        | n8n webhook receiver             |
| `export.js`               | `/export`          | Data export (JSON, CSV)          |
| `sync.js`                 | `/sync`            | Manual sync trigger              |

### Middleware Stack

| Middleware         | File                | Purpose                      |
| ------------------ | ------------------- | ---------------------------- |
| Error Handler      | `middleware/error-handler.js`    | Global exception catch      |
| CSRF Protection    | `middleware/csrf.js`             | Token validation            |
| Rate Limiting      | `middleware/rate-limit.js`       | 10 req/sec per IP           |
| Request Logger     | `middleware/logger.js`           | ECS-format request logging  |
| Auth Check         | `middleware/auth.js`             | Session validation          |

## DATA FLOW ARCHITECTURE

### Request → Response Cycle

```
User (OpenCode) → MCP Tool Request
  ↓
MCP Server (index.js) → Route matching
  ↓
Fastify Route Handler → Dependency injection
  ↓
Business Service (e.g., UnifiedApplySystem)
  ↓
Client Adapter (e.g., WantedAPI) → SessionManager (cookies)
  ↓
BaseCrawler (HTTP fetch with UA rotation, jitter, retries)
  ↓
Wanted Server → Response (JSON)
  ↓
Service processing (JobMatcher scoring, filtering)
  ↓
MCP Tool response → Claude context
```

## ANTI-DETECTION PATTERNS (HTTP-LEVEL)

### UA Rotation (12 Chrome Versions)

Implements 12 randomized Chrome versions from v128-v131. Selected randomly per request to reduce fingerprinting.

### Request Delay + Jitter

1 second minimum delay + random 0-500ms jitter between requests.

### Exponential Backoff on Retry

Retry delays: 2s, 4s, 8s (doubles each attempt) for rate limiting/timeouts.

### Cookie Persistence

24-hour TTL with per-platform isolation. Manual extraction required for CloudFront WAF bypass.

## REFACTORING CANDIDATES

| File                 | Lines | Issue                          | Recommended Fix                      |
| -------------------- | ----- | ------------------------------ | ------------------------------------ |
| `wanted-api.js`      | 500+  | Monolithic client              | Split by domain (jobs, resume, etc)  |
| `unified-apply-system.js` | 150+ | Complex pipeline logic         | Extract phases into separate classes |
| `auto-applier.js`    | 200+  | Monolithic Playwright control  | Extract form submission strategies   |
| `job-matcher.js`     | 120+  | Tight coupling to scoring rules | Strategy pattern for score algorithms |
| `dashboard/server.js` | 300+ | Mixed routing + business logic | Extract handlers to separate files  |
