# WORKER HANDLERS KNOWLEDGE BASE

**Generated:** 2026-03-17
**Commit:** `882b837`
**Branch:** `master`

## OVERVIEW

Handler modules are request-facing adapters for `/job/*` API routes. Keep handlers thin and delegate business logic to services.

## STRUCTURE

```text
handlers/
├── base-handler.js               # shared request helpers
├── applications.js               # application CRUD endpoints
├── auth.js                       # auth/session endpoints
├── auto-apply.js                 # auto-apply control endpoints
├── auto-apply-webhook-handler.js # webhook trigger bridge
├── job-search-handler.js         # search trigger/bridge logic
├── profile-sync-handler.js       # profile sync trigger/bridge
├── report-handler.js             # report generation endpoints
├── resume-sync-handler.js        # resume sync endpoints
├── stats.js                      # stats/report endpoints
├── test-handler.js               # test-only endpoints
└── webhooks.js                   # webhook ingress routes
```

## CONVENTIONS

- Extend `BaseHandler` for shared parsing/validation/error response patterns.
- Keep request parsing and response shaping in handlers; move domain decisions to services.
- Keep route-to-handler mapping explicit and stable to avoid hidden endpoint drift.
- Treat webhook handlers as adapters; signature/auth checks stay mandatory.

## ANTI-PATTERNS

- Do not put persistence/query business logic directly in handlers.
- Do not bypass auth/rate-limit assumptions enforced by middleware.
- Do not duplicate common response/error formatting across files.
- Do not log tokens, cookies, or sensitive payload fields.
