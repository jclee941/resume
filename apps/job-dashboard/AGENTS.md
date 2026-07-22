# JOB DASHBOARD WORKER KNOWLEDGE BASE

**Generated:** 2026-07-22
**Commit:** `164e83ac`
**Branch:** `master`

## OVERVIEW

Dashboard Worker module serving `resume.jclee.me/job/*` after it is imported
in-process by `apps/portfolio/entry.js`. Standalone deploy is disabled; source
composition lives in `src/AGENTS.md`.

## STRUCTURE

```text
job-dashboard/
├── src/                       # source composition and implementation
│   ├── AGENTS.md             # source-level guide (new)
│   ├── index.js              # fetch/queue/scheduled entry
│   ├── handlers/             # request adapters
│   ├── middleware/           # CORS/CSRF helpers
│   ├── queues/               # queue validation and dispatch
│   ├── routes/               # declarative route registrars
│   ├── services/             # dashboard-local integrations
│   ├── views/                # self-contained dashboard UI
│   ├── workflows/            # 7 Cloudflare Workflow classes
│   ├── durable-objects/      # BrowserSessionDO
│   └── utils/                # dashboard-local helpers
├── package.json              # standalone deploy intentionally fails
├── migrations/               # D1 migrations
└── README.md                 # deployment and API reference
```

## WHERE TO LOOK

| Task                   | Location                   | Notes                                               |
| ---------------------- | -------------------------- | --------------------------------------------------- |
| Source composition     | `src/AGENTS.md`            | HTTP/queue/scheduled entry and exports              |
| Request routing        | `src/index.js`             | strips `/job` prefix after portfolio entry forwards |
| Handler contracts      | `src/handlers/AGENTS.md`   | adapter patterns and route-to-handler wiring        |
| Middleware policy      | `src/middleware/AGENTS.md` | CORS/CSRF ordering and auth behavior                |
| Queue rules            | `src/queues/AGENTS.md`     | message shape, retry, and DLQ handling              |
| Route tables           | `src/routes/AGENTS.md`     | declarative path registration                       |
| Service boundaries     | `src/services/AGENTS.md`   | auth, clients, config, notifications                |
| Workflow orchestration | `src/workflows/AGENTS.md`  | idempotency, gates, and step contracts              |
| Dashboard UI           | `src/views/AGENTS.md`      | HTML/CSS/JS escaping and inline assets              |
| DB migrations          | `migrations/`              | D1 schema and data migrations                       |

## BINDINGS & STORAGE

- **D1** (`JOB_DB` / `job-dashboard-db`): dashboard schema owned by migrations
- **KV**: `SESSIONS`, `RATE_LIMIT_KV`, `NONCE_KV` (all with TTL)
- **Browser**: `MYBROWSER` (Browser Rendering), `BROWSER_SESSION` (Durable Object)
- **Workflows**: 7 (job-crawling, application, resume-sync, daily-report, health-check, backup, cleanup)

## CONVENTIONS

- Use `BaseHandler(db, cache, env)` where shared response helpers fit; several
  focused handlers remain standalone classes.
- Request/response logging via middleware, not handlers.
- KV entries MUST have TTL — never set without expiry.
- Rate limiting uses path-class policies from `@resume/shared/rate-limit`
  (`auth`, `api`, and `dashboard` have distinct limits).
- Queue `APPLY` payloads with `candidates`, `platforms`, `searchCriteria`, or `triggerType` pass through to `APPLICATION_WORKFLOW` unchanged.
- Use `@resume/shared` for logging, errors, rate limiting, and cross-app policy.
- Preserve exports consumed by `apps/portfolio/entry.js`: seven Workflows and `BrowserSessionDO`.

## ANTI-PATTERNS

- Never skip rate limiting on any endpoint.
- Never log credentials or session tokens.
- Never set KV without TTL.
- Never bypass CSRF for state-changing operations.
- Never re-enable standalone deploy without updating ADR 0009 and portfolio entry routing.
- Never send arbitrary external URLs to Browser Rendering; normalize and allowlist platform hosts first.

---

Parent: [../../AGENTS.md](../../AGENTS.md)
