# JOB DASHBOARD WORKER KNOWLEDGE BASE

**Generated:** 2026-06-30
**Commit:** `766d220c`
**Branch:** `master`

## OVERVIEW

Dashboard Worker module serving `resume.jclee.me/job/*` after it is imported
in-process by `apps/portfolio/entry.js`. Standalone deploy is disabled; source
still owns dashboard routes, handlers, workflows, queues, and storage bindings.

## STRUCTURE

```text
job-dashboard/
├── src/
│   ├── index.js              # fetch handler + workflow exports
│   ├── handlers/             # 14 BaseHandler subclasses
│   ├── workflows/            # 7 CF Workflow classes
│   ├── middleware/            # 5-layer request pipeline
│   ├── services/             # cache, migration, tracing, backup
│   └── utils/                # helpers
├── package.json            # standalone deploy script intentionally fails
└── migrations/             # dashboard D1 migrations
```

## WHERE TO LOOK

| Task               | Location                  | Notes                             |
| ------------------ | ------------------------- | --------------------------------- |
| Request routing    | `src/index.js`            | strips `/job` prefix after portfolio entry forwards |
| Handler logic      | `src/handlers/`           | 14 handlers extending BaseHandler |
| Workflow schedules | `src/workflows/`          | 7 CF Workflow classes             |
| Auth middleware    | `src/middleware/`         | 5-layer middleware stack          |
| DB migrations      | `migrations/`             | dashboard D1 migrations           |
| Native auto-apply  | `src/handlers/auto-apply/`, `src/workflows/application/` | explicit candidates, approval gates, Browser Rendering |

## HANDLERS (14)

ApplicationsHandler (7 methods), StatsHandler (4), AuthHandler (5),
WebhookHandler (10+), AutoApplyHandler (3), AutoApplyWebhookHandler,
DiagnosticsHandler, JobSearchHandler, ProfileSyncHandler, ReportHandler,
ResumeMasterHandler, ResumeSyncHandler, TestHandler, BaseHandler.

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

`logger → CORS → rate-limit (60/min/IP) → CSRF → auth → handler →
response-logger`

## STORAGE

- **D1** (`job-dashboard-db`): applications, job_cache, sync_logs tables
- **KV**: `SESSIONS`, `RATE_LIMIT_KV`, `NONCE_KV`
- **AI**: Workers AI binding
- **Browser**: `MYBROWSER` (Browser Rendering), `BROWSER_SESSION` (Durable
  Object: BrowserSessionDO)
- **Queue**: `crawl-tasks`
- **Workflows**: 7 (job-crawling, application, resume-sync, daily-report,
  health-check, backup, cleanup)

## API SURFACE (47 endpoints)

Health (3), Stats (4), Auth (7), Applications CRUD (6), Webhooks (9), Auto-apply
(3), Workflows (7), Config (2), Testing (2), Diagnostics (2), Reports (2).

## NATIVE AUTO-APPLY

- HTTP payload parsing lives under `src/handlers/auto-apply/`.
- `native-dispatch.js` bridges explicit candidates into Cloudflare Workflows.
- `src/workflows/application/` owns platform normalization, approval gates,
  dry-run preview metadata, and Browser Rendering submission.
- JobKorea/Saramin native submits must go through URL host allowlisting before
  browser/session hydration.

## CHILD GUIDES

- `src/handlers/AGENTS.md` owns handler-level contracts, route-to-handler
  responsibilities, and common handler anti-patterns.
- `src/workflows/AGENTS.md` owns workflow trigger semantics, step boundaries,
  and idempotency constraints.
- `src/middleware/AGENTS.md` owns middleware ordering, auth/rate-limit behavior,
  and response safety rules.
- `src/routes/AGENTS.md` owns route table wiring and path registration rules.
- `src/services/AGENTS.md` owns dashboard-local integrations and service
  boundaries.
- `src/queues/AGENTS.md` owns Cloudflare Queue message, retry, and DLQ rules.
- `src/views/AGENTS.md` owns generated dashboard HTML/CSS/JS conventions.

## CONVENTIONS

- All handlers extend `BaseHandler(db, cache, env)`.
- Request/response logging via middleware, not handlers.
- KV entries MUST have TTL — never set without expiry.
- Rate limiting: 60 req/min per IP per endpoint.
- Keep dashboard exports compatible with `apps/portfolio/entry.js`; workflows
  and `BrowserSessionDO` are re-exported by the merged worker entry.
- Use shared packages (`@resume/shared`, `@resume/schemas`, `@resume/types`)
  for cross-app behavior instead of importing portfolio internals.
- Queue `APPLY` payloads that already include `candidates`, `platforms`,
  `searchCriteria`, or `triggerType` should pass through to
  `APPLICATION_WORKFLOW` instead of being downgraded to legacy jobId payloads.

## ANTI-PATTERNS

- Never skip rate limiting on any endpoint.
- Never log credentials or session tokens.
- Never set KV without TTL.
- Never bypass CSRF for state-changing operations.
- Never re-enable standalone deploy from this package without updating ADR 0009,
  root deploy docs, and portfolio entry routing in the same change.
- Never send an arbitrary external URL to Browser Rendering; normalize and
  allowlist the platform host first.

---

Parent: [../../AGENTS.md](../../AGENTS.md)
