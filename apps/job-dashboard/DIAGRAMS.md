# Dashboard Runtime Diagrams

These diagrams describe the current in-process dashboard composition and are
based on the Worker entry and request pipeline.

## Table of Contents

- [Worker composition](#worker-composition)
- [HTTP request flow](#http-request-flow)
- [Workflow and event exports](#workflow-and-event-exports)
- [Source references](#source-references)

## Worker composition

The portfolio entry imports the dashboard module directly. There is no
dashboard Worker or Service Binding hop.

```text
Cloudflare request
  |
  v
Portfolio entry
  |
  +--> /job/* -> dashboard module
  |
  +--> other paths -> portfolio Worker
```

The portfolio entry also forwards scheduled and queue events to the dashboard
module. It re-exports the dashboard Workflow classes and Durable Object class
for registration by the root Worker configuration.

## HTTP request flow

```text
Request
  v
CORS preflight
  v
Rate limit
  v
Auth or webhook signature
  v
CSRF check (except MCP/webhooks)
  v
MCP / REST / dashboard fallback
  \-> unmatched API returns 404
```

The sequence follows `src/index.js`: CORS preflight, rate limiting, route-based
authentication or webhook-signature checks, then CSRF validation. Webhooks and
MCP skip the CSRF check; MCP uses its own bearer-token policy. Registered routes
share a request context. Non-API paths can fall through to the dashboard view;
unmatched API paths return 404.

## Workflow and event exports

The dashboard exports six Workflow classes and one Durable Object class:

| Runtime class         | Source                                      |
| --------------------- | ------------------------------------------- |
| `JobCrawlingWorkflow` | `src/workflows/job-crawling.js`             |
| `ApplicationWorkflow` | `src/workflows/application.js`              |
| `ResumeSyncWorkflow`  | `src/workflows/resume-sync.js`              |
| `DailyReportWorkflow` | `src/workflows/daily-report.js`             |
| `HealthCheckWorkflow` | `src/workflows/health-check.js`             |
| `CleanupWorkflow`     | `src/workflows/cleanup.js`                  |
| `BrowserSessionDO`    | `src/durable-objects/browser-session-do.js` |

Workflow and binding names are declared in the root
[`wrangler.jsonc`](../../wrangler.jsonc). The dashboard's standalone deploy
script is disabled.

## Source references

- [Portfolio Worker entry](../portfolio/entry.js)
- [Dashboard request and event entry](./src/index.js)
- [Route registrars](./src/routes/index.js)
- [Workflow exports](./src/workflows/index.js)
- [Root Worker configuration](../../wrangler.jsonc)
- [Architecture decision 0009](../../docs/adr/0009-single-worker-consolidation.md)
