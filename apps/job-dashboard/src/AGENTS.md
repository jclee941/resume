# JOB DASHBOARD SOURCE KNOWLEDGE BASE

**Generated:** 2026-10-09
**Commit:** `f24027a0`
**Branch:** `master`

## OVERVIEW

Composition and request policy for the dashboard HTTP, queue, and scheduled surfaces.

Scope reason: score 13; required runtime composition boundary.

## STRUCTURE

```text
src/
  handlers/         Request adapters, repositories, and cron dispatch
  mcp/              Remote MCP guard, SDK transport, and route-backed tools
  middleware/       CORS and CSRF helpers
  queues/           Message validation, metrics, retry, and dispatch
  routes/           Route registrars
  services/         Dashboard-local integrations
  views/            Inline dashboard HTML, CSS, and scripts
  workflows/        Workflow classes and orchestration helpers
  durable-objects/  Browser-session broker and object
  utils/            Environment adapter and colocated checks
```

## WHERE TO LOOK

| Task              | Location                            | Notes                                             |
| ----------------- | ----------------------------------- | ------------------------------------------------- |
| HTTP pipeline     | `index.js`                          | Normalizes `/job`, applies policy, builds context |
| Matching/errors   | `router.js`                         | Route patterns and handler boundary               |
| Context types     | `worker-env.js`                     | Types derived from binding consumers              |
| MCP tools         | `mcp/internal-api.js`, `mcp/tools/` | Reuse the registered REST routes                  |
| Browser ownership | `durable-objects/`                  | Stateful object with pure broker helpers          |

## CONVENTIONS

- HTTP order: preflight, rate limit, auth/signature, CSRF, then route dispatch.
- The public MCP endpoint is `/job/mcp`; normalized internal path is `/mcp`.
- MCP skips CORS and uses Host/Origin checks plus admin Bearer authentication, never cookies.
- MCP tools default workflow starts to dry runs and retain the REST real-submit gate.
- Instantiate shared route context once per request; registrars consume it.
- Attach request/response logging with `ctx.waitUntil()` using the request-scoped logger.
- Delegate queue batches to `QueueConsumer` and cron events to `handlers/scheduled/cron-router.js`.

## ANTI-PATTERNS

- Do not add MCP tools that duplicate handler behavior or bypass real-submit gates.
- Do not change a queue or Workflow payload in only one producer or consumer.
- Do not add route-local shortcuts around the shared request policy.
- Do not move object lifecycle state into the pure browser-session broker.

Parent: [../AGENTS.md](../AGENTS.md)
