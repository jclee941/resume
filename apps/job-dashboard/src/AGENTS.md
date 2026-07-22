# JOB DASHBOARD SOURCE KNOWLEDGE BASE

**Generated:** 2026-07-22
**Commit:** `164e83ac`
**Branch:** `master`

## OVERVIEW

Source composition for the dashboard module merged into the portfolio Worker.
`index.js` composes HTTP, queue, and scheduled surfaces; child domains own
implementation details.

## STRUCTURE

```text
src/
├── index.js          # fetch/queue/scheduled composition and Workflow exports
├── router.js         # route matching and handler error boundary
├── handlers/         # request adapters and scheduled dispatch
├── middleware/       # CORS and CSRF helpers
├── queues/           # queue validation, retry, metrics, Workflow dispatch
├── routes/           # declarative route registrars
├── services/         # dashboard-local auth, clients, config, notifications
├── views/            # self-contained dashboard HTML/CSS/JS
├── workflows/        # seven Cloudflare Workflow entry classes and helpers
├── durable-objects/  # BrowserSessionDO
└── utils/            # dashboard-local helpers
```

## WHERE TO LOOK

| Task                       | Location               | Notes                                              |
| -------------------------- | ---------------------- | -------------------------------------------------- |
| Request policy/order       | `index.js`             | CORS → rate limit → auth/signature → CSRF → routes |
| Route dispatch             | `router.js`, `routes/` | `/job` is stripped before matching                 |
| HTTP behavior              | `handlers/`            | child guide owns adapter contracts                 |
| Background messages        | `queues/`              | child guide owns payload/retry/DLQ rules           |
| Long-running orchestration | `workflows/`           | child guide owns idempotency and gates             |
| Operational UI             | `views/`               | child guide owns escaping and inline assets        |

## CONVENTIONS

- Keep `index.js` as composition: instantiate handlers, register routes, and
  delegate queue/scheduled work.
- Preserve exports consumed by `apps/portfolio/entry.js`: seven Workflows and
  `BrowserSessionDO`.
- Use `@resume/shared` for logging, typed errors, rate limiting, and other
  cross-app policy; keep dashboard-only behavior local.
- Route registrars remain declarative; handlers parse/respond; services and
  workflows own domain behavior.
- Log through request-scoped `@resume/shared/logger`; attach response logging
  with `ctx.waitUntil()`.

## ANTI-PATTERNS

- Do not add a second Worker entry or standalone deploy path.
- Do not move business logic into `index.js`, route tables, or middleware.
- Do not bypass rate-limit, auth/signature, or CSRF gates for convenience.
- Do not change queue or Workflow payload shape in only one producer/consumer.
- Do not import portfolio internals; `apps/portfolio/entry.js` owns the sanctioned
  cross-app direction.

---

Parent: [../AGENTS.md](../AGENTS.md)
