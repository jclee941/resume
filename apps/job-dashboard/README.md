# Job Automation Dashboard Worker

**Location**: `apps/job-dashboard/`

**Description**: Job dashboard API served at `resume.jclee.me/job/*` — the
handler module is merged in-process into the portfolio Cloudflare Worker
(it is no longer a standalone Worker).

**Architecture**: In-process consolidation with the portfolio Worker
(`resume`). `apps/portfolio/entry.js` imports this module directly and
dispatches `/job/*` requests via `jobWorker.fetch(request, env, ctx)`
— no Service Binding round-trip. See
[ADR 0009 — Single-Worker Consolidation](../../docs/adr/0009-single-worker-consolidation.md).

**Status**: ✅ Production-ready | 7 workflows | 48 API endpoints | D1 + KV + R2
bindings (all registered on the merged `resume` worker)

---

## Quick Start

### Prerequisites

- Node.js >= 22
- Wrangler CLI (installed as a workspace dev dependency)
- Cloudflare account with Workers enabled
- Valid `CLOUDFLARE_ACCOUNT_ID` environment variable

### Local Development

```bash
# Install dependencies from repo root
npm install

# Start dev server for the merged worker (serves portfolio + /job/*)
npm run dev          # Miniflare via tools/scripts/dev/miniflare.config.js
# or
npm run dev:wrangler # Wrangler-native dev mode
```

**Available Endpoints** (local, via the merged portfolio worker):

- Portfolio site: <http://localhost:8787/>
- Dashboard API: <http://localhost:8787/job/api/...>
- Dashboard health: <http://localhost:8787/job/health>

### Deploy to Cloudflare

Production deployment is handled by Cloudflare Workers Builds (git push to
`master` triggers automatic deploy of the merged `resume` worker). Local
production deploys are intentionally disabled.

```bash
# View live logs for the merged worker
npx wrangler tail --config wrangler.jsonc --env production

# View deployment history
npx wrangler deployments list
```

---

## Configuration

### Environment Variables

Set via `wrangler.jsonc` or `wrangler secret`:

```bash
# Set secrets (not visible in config files)
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put CLOUDFLARE_API_TOKEN
npx wrangler secret put JWT_SECRET
```

### Binding Shape (informational)

> ℹ️ The standalone dashboard Wrangler config was removed per ADR 0009 — these
> bindings are now declared in root `wrangler.jsonc` on the merged
> `resume` worker. The snippet below is kept for reference of what bindings
> the dashboard module expects.

```jsonc
{
  "name": "resume", // merged worker name (was: "job")
  "main": "src/index.js", // Entry point
  "compatibility_date": "2026-02-21", // Compatibility version

  // Bindings
  "d1_databases": [
    // D1 database
    { "binding": "JOB_DB", "database_name": "job-dashboard-db" },
  ],
  "kv_namespaces": [
    // KV storage
    { "binding": "SESSIONS", "id": "..." },
    { "binding": "RATE_LIMIT_KV", "id": "..." },
    { "binding": "NONCE_KV", "id": "..." },
  ],
  "durable_objects": [
    // Durable Objects
    { "name": "BROWSER_SESSION", "class_name": "BrowserSessionDO" },
  ],

  // Routes
  "routes": [{ "pattern": "resume.jclee.me/job/*", "zone_name": "jclee.me" }],

  // Workflows are event-triggered via API/CI

  // Workflows
  "workflows": [
    {
      "name": "job-crawling-workflow",
      "binding": "JOB_CRAWLING_WORKFLOW",
      "class_name": "JobCrawlingWorkflow",
    },
    {
      "name": "application-workflow",
      "binding": "APPLICATION_WORKFLOW",
      "class_name": "ApplicationWorkflow",
    },
    {
      "name": "resume-sync-workflow",
      "binding": "RESUME_SYNC_WORKFLOW",
      "class_name": "ResumeSyncWorkflow",
    },
    {
      "name": "daily-report-workflow",
      "binding": "DAILY_REPORT_WORKFLOW",
      "class_name": "DailyReportWorkflow",
    },
    {
      "name": "health-check-workflow",
      "binding": "HEALTH_CHECK_WORKFLOW",
      "class_name": "HealthCheckWorkflow",
    },
    { "name": "cleanup-workflow", "binding": "CLEANUP_WORKFLOW", "class_name": "CleanupWorkflow" },
  ],
}
```

---

## Architecture

### Request Flow

```text
Browser/API Client
    ↓
resume.jclee.me/job/* (Cloudflare route)
    ↓
Portfolio Worker (resume) → Service Binding → Job Dashboard Worker (job)
    ↓ (strip /job prefix)
Router.handle()
    ↓
Middleware Stack:
  1. Logger → Log request
  2. CORS → Validate origin
  3. Rate Limit → Token bucket (60 req/min/IP)
  4. CSRF → Double-submit cookie
  5. Auth → Bearer token validation
    ↓
Handler Classes (async methods):
  - ApplicationsHandler (CRUD)
  - StatsHandler (Analytics)
  - AuthHandler (Session mgmt)
  - WebhookHandler (Notifications)
  - AutoApplyHandler (Automation)
  - etc.
    ↓
Services (Stateless DI):
  - AuthService (cookies, JWT)
  - ConfigService (settings)
  - NotificationService (Telegram Bot API)
    ↓
External APIs:
  - D1 Database
  - KV Cache
  - R2 Storage
  - Telegram Bot API
    ↓
Response (JSON):
  {
    "success": true,
    "data": {...},
    "error": null
  }
```

### Directory Structure

```text
job-dashboard/
├── src/
│   ├── index.js                    # Entry point (fetch handler + exports)
│   ├── router.js                   # Route matching + dispatch
│   ├── handlers/                   # API route handlers (10+ classes)
│   │   ├── base-handler.js         # Base class (auth, validation)
│   │   ├── applications.js         # CRUD: list, create, update, delete
│   │   ├── stats.js                # Analytics: stats, reports
│   │   ├── auth.js                 # Session: login, logout, status
│   │   ├── webhooks.js             # Callbacks: automation, sync
│   │   ├── auto-apply.js           # Auto-apply: status, run, config
│   │   ├── health.js               # Health: checks, readiness
│   │   ├── config.js               # Config: get, set, validate
│   │   ├── workflows.js            # Workflows: trigger, status
│   │   └── cleanup.js              # Cleanup: expired, logs
│   ├── middleware/                 # Request/response middleware (4 layers)
│   │   ├── cors.js                 # CORS headers + origin validation
│   │   ├── csrf.js                 # Double-submit cookie protection
│   │   ├── rate-limit.js           # Token bucket (60 req/min/IP)
│   │   └── rate-limit.test.js      # Rate limit tests
│   ├── services/                   # Domain services (stateless DI)
│   │   ├── auth.js                 # Cookie management + JWT
│   │   ├── browser/                # Browser automation (DO)
│   │   ├── config.js               # Configuration loading
│   │   ├── linkedin-client.js     # LinkedIn API client
│   │   ├── notification/           # Notification services
│   │   └── remember-client.js      # Remember API client
│   ├── utils/                      # Utilities
│   │   ├── crypto.js               # Encryption/decryption
│   │   ├── errors.js               # Domain error classes
│   │   ├── logger.js               # ECS logging helpers
│   │   └── errors.js               # Domain error classes
│   ├── views/                      # Static assets
│   │   ├── dashboard.js            # React dashboard (inline)
│   │   ├── scripts.js              # Dashboard JS
│   │   ├── styles.js               # Global styles + responsive
│   │   └── styles/                 # Styles directory
│   ├── durable-objects/            # Durable Objects (persistent state)
│   │   └── browser-session-do.js   # Browser session persistence
│   └── workflows/                  # Cloudflare Workflows (7 workflow classes)
│       ├── index.js                # Barrel exports
│       ├── job-crawling.js         # Job search pipeline
│       ├── application.js          # Auto-apply submission
│       ├── resume-sync.js          # Per-platform resume sync (Wanted, JobKorea)
│       ├── daily-report.js         # Daily report
│       ├── health-check.js         # Health monitoring
│       └── cleanup.js              # Data cleanup
├── wrangler.jsonc                  # Worker config
├── package.json                    # Dependencies (minimal)
└── README.md                        # This file
```

---

## API Endpoints

### Health & Status (3 endpoints)

```bash
# Service health check
curl https://resume.jclee.me/job/health
# Returns: { "status": "healthy", "uptime": 3600, ... }

# Readiness check (dependencies)
curl https://resume.jclee.me/job/readiness

# Service status with metrics
curl https://resume.jclee.me/job/status
```

### Statistics (4 endpoints)

```bash
# Get overall stats
curl https://resume.jclee.me/job/api/stats
# Returns: { "total": 45, "applied": 30, "in_progress": 10, "rejected": 5 }

# Weekly stats
curl https://resume.jclee.me/job/api/stats/weekly

# Daily breakdown
curl https://resume.jclee.me/job/api/stats/daily

# Generate report
curl https://resume.jclee.me/job/api/report
```

### Authentication (7 endpoints)

```bash
# Set session (cookies/token)
curl -X POST https://resume.jclee.me/job/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"cookies": "...", "token": "..."}'

# Check auth status
curl https://resume.jclee.me/job/api/auth/status \
  -H "Authorization: Bearer <token>"

# Clear session
curl -X POST https://resume.jclee.me/job/api/auth/logout \
  -H "Authorization: Bearer <token>"

# Validate token
curl -X POST https://resume.jclee.me/job/api/auth/validate \
  -H "Authorization: Bearer <token>"

# Refresh expired token
curl -X POST https://resume.jclee.me/job/api/auth/refresh \
  -H "Authorization: Bearer <token>"

# Get user profile
curl https://resume.jclee.me/job/api/auth/profile \
  -H "Authorization: Bearer <token>"
```

### Applications CRUD (6 endpoints)

```bash
# List applications with filters
curl "https://resume.jclee.me/job/api/applications?status=applied&limit=20" \
  -H "Authorization: Bearer <token>"

# Add new application
curl -X POST https://resume.jclee.me/job/api/applications \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"job_id": "123", "company": "TechCorp", "platform": "wanted"}'

# Get application detail
curl https://resume.jclee.me/job/api/applications/abc123 \
  -H "Authorization: Bearer <token>"

# Update application
curl -X PUT https://resume.jclee.me/job/api/applications/abc123 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"status": "in_progress"}'

# Update status only
curl -X PATCH https://resume.jclee.me/job/api/applications/abc123/status \
  -H "Authorization: Bearer <token>" \
  -d '{"status": "rejected"}'

# Delete application
curl -X DELETE https://resume.jclee.me/job/api/applications/abc123 \
  -H "Authorization: Bearer <token>"
```

### Application history sync

```bash
# Pull Wanted, JobKorea and Remember application history into D1 (idempotent; state-changing, needs CSRF)
curl -X POST https://resume.jclee.me/job/api/applications/sync \
  -H "Authorization: Bearer <token>" -H "X-CSRF-Token: <csrf>" -H "Cookie: csrf_token=<csrf>" \
  -H "Content-Type: application/json" -d '{"platforms": ["wanted", "jobkorea", "remember"]}'
```

The service lives in `src/services/application-history/`. It maps the owner's real applications
onto `applications` rows keyed by (source, job_id) so the auto-apply approval gate
(`SELECT id FROM applications WHERE job_id = ? AND source = ?`) sees them:
`wanted-<jobId>` (source `wanted`), `jobkorea-<posting number>` (source `jobkorea`) and
`remember-<posting id>` (source `remember`).

- **Wanted**: `GET /api/v4/applications?status={complete|pass|hire|reject}&limit=50&offset=N` with the
  KV session cookie, paged by `links.next`. The `status` filter is mandatory (422 without it).
- **JobKorea**: the KV cookies are replayed in Browser Rendering on `/User/ApplyMng` (입사지원 현황)
  and the rendered HTML is parsed. The page is only read; nothing is clicked.
- **Remember**: `GET /open_profiles/me/job_postings/application_histories?page=N&per=50` on the
  career API with the account token, through Browser Rendering REST. An entry that carries
  `canceled_at` is stored as `withdrawn`. Remember can also drop a cancelled application from the
  list; rows are never deleted, so that row keeps its last stored status.
- Existing rows matching (source, job_id) only have their status advanced; new rows are inserted
  as `history-<job_id>`; rows are never deleted. Each run adds a `sync_logs` row of type
  `application-history`.
- A missing or expired session reports `SESSION_MISSING` / `SESSION_EXPIRED` for that platform
  only. HTTP 502 means every requested platform failed.
- Runs in the `0 21 * * *` cron after the session refresh and before the auto-apply discovery
  start (120 s budget, failures never block the other starts), and as the MCP tool
  `sync_application_history`.

### Workflows (7 endpoints)

```bash
# Trigger job crawling
curl -X POST https://resume.jclee.me/job/api/workflows/job-crawling/run \
  -H "Authorization: Bearer <token>"

# Trigger auto-apply
curl -X POST https://resume.jclee.me/job/api/workflows/application/run \
  -H "Authorization: Bearer <token>"

# Trigger resume sync
curl -X POST https://resume.jclee.me/job/api/workflows/resume-sync/run \
  -H "Authorization: Bearer <token>"

# Trigger daily report
curl -X POST https://resume.jclee.me/job/api/workflows/daily-report/run \
  -H "Authorization: Bearer <token>"

# Check workflow status
curl https://resume.jclee.me/job/api/workflows/abc123/status \
  -H "Authorization: Bearer <token>"
# Returns: { "id": "abc123", "status": "running", "progress": 60, ... }
```

---

## Platform Support & Limitations

### Supported Platforms

| Platform     | Search | Job Details | Auto-Apply | Notes                                              |
| ------------ | :----: | :---------: | :--------: | -------------------------------------------------- |
| **Wanted**   |   ✅   |     ✅      |     ✅     | Full API support via Chaos API                     |
| **LinkedIn** |   ✅   |     ⚠️      |     ❌     | Search works; Apply requires Puppeteer (see below) |
| **Remember** |   ✅   |     ✅      |     ✅     | API through Browser Rendering REST                 |
| **JobKorea** |   ❌   |     ❌      |     ❌     | Session renewal and application-history read       |
| **Saramin**  |   ❌   |     ❌      |     ❌     | Not supported                                      |

### ⚠️ Important Limitations

**LinkedIn Auto-Apply**: LinkedIn requires browser automation (Puppeteer) for job
applications, which is not available in Cloudflare Workers.
The dashboard workflow will return an error with `requiresBrowserAutomation: true` if
you attempt to apply to these platforms.

There is no local fallback runner; these platforms stay unsupported for
auto-apply.

**Job details**: `ApplicationWorkflow` reads Wanted posting details from the Wanted API, and
Remember search results already carry the posting text, so neither needs an earlier crawl.

### Webhooks (9 endpoints)

```bash
# Notification webhook (requires X-Webhook-Signature header)
curl -X POST https://resume.jclee.me/job/webhooks/notify \
  -H "X-Webhook-Signature: <hmac-sha256>" \
  -d '{"message": "Job found", "company": "TechCorp"}'

# Auto-apply trigger
curl -X POST https://resume.jclee.me/job/webhooks/auto-apply \
  -H "X-Webhook-Signature: <hmac-sha256>"

# Sync start notification
curl -X POST https://resume.jclee.me/job/webhooks/sync-start \
  -H "X-Webhook-Signature: <hmac-sha256>"

# Sync complete notification
curl -X POST https://resume.jclee.me/job/webhooks/sync-complete \
  -H "X-Webhook-Signature: <hmac-sha256>" \
  -d '{"status": "success", "updated": 5}'

# New job found alert
curl -X POST https://resume.jclee.me/job/webhooks/job-found \
  -H "X-Webhook-Signature: <hmac-sha256>" \
  -d '{"job_id": "123", "title": "Engineer", "score": 85}'

# Application status change
curl -X POST https://resume.jclee.me/job/webhooks/application-status \
  -H "X-Webhook-Signature: <hmac-sha256>" \
  -d '{"application_id": "abc123", "old_status": "applied", "new_status": "in_progress"}'

# Error logging webhook
curl -X POST https://resume.jclee.me/job/webhooks/error \
  -H "X-Webhook-Signature: <hmac-sha256>" \
  -d '{"error": "Database connection failed", "timestamp": "2026-02-11T..."}'

# Crawl completion notification
curl -X POST https://resume.jclee.me/job/webhooks/crawl-complete \
  -H "X-Webhook-Signature: <hmac-sha256>" \
  -d '{"found": 15, "failed": 2}'

# Daily report delivery
curl -X POST https://resume.jclee.me/job/webhooks/daily-report \
  -H "X-Webhook-Signature: <hmac-sha256>" \
  -d '{"report_url": "https://...", "date": "2026-02-11"}'
```

---

## Database & Storage

### D1 Database

**Name**: `job-dashboard-db`

**Tables** (3):

| Table          | Purpose                  | Rows             |
| -------------- | ------------------------ | ---------------- |
| `applications` | Job application tracking | Auto-grow        |
| `job_cache`    | Job search results cache | 1h TTL           |
| `sync_logs`    | Audit trail for syncs    | 30-day retention |

**Initialization**:

```bash
# Create database
npx wrangler d1 create job-dashboard-db

# Run migrations
npx wrangler d1 execute job-dashboard-db --file=migrations/001-initial.sql

# Interactive console
npx wrangler d1 execute job-dashboard-db --interactive
```

**Access via Worker**:

```javascript
export default {
  async fetch(request, env, ctx) {
    const db = env.JOB_DB;
    const result = await db.prepare('SELECT * FROM applications LIMIT 10').all();
    return new Response(JSON.stringify(result));
  },
};
```

### KV Storage

**Namespaces** (3):

| Namespace       | TTL | Purpose       | Pattern                     |
| --------------- | --- | ------------- | --------------------------- |
| `SESSIONS`      | 24h | Session cache | `session:{platform}`        |
| `RATE_LIMIT_KV` | 60s | Rate limiting | `ratelimit:{ip}:{endpoint}` |
| `NONCE_KV`      | 24h | CSRF tokens   | `nonce:{user}:{timestamp}`  |

**Management**:

```bash
# List keys in namespace
npx wrangler kv:key list --namespace-id=<ID>

# Get value
npx wrangler kv:key get --namespace-id=<ID> "session:wanted"

# Delete key
npx wrangler kv:key delete --namespace-id=<ID> "session:wanted"

# Clear namespace
npx wrangler kv:key delete --namespace-id=<ID> --path=".*" --recursive
```

### R2 Storage

**Bucket**: `job-screenshots`

**Usage**: Store screenshots from browser automation

```javascript
// Upload screenshot
const buffer = await screenshot.toBuffer();
await env.R2.put(`screenshots/${date}/${jobId}.png`, buffer);

// Retrieve screenshot
const image = await env.R2.get(`screenshots/2026-02-11/123.png`);
```

---

## Cloudflare Workflows

**Status**: workflows are event-triggered + on-demand

### Active Workflows

| Workflow              | Schedule      | Purpose                      |
| --------------------- | ------------- | ---------------------------- |
| `JobCrawlingWorkflow` | On-demand     | Search jobs on all platforms |
| `ApplicationWorkflow` | On-demand     | Auto-submit job applications |
| `ResumeSyncWorkflow`  | Event trigger | Resume sync to platforms     |
| `DailyReportWorkflow` | Event trigger | Stats report via Telegram    |
| `HealthCheckWorkflow` | Event trigger | Health monitoring            |
| `CleanupWorkflow`     | Event trigger | Stale data cleanup           |

D1 Time Travel (native point-in-time restore) is the D1 backup; there is no backup workflow.

### Example: Trigger Resume Sync

```bash
curl -X POST https://resume.jclee.me/job/api/workflows/resume-sync/run \
  -H "Authorization: Bearer <token>"

# Response:
{
  "workflowId": "resume-sync-workflow",
  "instanceId": "abc123def456",
  "status": "queued",
  "createdAt": "2026-02-11T06:00:00Z"
}
```

### Monitor Workflow Status

```bash
curl https://resume.jclee.me/job/api/workflows/abc123def456/status \
  -H "Authorization: Bearer <token>"

# Response:
{
  "instanceId": "abc123def456",
  "workflowId": "resume-sync-workflow",
  "status": "completed",
  "result": { "synced": 5, "failed": 0 },
  "completedAt": "2026-02-11T06:05:30Z"
}
```

---

## Rate Limiting & Quotas

### Rate Limits

**Per IP Address**: 60 requests per minute per endpoint

**Headers**:

```text
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1739327125
```

**Response** (when exceeded):

```json
HTTP 429 Too Many Requests

{
  "error": "Rate limit exceeded",
  "retryAfter": 30
}
```

### Quotas

| Resource       | Limit | Notes                    |
| -------------- | ----- | ------------------------ |
| D1 rows        | 500M  | Cloudflare D1 limit      |
| KV entries     | 10B   | Cloudflare KV limit      |
| R2 storage     | 100GB | Soft limit, can increase |
| Workers CPU    | 50ms  | Per request timeout      |
| Workflow steps | 50    | Per workflow definition  |

---

## Secrets Management

### Required Secrets

Set via `npx wrangler secret put`:

```bash
# Telegram Bot API for notifications
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_CHAT_ID

# JWT signing key for auth tokens
npx wrangler secret put JWT_SECRET

# Webhook signature key for validation
npx wrangler secret put WEBHOOK_SECRET

# Cloudflare API token (optional, for advanced operations)
npx wrangler secret put CLOUDFLARE_API_TOKEN
```

### View Secrets

```bash
# List all secrets (names only, no values)
npx wrangler secret list

# Secrets are NOT visible in wrangler.jsonc - security best practice
```

---

## Error Handling

### Common Error Responses

```json
// 401 Unauthorized
{
  "error": "Unauthorized",
  "message": "Missing or invalid authentication token",
  "code": "AUTH_REQUIRED"
}

// 403 Forbidden
{
  "error": "Forbidden",
  "message": "Insufficient permissions for this operation",
  "code": "INSUFFICIENT_PERMS"
}

// 404 Not Found
{
  "error": "Not Found",
  "message": "Application with id 'abc123' not found",
  "code": "NOT_FOUND"
}

// 429 Too Many Requests
{
  "error": "Rate limit exceeded",
  "retryAfter": 30,
  "code": "RATE_LIMIT"
}

// 500 Internal Server Error
{
  "error": "Internal Server Error",
  "message": "Database connection failed",
  "code": "DB_ERROR"
}
```

### Error Logging

All errors logged in ECS format, alerts via Telegram:

```json
{
  "level": "ERROR",
  "timestamp": "2026-02-11T06:00:00.000Z",
  "event": {
    "action": "api_call",
    "outcome": "failure"
  },
  "error": {
    "code": "DB_ERROR",
    "message": "Cannot connect to database"
  },
  "http": {
    "method": "GET",
    "status_code": 500,
    "path": "/api/applications"
  }
}
```

---

## Troubleshooting

### Worker Not Responding

```bash
# Check if worker is deployed
npx wrangler deployments list

# View live logs
npx wrangler tail --env production

# Test health endpoint
curl https://resume.jclee.me/job/health

# Check Cloudflare status page
curl https://www.cloudflarestatus.com/
```

### Database Connection Errors

```bash
# Verify D1 binding
npx wrangler env list

# Test database connection
npx wrangler d1 execute job-dashboard-db --command="SELECT 1"

# Check database quota
npx wrangler d1 info job-dashboard-db
```

### KV Storage Issues

```bash
# List namespace contents
npx wrangler kv:namespace list

# Verify KV binding in wrangler.jsonc
cat wrangler.jsonc | grep -A5 "kv_namespaces"

# Check KV quota usage
npx wrangler kv:namespace describe <namespace-id>
```

### Rate Limiting Too Strict

Adjust in `src/middleware/rate-limit.js`:

```javascript
const RATE_LIMIT = {
  maxTokens: 120, // Increase from 60
  refillRate: 2, // Tokens per second
  windowMs: 60000, // Per minute
};
```

Then commit the change and let Cloudflare Workers Builds deploy it from
`master`:

```bash
git push origin master
```

### CORS Issues

Verify allowed origins in `src/middleware/cors.js`:

```javascript
const ALLOWED_ORIGINS = [
  'https://resume.jclee.me',
  'https://grafana.jclee.me',
  'http://localhost:3000', // Dev only
];
```

---

## Related Documentation

- **[AGENTS.md](./AGENTS.md)** - Architecture details, handler classes,
  workflows, D1 schema, KV structure
- **[SECRETS.md](./SECRETS.md)** - Secret management guide

---

## Support

For issues or questions:

1. Check logs: `npx wrangler tail --env production`
2. Review [AGENTS.md](./AGENTS.md) for architecture details
3. Check [Cloudflare Workers docs](https://developers.cloudflare.com/workers/)
4. Review error codes in [Error Handling](#error-handling) section

---

**Last Updated**: 2026-03-11
**Version**: 1.0.0
**Status**: ✅ Production-ready
