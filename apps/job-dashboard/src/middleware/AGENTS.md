# MIDDLEWARE KNOWLEDGE BASE

**Generated:** 2026-07-22
**Commit:** `164e83ac`
**Branch:** `master`

## OVERVIEW

Middleware modules enforce cross-cutting request policy (CORS, CSRF) before
handlers run. Rate limiting is provided by `@resume/shared/rate-limit`.

## STRUCTURE

```text
middleware/
├── cors.js            # CORS validation and headers
├── csrf.js            # CSRF checks for state-changing requests
└── csrf.test.js       # CSRF middleware tests
```

## CONVENTIONS

- Preserve intended middleware order from router composition.
- Keep middleware deterministic and side-effect-light per request.
- CSRF/auth protections are mandatory for state-changing operations. Documented exemptions
  (both in `src/index.js`): `/api/webhooks/*` authenticates with an HMAC signature, and `/mcp`
  authenticates with the admin Bearer token only. `/mcp` ignores the session cookie, so no
  browser credential can be replayed against it, and it sends no CORS headers.
- Rate limiting is applied in `src/index.js` via `@resume/shared/rate-limit`.

## ANTI-PATTERNS

- Do not skip middleware for convenience paths in production routes.
- Do not move domain/business decisions into middleware.
- Do not introduce broad CORS wildcards without explicit requirement.
- Do not remove tests when changing CSRF logic.

---

Parent: [../AGENTS.md](../AGENTS.md)
