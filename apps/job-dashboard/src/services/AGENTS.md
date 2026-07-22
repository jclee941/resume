# SERVICES KNOWLEDGE BASE

**Generated:** 2026-07-22
**Commit:** `164e83ac`
**Branch:** `master`

## OVERVIEW

Dashboard services contain Worker-side integrations for auth, notifications,
browser helpers, external job clients, and runtime config. They sit below
handlers/routes and above shared packages or Cloudflare bindings.

## STRUCTURE

```text
services/
├── auth.js                    # session/token policy and auth helpers
├── auth-webhook-signature.js  # webhook HMAC + nonce replay checks
├── config.js                  # config endpoint support
├── linkedin-client.js         # LinkedIn scraping/search adapter
├── remember-client.js         # Remember platform adapter
├── notifications.js           # notification orchestration facade
├── notifications/             # delivery, formatting, Telegram actions
├── browser/                   # browser/proxy support
└── rate-limiter/              # token-bucket service + tests
```

## CONVENTIONS

- Keep platform clients and notification adapters deterministic and injectable.
- Use `@resume/shared/*` and `@resume/env/*` for shared policy instead of
  duplicating validators, loggers, retry logic, or rate-limit primitives.
- KV writes need TTLs unless the parent AGENTS explicitly allows otherwise.
- Webhook signature and nonce checks are security boundaries; keep failures
  explicit and auditable.

## ANTI-PATTERNS

- Do not log tokens, cookies, Telegram payload secrets, or raw auth headers.
- Do not add app-specific logic to `@resume/shared` just to simplify a service.
- Do not make services call route modules or handlers.
- Do not swallow delivery/search failures without structured error output.

---

Parent: [../AGENTS.md](../AGENTS.md)
