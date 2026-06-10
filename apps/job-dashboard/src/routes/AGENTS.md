# DASHBOARD ROUTES KNOWLEDGE BASE

**Generated:** 2026-06-10
**Commit:** `b74e95d1`
**Branch:** `master`

## OVERVIEW

Route modules register dashboard API paths and bind them to handler methods.
They are route tables, not business-logic containers.

## STRUCTURE

```text
routes/
├── index.js        # route registration barrel
├── automation.js   # /api/automation and /api/auto-apply routes
├── applications.js # application CRUD routes
├── auth.js         # auth/session routes
├── health.js       # health/status routes
├── stats.js        # stats/report routes
├── workflows.js    # workflow status/control routes
└── admin.js        # admin/config-style route registration
```

## CONVENTIONS

- Keep route files declarative: URL, method, and handler method wiring only.
- Preserve `/api/*` paths here; `src/index.js` owns any `/job` prefix handling.
- Route handlers receive the shared context object and call existing handlers.
- State-changing routes must continue through the middleware stack; do not add
  convenience bypasses.

## ANTI-PATTERNS

- Do not put DB queries, workflow decisions, or response shaping in route files.
- Do not instantiate handlers or services here.
- Do not hide auth/CSRF assumptions in route-local conditionals.

---

Parent: [../../AGENTS.md](../../AGENTS.md)
