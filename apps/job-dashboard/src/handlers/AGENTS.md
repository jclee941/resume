# HANDLERS KNOWLEDGE BASE

**Generated:** 2026-07-22
**Commit:** `164e83ac`
**Branch:** `master`

## OVERVIEW

Handler modules are request-facing adapters for `/job/*` API routes. Keep
handlers thin and delegate business logic to services.

## STRUCTURE

```text
handlers/
├── base-handler.js               # shared request helpers
├── applications/                 # application CRUD, approvals, cleanup, history sync operation
├── auth.js                       # auth/session endpoints
├── auto-apply/                   # auto-apply run/start/status/config, scoring, duplicate checks
├── browser/                      # Browser Rendering smoke check
├── diagnostics.js                # diagnostics endpoints
├── diagnostics-probes.js         # diagnostics probe helpers
├── jobkorea/                     # JobKorea session minting
├── job-search-handler.js         # search trigger/bridge logic
├── profile-sync-handler.js       # profile sync trigger/bridge
├── report-handler.js             # report generation endpoints
├── resume-master-handler.js      # master resume endpoints
├── resume-sync-handler.js        # resume sync endpoints
├── scheduled/                    # cron router and the auto-apply start plan
├── stats.js                      # stats/report endpoints
├── sync/                         # profile sync status
├── telegram-webhook-handler.js   # Telegram webhook endpoint
├── test-handler.js               # test-only endpoints
├── wanted/                       # Wanted session minting
└── webhooks.js                   # webhook ingress routes
```

## CONVENTIONS

- Extend `BaseHandler` for shared parsing/validation/error response patterns.
- Keep request parsing and response shaping in handlers; move domain decisions
  to services.
- Keep route-to-handler mapping explicit and stable to avoid hidden endpoint
  drift.
- Treat webhook handlers as adapters; signature/auth checks stay mandatory.
- Auto-apply request parsing accepts `source`, `platform`, or `loginPlatform`,
  but must normalize through the shared platform catalog before dispatch.
- Non-dry-run Cloudflare-native dispatch must respect dashboard config
  (`auto_apply_enabled`) before creating workflow instances.

## ANTI-PATTERNS

- Do not put persistence/query business logic directly in handlers.
- Do not bypass auth/rate-limit assumptions enforced by middleware.
- Do not duplicate common response/error formatting across files.
- Do not log tokens, cookies, or sensitive payload fields.
- Do not pass unsupported explicit candidate platforms into native dispatch;
  reject them with a typed client-facing error.

---

Parent: [../AGENTS.md](../AGENTS.md)
