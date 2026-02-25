# Job Automation Dashboard Runtime (Embedded)

**Location**: `typescript/job-automation/workers/`

**Description**: Embedded runtime modules served by the `resume` worker at `resume.jclee.me/job/*`

**Architecture**: Single-worker production runtime (`resume`).

**Status**: ✅ Production-ready | 8 workflows | 30+ API endpoints | D1 + KV + R2 bindings

---

## Quick Start

### Prerequisites

- Node.js >= 18
- Wrangler CLI (`npm install -g wrangler`)
- Cloudflare account with Workers enabled
- Valid `CLOUDFLARE_ACCOUNT_ID` environment variable

### Local Development

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:8787)
npm run dev
# or
npx wrangler dev
```

**Available Endpoints** (local):

- Dashboard UI: http://localhost:8787/job/
- API: http://localhost:8787/job/api/\*
- Health check: http://localhost:8787/job/health

### Deploy to Cloudflare

Standalone production deployment is deprecated in single-worker architecture.

```bash
# Deploy to production environment
npx wrangler deploy --config typescript/job-automation/workers/wrangler.toml --env production

# View live logs
npx wrangler tail --env production

# View deployment history
npx wrangler deployments list
```

---

## Configuration

### Environment Variables

Set via `wrangler.toml` or `wrangler secret`:

```bash
# Set secrets (not visible in config files)
npx wrangler secret put SLACK_WEBHOOK_URL
npx wrangler secret put CLOUDFLARE_API_TOKEN
npx wrangler secret put JWT_SECRET
```

### wrangler.toml Structure

```jsonc
{
  "name": "job", // Worker name
  "main": "src/index.js", // Entry point
  "compatibility_date": "2026-02-21", // Compatibility version

  // Bindings
  "d1_databases": [
    // D1 database
    { "binding": "DB", "database_name": "job-dashboard-db" },
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
    { "name": "backup-workflow", "binding": "BACKUP_WORKFLOW", "class_name": "BackupWorkflow" },
    { "name": "cleanup-workflow", "binding": "CLEANUP_WORKFLOW", "class_name": "CleanupWorkflow" },
  ],
}
```

---

## Architecture

### Request Flow

```
Browser/API Client
    ↓
route.jclee.me/job/* (Cloudflare route)
    ↓
Worker fetch() handler
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
  - SlackService (webhooks)
    ↓
External APIs:
  - D1 Database
  - KV Cache
  - R2 Storage
  - Slack API
    ↓
Response (JSON):
  {
    "success": true,
    "data": {...},
    "error": null
  }
```

### Directory Structure

```
workers/
├── src/
│   ├── index.js                    # Entry point (fetch handler + exports)
│   ├── router.js                   # Route matching + dispatch
│   ├── handlers/                   # API route handlers (10+ classes)
│   │   ├── base-handler.js         # Base class (auth, validation)
│   │   ├── applications.js         # CRUD: list, create, update, delete
│   │   ├── stats.js                # Analytics: stats, reports
│   │   ├── auth.js                 # Session: login, logout, status
│   │   ├── webhooks.js             # Callbacks: Slack, automation, sync
│   │   ├── auto-apply.js           # Auto-apply: status, run, config
│   │   ├── health.js               # Health: checks, readiness
│   │   ├── config.js               # Config: get, set, validate
│   │   ├── workflows.js            # Workflows: trigger, status
│   │   └── cleanup.js              # Cleanup: expired, logs
│   ├── middleware/                 # Request/response middleware (7 layers)
│   │   ├── logger.js               # ECS-format request logging
│   │   ├── cors.js                 # CORS headers + origin validation
│   │   ├── rate-limit.js           # Token bucket (60 req/min/IP)
│   │   ├── csrf.js                 # Double-submit cookie protection
│   │   ├── auth.js                 # Bearer token + JWT validation
│   │   └── error-handler.js        # Centralized error handling
│   ├── services/                   # Domain services (stateless DI)
│   │   ├── auth.js                 # Cookie management + JWT
│   │   ├── config.js               # Configuration loading
│   │   ├── slack.js                # Slack webhook notifications
│   │   └── browser.js              # Browser automation (DO)
│   ├── utils/                      # Utilities
│   │   ├── crypto.js               # Encryption/decryption
│   │   ├── validators.js           # Input validation schemas
│   │   ├── logger.js               # ECS logging helpers
│   │   └── errors.js               # Domain error classes
│   ├── views/                      # Static assets
│   │   ├── dashboard.html          # React dashboard (inline)
│   │   ├── styles.css              # Global styles + responsive
│   │   └── scripts.js              # Dashboard JS
│   ├── durable-objects/            # Durable Objects (persistent state)
│   │   └── browser-session-do.js   # Browser session persistence
│   └── workflows/                  # Cloudflare Workflows (8 total)
│       ├── index.js                # Barrel exports
│       ├── job-crawling.js         # Job search pipeline
│       ├── application.js          # Auto-apply submission
│       ├── resume-sync.js          # Daily sync (0 1 * * *)
│       ├── daily-report.js         # Daily report (0 9 * * *)
│       ├── health-check.js         # Health monitoring (*/5 * * * *)
│       ├── backup.js               # D1→KV backup (0 3 * * *)
│       └── cleanup.js              # Data cleanup (0 4 * * 0)
├── wrangler.toml                   # Worker config
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
# Returns: { "total": 45, "applied": 30, "reviewing": 10, "rejected": 5 }

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

# Sync cookies from script
curl -X POST https://resume.jclee.me/job/api/auth/sync \
  -H "Authorization: Bearer <token>" \
  -d '{"platform": "wanted", "cookies": "..."}'

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
  -d '{"status": "reviewing"}'

# Update status only
curl -X PATCH https://resume.jclee.me/job/api/applications/abc123/status \
  -H "Authorization: Bearer <token>" \
  -d '{"status": "rejected"}'

# Delete application
curl -X DELETE https://resume.jclee.me/job/api/applications/abc123 \
  -H "Authorization: Bearer <token>"
```

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

### Webhooks (9 endpoints)

```bash
# Slack notification (requires X-Webhook-Signature header)
curl -X POST https://resume.jclee.me/job/webhooks/slack \
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
  -d '{"application_id": "abc123", "old_status": "applied", "new_status": "reviewing"}'

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
    const db = env.DB;
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
| `DailyReportWorkflow` | Event trigger | Stats report to Slack        |
| `HealthCheckWorkflow` | Event trigger | Health monitoring            |
| `BackupWorkflow`      | Event trigger | D1→KV backup                 |
| `CleanupWorkflow`     | Event trigger | Stale data cleanup           |
| (8th workflow)        | TBD           | TBD                          |

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

```
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
# Slack webhook for notifications
npx wrangler secret put SLACK_WEBHOOK_URL

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

# Secrets are NOT visible in wrangler.toml - security best practice
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

All errors logged in ECS format to Slack:

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

# Verify KV binding in wrangler.toml
cat wrangler.toml | grep -A5 "kv_namespaces"

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

Then redeploy:

```bash
npx wrangler deploy --config typescript/job-automation/workers/wrangler.toml --env production
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

- **[AGENTS.md](./AGENTS.md)** - Architecture details, handler classes, workflows, D1 schema, KV structure
- **[SECRETS.md](./SECRETS.md)** - Secret management guide
- **[../ARCHITECTURE.md](../ARCHITECTURE.md)** - Job automation system overview
- **[../DATA_FLOW.md](../DATA_FLOW.md)** - End-to-end request flows
- **[../SCRIPTS_GUIDE.md](../SCRIPTS_GUIDE.md)** - CLI scripts reference

---

## Support

For issues or questions:

1. Check logs: `npx wrangler tail --env production`
2. Review [AGENTS.md](./AGENTS.md) for architecture details
3. Check [Cloudflare Workers docs](https://developers.cloudflare.com/workers/)
4. Review error codes in [Error Handling](#error-handling) section

---

**Last Updated**: 2026-02-11
**Version**: 1.0.0
**Status**: ✅ Production-ready
