# JOB DASHBOARD WORKER

**Generated:** 2026-02-16
**Commit:** 6d59e14
**Branch:** master

## OVERVIEW

Cloudflare Worker serving the job automation dashboard at `resume.jclee.me/job/*`.
Strips `/job` prefix internally so handlers use root-relative paths.

## STRUCTURE

### Directory Organization

```
workers/
├── src/
│   ├── index.js            # Worker entry point (fetch handler + workflow exports)
│   ├── handlers/            # API route handlers (13 class-based handlers)
│   │   ├── BaseHandler.js   # Base class (validateRequest, validateAuth)
│   │   ├── ApplicationsHandler.js  # CRUD: list, create, get, update, delete, updateStatus, cleanupExpired
│   │   ├── StatsHandler.js  # Stats: getStats, getWeeklyStats, getDailyReport, getWeeklyReport
│   │   ├── AuthHandler.js   # Auth: getStatus, setAuth, syncFromScript, clearAuth, getProfile
│   │   ├── WebhookHandler.js # Webhooks: Slack, automation, sync callbacks
│   │   ├── AutoApplyHandler.js # Auto-apply: status, run, configure
│   │   ├── HealthHandler.js # Health: checks
│   │   ├── ConfigHandler.js # Config: management
│   │   ├── WorkflowHandler.js # Workflows: triggers
│   │   ├── CleanupHandler.js # Cleanup: operations
│   │   └── [other handlers] # Additional handlers as discovered
│   ├── utils/               # Shared utilities
│   │   ├── crypto.js        # Encryption/decryption helpers
│   │   ├── validators.js    # Input validation
│   │   ├── logger.js        # ECS-format logging
│   │   └── errors.js        # Domain-specific error classes
│   ├── middleware/          # Request middleware stack
│   │   ├── rate-limit.js    # Token bucket rate limiting (60 req/min)
│   │   ├── cors.js          # CORS headers + origin validation
│   │   ├── csrf.js          # CSRF protection (double-submit cookies)
│   │   ├── auth.js          # Bearer token validation
│   │   └── logger.js        # Request/response logging
│   ├── services/            # Domain services (4+ services)
│   │   ├── auth-service.js  # Authentication + session management
│   │   ├── config-service.js # Configuration management
│   │   ├── slack-service.js # Slack webhook notifications
│   │   └── browser-service.js # Browser automation (Durable Objects)
│   ├── views/               # Static assets + templates
│   │   ├── dashboard.html   # Dashboard UI (React app inline)
│   │   ├── styles.css       # Global styles + responsive design
│   │   └── scripts.js       # Dashboard JavaScript
│   └── workflows/           # Cloudflare Workflows (7 total)
│       ├── index.js              # Barrel exports (all workflows)
│       ├── job-crawling.js       # Job crawling pipeline
│       ├── application.js        # Application submission
│       ├── resume-sync.js        # Resume sync (0 1 * * *)
│       ├── resume-sync-helpers.js # Resume sync utilities
│       ├── daily-report.js       # Daily report (0 9 * * *)
│       ├── health-check.js       # Health checks (*/5 * * * *)
│       ├── backup.js             # D1→KV backup (0 3 * * *)
│       └── cleanup.js            # Data cleanup (0 4 * * 0)
├── wrangler.toml             # Worker config, routes, bindings, crons
└── package.json              # Worker dependencies
```

### Handler Classes

**Base Pattern** (`BaseHandler`):

```javascript
export class BaseHandler {
  constructor(db, cache = null, env = null) {
    this.db = db;
    this.cache = cache;
    this.env = env;
  }

  async validateRequest(request) {
    // Input validation + parsing
  }

  async validateAuth(request, requiredRole = null) {
    // Auth check + role validation
  }
}
```

**Handler Catalog** (13 handlers):

| Handler               | Methods                                                         | Purpose                              |
| --------------------- | --------------------------------------------------------------- | ------------------------------------ |
| `ApplicationsHandler` | list, create, get, update, delete, updateStatus, cleanupExpired | CRUD operations for job applications |
| `StatsHandler`        | getStats, getWeeklyStats, getDailyReport, getWeeklyReport       | Application statistics + reporting   |
| `AuthHandler`         | getStatus, setAuth, syncFromScript, clearAuth, getProfile       | Session management + auth flow       |
| `WebhookHandler`      | 10+ methods                                                     | Slack, automation, sync callbacks    |
| `AutoApplyHandler`    | status, run, configure                                          | Auto-apply workflow orchestration    |
| `HealthHandler`       | checks, status, dependencies                                    | Health checks + uptime monitoring    |
| `ConfigHandler`       | get, set, validate                                              | Configuration management             |
| `WorkflowHandler`     | trigger, status, list, getDetail                                | Workflow management + monitoring     |
| `CleanupHandler`      | expiredApplications, oldLogs, purgeCache                        | Data cleanup operations              |

### Cloudflare Workflows (7 Total)

| Workflow              | Schedule       | Steps                               | Purpose                     |
| --------------------- | -------------- | ----------------------------------- | --------------------------- |
| `JobCrawlingWorkflow` | 0 0 \* \* 1-5  | fetch-cookies, search, score, cache | Job search + scoring        |
| `ApplicationWorkflow` | on-demand      | validate, submit, track, notify     | Auto-submit jobs            |
| `ResumeSyncWorkflow`  | 0 1 \* \* \*   | fetch, parse, update-platforms      | Daily sync resume_data.json |
| `DailyReportWorkflow` | 0 9 \* \* \*   | aggregate, generate, send           | Daily stats report          |
| `HealthCheckWorkflow` | _/5 _ \* \* \* | check-db, check-kv, check-r2        | Uptime monitoring           |
| `BackupWorkflow`      | 0 3 \* \* \*   | read-d1, write-kv, verify           | Daily D1→KV backup          |
| `CleanupWorkflow`     | 0 4 \* \* 0    | identify-expired, delete, log       | Weekly cleanup              |

## ENTRY POINTS

| Component | File                   | Notes                                |
| --------- | ---------------------- | ------------------------------------ |
| Worker    | src/index.js           | Fetch handler + re-exports workflows |
| Workflows | src/workflows/index.js | 7 workflow class exports             |
| Config    | wrangler.toml          | Routes, bindings, cron triggers      |

## BINDINGS

| Type | Name            | Purpose                     |
| ---- | --------------- | --------------------------- |
| D1   | job_dashboard   | Job application data, stats |
| KV   | JOB_CACHE       | Cache store, backup target  |
| R2   | job-screenshots | Screenshot storage          |

## API ENDPOINTS

### Health & Status (3)

| Method | Path           | Handler       | Purpose                |
| ------ | -------------- | ------------- | ---------------------- |
| GET    | /job/health    | HealthHandler | Service health (JSON)  |
| GET    | /job/readiness | HealthHandler | Readiness check (deps) |
| GET    | /job/status    | HealthHandler | Status + metrics       |

### Statistics (4)

| Method | Path                  | Handler      | Purpose                 |
| ------ | --------------------- | ------------ | ----------------------- |
| GET    | /job/api/stats        | StatsHandler | Total + by-status stats |
| GET    | /job/api/stats/weekly | StatsHandler | Weekly aggregation      |
| GET    | /job/api/stats/daily  | StatsHandler | Daily breakdown         |
| GET    | /job/api/report       | StatsHandler | HTML daily report       |

### Authentication (7)

| Method | Path                   | Handler     | Purpose                  |
| ------ | ---------------------- | ----------- | ------------------------ |
| POST   | /job/api/auth/login    | AuthHandler | Set cookies/token        |
| POST   | /job/api/auth/logout   | AuthHandler | Clear session            |
| GET    | /job/api/auth/status   | AuthHandler | Check auth + TTL         |
| POST   | /job/api/auth/sync     | AuthHandler | Sync cookies from script |
| POST   | /job/api/auth/validate | AuthHandler | Validate token           |
| POST   | /job/api/auth/refresh  | AuthHandler | Refresh expired          |
| GET    | /job/api/auth/profile  | AuthHandler | Get user profile         |

### Applications CRUD (6)

| Method | Path                             | Handler             | Purpose             |
| ------ | -------------------------------- | ------------------- | ------------------- |
| GET    | /job/api/applications            | ApplicationsHandler | List all + filter   |
| POST   | /job/api/applications            | ApplicationsHandler | Add new application |
| GET    | /job/api/applications/:id        | ApplicationsHandler | Get detail          |
| PUT    | /job/api/applications/:id        | ApplicationsHandler | Update full record  |
| DELETE | /job/api/applications/:id        | ApplicationsHandler | Delete application  |
| PATCH  | /job/api/applications/:id/status | ApplicationsHandler | Update status only  |

### Webhooks & Automation (9)

| Method | Path                             | Handler        | Purpose               |
| ------ | -------------------------------- | -------------- | --------------------- |
| POST   | /job/webhooks/slack              | WebhookHandler | Slack notifications   |
| POST   | /job/webhooks/auto-apply         | WebhookHandler | Auto-apply triggers   |
| POST   | /job/webhooks/sync-start         | WebhookHandler | Sync initiation       |
| POST   | /job/webhooks/sync-complete      | WebhookHandler | Sync completion       |
| POST   | /job/webhooks/job-found          | WebhookHandler | New job found alert   |
| POST   | /job/webhooks/application-status | WebhookHandler | Status change notif   |
| POST   | /job/webhooks/error              | WebhookHandler | Error logging webhook |
| POST   | /job/webhooks/crawl-complete     | WebhookHandler | Crawl completion      |
| POST   | /job/webhooks/daily-report       | WebhookHandler | Report delivery       |

### Auto-Apply (3)

| Method | Path                       | Handler          | Purpose               |
| ------ | -------------------------- | ---------------- | --------------------- |
| GET    | /job/api/auto-apply/status | AutoApplyHandler | Enable/disable status |
| POST   | /job/api/auto-apply/run    | AutoApplyHandler | Trigger run           |
| PUT    | /job/api/auto-apply/config | AutoApplyHandler | Update settings       |

### Workflows (7)

| Method | Path                                  | Handler         | Purpose              |
| ------ | ------------------------------------- | --------------- | -------------------- |
| POST   | /job/api/workflows/job-crawling/run   | WorkflowHandler | Trigger search       |
| POST   | /job/api/workflows/application/run    | WorkflowHandler | Trigger auto-apply   |
| POST   | /job/api/workflows/resume-sync/run    | WorkflowHandler | Trigger sync         |
| POST   | /job/api/workflows/daily-report/run   | WorkflowHandler | Trigger report       |
| POST   | /job/api/workflows/health-check/run   | WorkflowHandler | Trigger check        |
| POST   | /job/api/workflows/backup/run         | WorkflowHandler | Trigger backup       |
| GET    | /job/api/workflows/:instanceId/status | WorkflowHandler | Get execution status |

### Config (2)

| Method | Path            | Handler       | Purpose           |
| ------ | --------------- | ------------- | ----------------- |
| GET    | /job/api/config | ConfigHandler | View all settings |
| PUT    | /job/api/config | ConfigHandler | Update settings   |

### Testing & Cleanup (2)

| Method | Path                     | Handler        | Purpose            |
| ------ | ------------------------ | -------------- | ------------------ |
| POST   | /job/api/test/webhook    | StatsHandler   | Send test webhook  |
| POST   | /job/api/cleanup/expired | CleanupHandler | Delete old records |

**Note:** All paths include `/job` prefix externally. Worker strips prefix before routing.

## D1 DATABASE SCHEMA

### Database: `job_dashboard`

**Table: `applications` (Core tracking)**

```sql
CREATE TABLE applications (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  job_title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  platform TEXT NOT NULL,       -- wanted, jobkorea, linkedin, etc.
  status TEXT NOT NULL,         -- applied, reviewed, rejected, accepted, pending
  match_score INTEGER,
  applied_at TIMESTAMP,
  source TEXT,                  -- manual, auto-apply, api
  metadata JSON,                -- custom fields per platform
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_platform_status (platform, status),
  INDEX idx_created_at (created_at DESC)
);
```

**Table: `job_cache` (Optimization, short TTL)**

```sql
CREATE TABLE job_cache (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL,
  job_id TEXT NOT NULL,
  job_title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  description TEXT,
  url TEXT,
  match_score INTEGER,
  cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  UNIQUE (platform, job_id),
  INDEX idx_expires_at (expires_at)
);
```

**Table: `sync_logs` (Audit trail)**

```sql
CREATE TABLE sync_logs (
  id TEXT PRIMARY KEY,
  sync_type TEXT NOT NULL,     -- resume_sync, profile_sync, job_crawl, etc.
  status TEXT NOT NULL,        -- success, failed, partial
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,
  details JSON,
  workflow_instance_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sync_type_created (sync_type, created_at DESC)
);
```

## KV STRUCTURE

### SESSIONS Namespace

**Pattern**: `session:{platform}`

**Example Key**: `session:wanted`

**Value Schema**:

```json
{
  "cookies": {
    "pSession": "cookie_value",
    "userId": "user_id",
    "csrfToken": "csrf_value"
  },
  "token": "jwt_token_if_applicable",
  "user": {
    "id": "user_id",
    "email": "user@example.com"
  },
  "lastSync": "2026-02-11T06:00:00Z",
  "expiresAt": "2026-02-12T06:24:25Z"
}
```

**TTL**: 24 hours (86400 seconds)

### JOB_RATE_LIMIT Namespace

**Pattern**: `ratelimit:{ip}:{endpoint}`

**Example Key**: `ratelimit:192.168.1.1:/api/applications`

**Value Schema**:

```json
{
  "tokens": 45,
  "lastRefill": 1739327065403,
  "maxTokens": 60,
  "refillRate": 1
}
```

**TTL**: 60 seconds (renewal on each request)

### JOB_CACHE Namespace

**Pattern**: `cache:{platform}:{jobId}`

**Example Key**: `cache:wanted:123456`

**Value Schema**:

```json
{
  "id": "123456",
  "title": "Senior TypeScript Developer",
  "company": "TechCorp",
  "description": "...",
  "url": "https://...",
  "skills": ["typescript", "node.js", "react"],
  "salary": "80000-120000",
  "location": "Seoul",
  "match_score": 85,
  "cachedAt": "2026-02-11T06:00:00Z"
}
```

**TTL**: 1 hour (3600 seconds)

## MIDDLEWARE

### Middleware Stack Order

1. **Request Logger** - Log all incoming requests (ECS format)
2. **CORS Handler** - Validate origin + set CORS headers
3. **Rate Limiter** - Token bucket per IP + endpoint
4. **CSRF Protection** - Double-submit cookie validation
5. **Auth Validator** - Bearer token extraction + validation
6. **Route Handler** - Actual handler execution
7. **Response Logger** - Log response + metrics

### Rate Limiting (60 req/min per IP)

**Implementation**: Token bucket algorithm

**Configuration**:

- Max tokens: 60 per minute
- Refill rate: 1 token per second
- Tracked by: IP + endpoint
- Storage: KV namespace `JOB_RATE_LIMIT`
- TTL: 60 seconds

**Headers**:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1739327125
```

### CORS Configuration

**Allowed Origins**:

- `https://resume.jclee.me`
- `https://grafana.jclee.me`
- `http://localhost:3000` (dev)

**Allowed Methods**: `GET, POST, PUT, PATCH, DELETE, OPTIONS`

**Allowed Headers**: `Content-Type, Authorization, X-CSRF-Token`

### CSRF Protection

**Strategy**: Double-submit cookie

**Implementation**:

1. Generate CSRF token on GET requests
2. Require token in X-CSRF-Token header for state-changing requests
3. Validate token against cookie value
4. Token expires with session (24h TTL)

**Protected Methods**: `POST, PUT, PATCH, DELETE`

## CRON SCHEDULES

| Cron          | UTC           | KST   | Workflow    |
| ------------- | ------------- | ----- | ----------- |
| `*/5 * * * *` | Every 5 min   | -     | HealthCheck |
| `0 0 * * 1-5` | 00:00 Mon-Fri | 09:00 | AuthRefresh |
| `0 1 * * *`   | 01:00 daily   | 10:00 | ResumeSync  |
| `0 2 * * 1`   | 02:00 Monday  | 11:00 | ProfileSync |
| `0 3 * * *`   | 03:00 daily   | 12:00 | Backup      |
| `0 4 * * 0`   | 04:00 Sunday  | 13:00 | Cleanup     |
| `0 6 * * *`   | 06:00 daily   | 15:00 | CacheWarmup |
| `0 9 * * *`   | 09:00 daily   | 18:00 | DailyReport |

## CONVENTIONS

- All workflow classes extend `WorkflowEntrypoint`
- Workflows use `this.env` for bindings access
- Error handling: try/catch with Slack notification on failure
- Backup retention: 7 days (cleanup removes older)
- Handler pattern: Class-based with async methods
- Response format: JSON with error/success status
- Logging: ECS format (no credentials)
- Auth: Bearer token + session-based fallback
- Services: Stateless, dependency-injected
- KV entries: Always set TTL (expirationTtl)

## ANTI-PATTERNS

| Anti-Pattern                   | Why                               | Do Instead               |
| ------------------------------ | --------------------------------- | ------------------------ |
| Edit index.js routing directly | Path stripping logic is sensitive | Test with curl first     |
| Skip workflow error handling   | Silent failures in cron jobs      | Always notify on failure |
| Hardcode API keys              | Security violation                | Use wrangler secret      |
| Duplicate code from shared/    | Drift between copies              | Import from shared/      |
| Set KV without TTL             | Storage bloat + stale data        | Always set expirationTtl |
| Log credentials/tokens         | Privacy + security risk           | Use ECS format sanitized |
| Skip rate limiting             | DoS vulnerability                 | Enforce per IP/endpoint  |

## COMMANDS

```bash
# Local dev
cd typescript/job-automation/workers
npx wrangler dev

# Deploy
npx wrangler deploy --env production

# Tail logs
npx wrangler tail --env production

# D1 Management
npx wrangler d1 execute JOB_DASHBOARD --file=schema.sql
npx wrangler d1 execute JOB_DASHBOARD --interactive
```
