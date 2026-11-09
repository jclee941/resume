# /api/auth/login E2E Test Plan — Issue #32 / P2-14

- **Status:** Historical test plan; implementation status not independently verified
- **Owner:** Platform
- **Plan last updated:** 2026-05-05

> Current CI has one read-only `validate` job and no E2E step
> ([workflow](../../.github/workflows/ci.yml)). This document records a proposed
> test plan; it does not describe current CI wiring.

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

At the time this plan was written, it recorded no end-to-end exercise of these
branches in CI.

---

## Test Cases

1. **Valid mocked ID token:** expect 200, a session cookie with `HttpOnly`,
   `Secure`, and `SameSite=Strict`, a CSRF token in the response, and a session
   row written to D1.
2. **Malformed or expired ID token:** expect 401, no session cookie, and no D1
   write.
3. **Valid token with an email outside the allowlist:** expect 403 and no
   session cookie.
4. **Replay the same ID token:** expect 200 on the first request and 401 on
   replay because the `jti` was redeemed.
5. **State-changing request without the issued CSRF token:** expect rejection.
6. **Successful session-cookie audit:** require `HttpOnly`, `Secure`,
   `SameSite=Strict`, `Path=/`, and expiry within the session-TTL window.

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
and uses an in-test allowlist.

Decision: **start with Layer A**; fall back to Layer B only if the
miniflare/route-interception path proves unreliable.

> **Layer B guard:** Implement this fallback only if Layer A proves unreliable.
> If implemented, the bypass must require `ENABLE_TEST_AUTH_MOCK=1` and refuse
> production requests. This plan does not add the bypass.

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

- `JOB_DASHBOARD_URL` (required when tests run): dashboard URL; CI was intended
  to use miniflare and local runs may use `wrangler dev`.
- `ENABLE_TEST_AUTH_MOCK` (Layer B only): enables the test-only
  `?_test_mock=1` fallback; leave unset otherwise.
- `TEST_GOOGLE_ALLOWED_EMAILS` (Layer B only): comma-separated fallback
  allowlist.

The test must `test.skip(!process.env.JOB_DASHBOARD_URL, '...')` so it
runs only when the dashboard is reachable.

---

## Migration Plan

### Phase 1 (plan definition; recorded complete)

- [x] Define the 6 test cases.
- [x] Decide on Layer A (network route mock) as the preferred mock path,
      Layer B as fallback.
- [x] Specify the fixture API and CI environment contract.

### Phase 2 (implementation plan; completion not verified)

- [ ] Add `tests/e2e/auth-login.spec.js` with the 6 test cases.
- [ ] Add `tests/e2e/fixtures/auth-login.js` with the deterministic
      payload builders.
- [ ] Add Layer-A `page.route` interception. If miniflare / Worker
      scope makes that unreliable, add the gated `?_test_mock=1` bypass
      endpoint (Layer B) inside `apps/job-dashboard/src/handlers/auth.js`
      with a runtime check that refuses unless `ENABLE_TEST_AUTH_MOCK=1`.
- [ ] Document required env vars in `tests/e2e/AGENTS.md` and the
      AGENTS skipped-tests audit (#24).

### Phase 3 (CI wiring plan; completion not verified)

- [ ] Confirm `JOB_DASHBOARD_URL` is set in the CI auth-login job.
- [ ] Run on every PR; respect `test.skip(...)` runtime guards.

---

## Verification recorded for the plan

The original change added the plan only, with no code changes. Current
implementation and CI wiring status are not established by this document.

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
