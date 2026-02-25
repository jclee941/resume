# WORKER WORKFLOWS KNOWLEDGE BASE

## OVERVIEW

Workflow modules orchestrate background execution for crawling, application, resume sync, reporting, health checks, backup, and cleanup.

## STRUCTURE

```text
workflows/
├── index.js               # workflow export barrel
├── job-crawling.js        # crawl orchestration
├── application.js         # application pipeline
├── resume-sync.js         # resume sync workflow
├── resume-sync-helpers.js # shared sync helpers
├── daily-report.js        # daily summary workflow
├── health-check.js        # runtime health workflow
├── backup.js              # backup orchestration
└── cleanup.js             # stale-data cleanup workflow
```

## CONVENTIONS

- Keep steps idempotent so retries do not duplicate side effects.
- Make input/output contracts explicit between workflow stages.
- Keep helper logic in `resume-sync-helpers.js` style modules when reuse is real.
- Emit structured progress/status suitable for API status polling.

## ANTI-PATTERNS

- Do not embed endpoint/request parsing logic in workflow files.
- Do not hide retries with unbounded loops; keep bounded retry semantics.
- Do not couple workflow steps directly to route handlers.
- Do not perform destructive operations without explicit guard conditions.
