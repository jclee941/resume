# JOB DASHBOARD WORKER KNOWLEDGE BASE

**Generated:** 2026-02-22 22:30:00 KST
**Commit:** 623fd03
**Branch:** master

## OVERVIEW

Cloudflare Worker serving the job dashboard API at `resume.jclee.me/job/*`. Class-based handlers, 7 scheduled workflows, D1+KV storage.

## STRUCTURE

```text
workers/
├── src/
│   ├── index.js              # fetch handler + workflow exports
│   ├── handlers/             # 13 BaseHandler subclasses
│   ├── workflows/            # 7 CF Workflow classes
│   ├── middleware/            # 5-layer request pipeline
│   ├── services/             # cache, migration, tracing, backup
│   └── utils/                # helpers
├── wrangler.toml             # worker config (name: job)
└── package.json
```

## WHERE TO LOOK

| Task               | Location                  | Notes                             |
| ------------------ | ------------------------- | --------------------------------- |
| Request routing    | `src/index.js`            | strips /job prefix, routes        |
| Handler logic      | `src/handlers/`           | 13 handlers extending BaseHandler |
| Workflow schedules | `src/workflows/`          | 7 CF Workflow classes             |
| Auth middleware    | `src/middleware/`         | 5-layer middleware stack          |
| DB migrations      | `src/services/migration/` | D1 schema management              |

## HANDLERS (13)

ApplicationsHandler (7 methods), StatsHandler (4), AuthHandler (5), WebhookHandler (10+), AutoApplyHandler (3), HealthHandler, ConfigHandler, WorkflowHandler, CleanupHandler, CrawlHandler, AnalyticsHandler, ProfileHandler, ResumeHandler.

## WORKFLOWS (7)

| Workflow    | Schedule        | Purpose                  |
| ----------- | --------------- | ------------------------ |
| JobCrawling | event-triggered | crawl job platforms      |
| Application | on-demand       | process applications     |
| ResumeSync  | event-triggered | sync resume data         |
| DailyReport | event-triggered | Slack summary            |
| HealthCheck | event-triggered | system health monitoring |
| Backup      | event-triggered | D1 backup                |
| Cleanup     | event-triggered | stale data removal       |

## MIDDLEWARE STACK

`logger → CORS → rate-limit (60/min/IP) → CSRF → auth → handler → response-logger`

## STORAGE

- **D1** (`job-dashboard-db`): applications, job_cache, sync_logs tables
- **KV patterns**: `session:{platform}`, `ratelimit:{ip}:{endpoint}`, `cache:{platform}:{jobId}`

## API SURFACE (43 endpoints)

Health (3), Stats (4), Auth (7), Applications CRUD (6), Webhooks (9), Auto-apply (3), Workflows (7), Config (2), Testing (2).

## CONVENTIONS

- All handlers extend `BaseHandler(db, cache, env)`.
- Request/response logging via middleware, not handlers.
- KV entries MUST have TTL — never set without expiry.
- Rate limiting: 60 req/min per IP per endpoint.

## ANTI-PATTERNS

- Never skip rate limiting on any endpoint.
- Never log credentials or session tokens.
- Never set KV without TTL.
- Never bypass CSRF for state-changing operations.
