# MIDDLEWARE KNOWLEDGE BASE

**Generated:** 2026-10-09
**Commit:** `f24027a0`
**Branch:** `master`

## OVERVIEW

CORS response helpers and CSRF cookie/header validation for dashboard requests.

Scope reason: existing distinct request-security domain.

## WHERE TO LOOK

| Task            | Location                                              | Notes                                             |
| --------------- | ----------------------------------------------------- | ------------------------------------------------- |
| Origin policy   | `cors.js`                                             | Allowed origins and credentialed response headers |
| JSON responses  | `cors.js`                                             | Shared `jsonResponse` helper used across handlers |
| CSRF validation | `csrf.js`                                             | State-changing request token checks               |
| Cookie issuance | `csrf.js`                                             | `addCsrfCookie` and token generation              |
| Composition     | `../index.js`                                         | Owns invocation order and exemptions              |
| Browser checks  | `../../../../tests/e2e/dashboard-config-cors.spec.js` | Cross-origin dashboard behavior                   |

## CONVENTIONS

- Keep `jsonResponse` status and header behavior stable across its many callers.
- Apply origin policy from the request and environment, not a mutable module singleton.
- CSRF exemption decisions belong to the entry composition, not these helpers.
- HMAC-authenticated webhook paths and Bearer-only MCP are the documented exemptions.
- Rate limiting comes from the shared package; there is no local rate-limit middleware module.
- No colocated `csrf.test.js` exists; use the repository test surfaces when changing policy.

## ANTI-PATTERNS

- Do not combine credentialed CORS with an unrestricted origin wildcard.
- Do not insert application-domain decisions into CORS or CSRF helpers.
- Do not make token issuance depend on handler-specific state.
- Do not assume every JSON response is a browser response requiring CORS.

Parent: [../AGENTS.md](../AGENTS.md)
