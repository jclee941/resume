# JOB DASHBOARD WORKER

**Generated:** 2026-02-09
**Commit:** 29d46c2
**Branch:** master

## OVERVIEW

Cloudflare Worker serving the job automation dashboard at `resume.jclee.me/job/*`.
Strips `/job` prefix internally so handlers use root-relative paths.

## STRUCTURE

```
workers/
├── src/
│   ├── index.js            # Worker entry point (fetch handler + workflow exports)
│   ├── handlers/            # API route handlers
│   │   ├── api.js           # /api/* endpoints
│   │   ├── auth.js          # Authentication handlers
│   │   └── pages.js         # HTML page handlers
│   └── workflows/           # Cloudflare Workflows (8 total)
│       ├── index.js          # Barrel exports
│       ├── health-check.js   # HealthCheckWorkflow (*/5 * * * *)
│       ├── backup.js         # BackupWorkflow (0 3 * * *)
│       ├── cleanup.js        # CleanupWorkflow (0 4 * * 0)
│       ├── daily-report.js   # DailyReportWorkflow (0 9 * * *)
│       ├── auth-refresh.js   # AuthRefreshWorkflow (0 0 * * 1-5)
│       ├── profile-sync.js   # ProfileSyncWorkflow (0 2 * * 1)
│       ├── resume-sync.js    # ResumeSyncWorkflow (0 1 * * *)
│       └── cache-warmup.js   # CacheWarmupWorkflow (0 6 * * *)
├── wrangler.toml             # Worker config, routes, bindings, crons
└── package.json              # Worker dependencies
```

## ENTRY POINTS

| Component | File                   | Notes                                |
| --------- | ---------------------- | ------------------------------------ |
| Worker    | src/index.js           | Fetch handler + re-exports workflows |
| Workflows | src/workflows/index.js | 8 workflow class exports             |
| Config    | wrangler.toml          | Routes, bindings, cron triggers      |

## BINDINGS

| Type | Name            | Purpose                     |
| ---- | --------------- | --------------------------- |
| D1   | job_dashboard   | Job application data, stats |
| KV   | JOB_CACHE       | Cache store, backup target  |
| R2   | job-screenshots | Screenshot storage          |

## API ENDPOINTS

| Method | Path           | Handler           | Purpose                 |
| ------ | -------------- | ----------------- | ----------------------- |
| GET    | /job/health    | handlers/api.js   | Health check (JSON)     |
| GET    | /job/api/stats | handlers/api.js   | Job statistics          |
| POST   | /job/api/apply | handlers/api.js   | Trigger job application |
| GET    | /job/          | handlers/pages.js | Dashboard HTML          |

**Note:** All paths include `/job` prefix externally. Worker strips prefix before routing.

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

## ANTI-PATTERNS

| Anti-Pattern                   | Why                               | Do Instead               |
| ------------------------------ | --------------------------------- | ------------------------ |
| Edit index.js routing directly | Path stripping logic is sensitive | Test with curl first     |
| Skip workflow error handling   | Silent failures in cron jobs      | Always notify on failure |
| Hardcode API keys              | Security violation                | Use wrangler secret      |
| Duplicate code from shared/    | Drift between copies              | Import from shared/      |

## COMMANDS

```bash
# Local dev
cd typescript/job-automation/workers
npx wrangler dev

# Deploy
npx wrangler deploy --env production

# Tail logs
npx wrangler tail --env production
```
