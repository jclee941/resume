# WORKER MIDDLEWARE KNOWLEDGE BASE

## OVERVIEW

Middleware modules enforce cross-cutting request policy (CORS, CSRF, rate limiting) before handlers run.

## STRUCTURE

```text
middleware/
├── cors.js            # CORS validation and headers
├── csrf.js            # CSRF checks for state-changing requests
├── rate-limit.js      # per-IP/per-endpoint limiting
└── rate-limit.test.js # middleware-level tests
```

## CONVENTIONS

- Preserve intended middleware order from router composition.
- Keep middleware deterministic and side-effect-light per request.
- Rate-limit keys must remain stable and use TTL-backed storage patterns.
- CSRF/auth protections are mandatory for state-changing operations.

## ANTI-PATTERNS

- Do not skip middleware for convenience paths in production routes.
- Do not move domain/business decisions into middleware.
- Do not introduce broad CORS wildcards without explicit requirement.
- Do not remove tests when changing rate-limit or CSRF logic.
