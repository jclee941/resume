# /api/auth/login E2E Test Plan — Issue #32 / P2-14

**Status**: Active plan · **Owner**: Platform · **Last Updated**: 2026-05-05

This document prescribes the Playwright E2E test for `/api/auth/login` in
job-dashboard, the Google OAuth mock fixture shape, the cookie / CSRF /
session attributes that the test must verify, and the CI environment
contract so the test runs deterministically without real Google
credentials.

---

## Test Surface

`/api/auth/login` is the entry point for the admin dashboard. The flow is:

1. Client POSTs `{ idToken }` (a Google ID token) to `/api/auth/login`.
2. Server calls Google's `tokeninfo` (or local JWKS verify) to validate.
3. On success: server creates a signed-cookie session, sets `Set-Cookie`
   with `HttpOnly; Secure; SameSite=Strict`, returns a CSRF token.
4. On failure: server returns 401 with no session cookie.

The existing test gap is that we have no end-to-end exercise of any of
those branches in CI.

---

## Test Cases

|   # | Name                                  | Input                                          | Expected                                                                                                                   |
| --: | ------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
|   1 | login success — happy path            | valid mocked Google ID token in body           | 200; `Set-Cookie: session=...` with `HttpOnly`, `Secure`, `SameSite=Strict`; CSRF token in body; session row written to D1 |
|   2 | login failure — invalid token         | malformed / expired Google ID token            | 401; no `Set-Cookie`; no D1 write                                                                                          |
|   3 | login failure — non-allowlisted email | valid Google ID token but email ≠ allowed list | 403; no `Set-Cookie`                                                                                                       |
|   4 | login replay — same idToken twice     | valid Google ID token used twice               | 200 the first time, 401 the second time (`jti` already redeemed)                                                           |
|   5 | CSRF token issuance                   | after success                                  | response body contains a CSRF token; subsequent state-changing endpoints reject without it                                 |
|   6 | cookie attributes audit               | after success                                  | cookie has `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`, expiry within session-TTL window                             |

---

## Mock Strategy

Google OAuth must not be hit live in CI. We mock at two layers:

### Layer A: Network mock (preferred)

`page.route('**/oauth2.googleapis.com/tokeninfo*', (route) => route.fulfill({...}))`
intercepts the verify call inside the Worker. This requires the dashboard
worker to be reachable via `wrangler dev` or miniflare in the test runner.

### Layer B: HTTP-level mock (fallback)

If the test runner cannot intercept inside the Worker, mock at the
client side: post a known-payload `idToken` to a test-only worker
endpoint `/api/auth/login?_test_mock=1` that bypasses the Google call
and uses an in-test allowlist. **This bypass MUST be gated by an env
var (`ENABLE_TEST_AUTH_MOCK=1`) and refuse to run in production.**

Decision: **start with Layer A**; fall back to Layer B only if the
miniflare/route-interception path proves unreliable.

---

## Required Fixtures

`tests/e2e/fixtures/auth-login.js` exports:

- `validIdTokenPayload(email)` → builds a JWT-shaped fake ID token whose
  `email` claim drives the allowlist branch.
- `expiredIdTokenPayload(email)` → same but `exp` < now.
- `mockTokenInfoResponse(email)` → builds the JSON Google's tokeninfo
  endpoint would return for a valid token.

These fixtures are **deterministic**; they do not call Google.

---

## CI Environment Contract

| Env var                      |          Required          | Purpose                                                                                                       |
| ---------------------------- | :------------------------: | ------------------------------------------------------------------------------------------------------------- |
| `JOB_DASHBOARD_URL`          |            yes             | Where `/api/auth/login` is reachable. In CI this points at miniflare; locally it can point at `wrangler dev`. |
| `ENABLE_TEST_AUTH_MOCK`      | no (only Layer-B fallback) | Activates the `?_test_mock=1` bypass endpoint inside the worker. CI defaults to **unset**.                    |
| `TEST_GOOGLE_ALLOWED_EMAILS` |            yes             | Comma-separated allowlist used by Layer B's bypass.                                                           |

The test must `test.skip(!process.env.JOB_DASHBOARD_URL, '...')` so it
runs only when the dashboard is reachable.

---

## Migration Plan

### Phase 1 (this PR) — **complete**

- [x] Define the 6 test cases.
- [x] Decide on Layer A (network route mock) as the preferred mock path,
      Layer B as fallback.
- [x] Specify the fixture API and CI environment contract.

### Phase 2 (follow-up PR — implementation)

- [ ] Add `tests/e2e/auth-login.spec.js` with the 6 test cases.
- [ ] Add `tests/e2e/fixtures/auth-login.js` with the deterministic
      payload builders.
- [ ] Add Layer-A `page.route` interception. If miniflare / Worker
      scope makes that unreliable, add the gated `?_test_mock=1` bypass
      endpoint (Layer B) inside `apps/job-dashboard/src/handlers/auth.js`
      with a runtime check that refuses unless `ENABLE_TEST_AUTH_MOCK=1`.
- [ ] Document required env vars in `tests/e2e/AGENTS.md` and the
      AGENTS skipped-tests audit (#24).

### Phase 3 (CI wiring)

- [ ] Confirm `JOB_DASHBOARD_URL` is set in the CI auth-login job.
- [ ] Run on every PR; respect `test.skip(...)` runtime guards.

---

## Verification (this PR)

This PR adds the plan only — no code changes. Phase 2 implements the
spec; Phase 3 wires CI.

---

## See Also

- [`docs/architecture/skipped-e2e-tests-audit.md`](./skipped-e2e-tests-audit.md)
  — audit of the 44 currently-skipped E2E tests; the new auth-login
  spec follows the same runtime-guard convention.
- [`apps/job-dashboard/src/handlers/auth.js`](../../apps/job-dashboard/src/handlers/auth.js)
  — current implementation of `/api/auth/login` (and where the Layer-B
  test bypass would live if needed).
- [`docs/security/wrangler-vars-vs-secrets.md`](../security/wrangler-vars-vs-secrets.md)
  — `GOOGLE_OAUTH_CLIENT_SECRET` boundary policy (Secrets, never `vars`).
