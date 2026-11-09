# Error Class Hierarchy Triage — SSOT-032 / Issue #41

**Status**: Historical triage snapshot · **Owner**: Platform · **Snapshot date**: 2026-05-05

> **2026-09-29:** `apps/job-server` was retired ([ADR 0010](../adr/0010-retire-local-job-server.md)). Its paths below no longer exist, and the items that target them are closed.

> The inventory and migration plan below record the 2026-05-05 triage. Job-server-specific entries are historical; this document does not establish the current status of dashboard error handling.

This document records the error classes identified by the 2026-05-05 triage,
distinguishes the then-observed similarities and differences, and preserves
the proposed consolidation path for [#41](https://github.com/jclee941/resume/issues/41).

---

## Historical inventory

### A. `packages/shared/src/errors/index.js` (267 LOC)

The **canonical** error system used by the portfolio worker, packages/cli,
and any shared module. API-stable.

| Class                      | Extends     | Purpose                                                                      | Construction                                      |
| -------------------------- | ----------- | ---------------------------------------------------------------------------- | ------------------------------------------------- |
| `AppError`                 | `Error`     | Base operational error with `errorCode`, `isOperational`, `context`, `cause` | `new AppError(message, options)` (options object) |
| `HttpError`                | `AppError`  | HTTP error with `statusCode`                                                 | `new HttpError(message, statusCode, options)`     |
| `BadRequestError`          | `HttpError` | 400                                                                          | shorthand                                         |
| `UnauthorizedError`        | `HttpError` | 401                                                                          | shorthand                                         |
| `ForbiddenError`           | `HttpError` | 403                                                                          | shorthand                                         |
| `NotFoundError`            | `HttpError` | 404                                                                          | shorthand                                         |
| `RateLimitError`           | `HttpError` | 429 + retry-after metadata                                                   | shorthand                                         |
| `CrawlerError`             | `AppError`  | Crawler-layer failure                                                        | `new CrawlerError(...)`                           |
| `AuthError`                | `AppError`  | Authentication failure                                                       | `new AuthError(...)`                              |
| `ValidationError`          | `AppError`  | Schema/payload validation                                                    | `new ValidationError(...)`                        |
| `ExternalServiceError`     | `AppError`  | Third-party API failure                                                      | `new ExternalServiceError(...)`                   |
| `normalizeError(err, ctx)` | function    | Coerces unknown thrown values to `AppError`                                  | —                                                 |

### B. `apps/job-server/src/shared/errors/` (subset, 510 LOC across 6 files)

App-local error system used by the job-server MCP runtime, Wanted clients, and
the apply pipeline. **Not yet consolidated with A.**

#### B-1. `app-error.js` (48 LOC)

| Class      | Extends | Purpose                                                   | Construction                                                                     |
| ---------- | ------- | --------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `AppError` | `Error` | Base error with `code`, `statusCode`, `metadata`, `cause` | `new AppError(message, code, statusCode, metadata, cause)` (**positional args**) |

**Divergence from A**: completely different constructor signature
(positional args vs options object). Field names also differ
(`errorCode`/`context` in A → `code`/`metadata` in B).

#### B-2. `domain-errors.js` (115 LOC)

| Class                  | Extends        | Counterpart in A                                           |
| ---------------------- | -------------- | ---------------------------------------------------------- |
| `ValidationError`      | B-1 `AppError` | A's `ValidationError` (different constructor)              |
| `AuthenticationError`  | B-1 `AppError` | A's `AuthError` (different name + constructor)             |
| `RateLimitError`       | B-1 `AppError` | A's `RateLimitError` (different — A's extends `HttpError`) |
| `CrawlerError`         | B-1 `AppError` | A's `CrawlerError` (different constructor)                 |
| `PlatformError`        | B-1 `AppError` | **No counterpart in A** — keep as job-server-specific      |
| `ExternalServiceError` | B-1 `AppError` | A's `ExternalServiceError` (different constructor)         |

**Divergence from A**: same names with different constructor APIs;
`PlatformError` is genuinely new.

#### B-3. `apply-errors.js` (184 LOC) — **intentionally divergent**

| Class                             | Extends        | Purpose                                                                 |
| --------------------------------- | -------------- | ----------------------------------------------------------------------- |
| `ApplyError`                      | B-1 `AppError` | Base for the Wanted apply pipeline (form-fill failures)                 |
| `NetworkError`                    | `ApplyError`   | Network-level apply failure                                             |
| `AuthError`                       | `ApplyError`   | Auth-token-expired during apply                                         |
| `RateLimitError`                  | `ApplyError`   | Wanted rate-limit hit (note: collides with B-2 `RateLimitError`)        |
| `CaptchaError`                    | `ApplyError`   | Captcha challenge encountered                                           |
| `ValidationError`                 | `ApplyError`   | Form-validation-side reject (note: collides with B-2 `ValidationError`) |
| `CircuitOpenError`                | `ApplyError`   | Circuit breaker is open                                                 |
| `classifyApplyError(error, opts)` | function       | Coerces unknown thrown values into the apply hierarchy                  |
| `isRetryableApplyError(error)`    | function       | Predicate used by retry logic                                           |

**Justification for divergence**: the apply pipeline has domain-specific
retry behavior (circuit breaker per platform, captcha-vs-network distinction,
and retry-after handling) that the generic A hierarchy does
not express. **Keep apply-errors local**.

#### B-4. `error-codes.js` (31 LOC)

`ErrorCodes` enum-like object. Job-server-specific.

#### B-5. `error-formatter.js` (128 LOC)

Renders B-1/B-2 errors into MCP response format. Tightly coupled to the
job-server MCP runtime. **Keep local**.

#### B-6. `index.js` (4 LOC)

Barrel export.

### C. `apps/job-dashboard/src/handlers/*.js` — inline `{ error, status }` objects

Several handlers throw plain `{ error: '...', status: 4xx }` objects rather
than typed errors. Not a class hierarchy — a missing layer.

| Pattern                               | Where                                            | Issue                                                |
| ------------------------------------- | ------------------------------------------------ | ---------------------------------------------------- |
| `throw { error: '...', status: 4xx }` | applications.js, auth.js, webhook.js (≈12 sites) | No structured error type, no `cause`, no `errorCode` |

---

## Identical / Divergent Decisions

| Pair                                                  | Identical?                                             | Decision                                                                      |
| ----------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------- |
| A `AppError` ↔ B-1 `AppError`                         | **No** (constructor API differs)                       | Migrate B → A's options-object constructor in a future PR (B-1 to be deleted) |
| A `ValidationError` ↔ B-2 `ValidationError`           | **No** (constructor)                                   | Migrate B → A; remove B-2's class once consumers updated                      |
| A `AuthError` ↔ B-2 `AuthenticationError`             | **No** (also name differs)                             | Rename B-2's `AuthenticationError` → `AuthError` and migrate to A             |
| A `RateLimitError` ↔ B-2 `RateLimitError`             | **No** (A extends `HttpError`, B-2 extends `AppError`) | Migrate B-2 → A (gain HTTP-status semantics)                                  |
| A `CrawlerError` ↔ B-2 `CrawlerError`                 | **No** (constructor)                                   | Migrate B-2 → A                                                               |
| A `ExternalServiceError` ↔ B-2 `ExternalServiceError` | **No** (constructor)                                   | Migrate B-2 → A                                                               |
| B-2 `PlatformError`                                   | unique to job-server                                   | Keep, but rebase onto A `AppError`                                            |
| B-3 `ApplyError` and subclasses                       | **intentionally divergent**                            | Keep, rebase onto A `AppError`                                                |
| C inline objects                                      | unstructured                                           | Replace with A `BadRequestError` / `UnauthorizedError` / etc.                 |

---

## Historical migration plan

The original triage estimated that consolidation as **medium-large effort**
(touching every job-server service and each listed dashboard handler). It
recorded this document as a standalone prerequisite; current issue status is
not established here.

### Phase 1 (this issue, doc-only) — **complete**

- [x] Inventory every error class (this document).
- [x] Identify identical vs divergent.
- [x] Decide canonical home: **`packages/shared/src/errors/`**.
- [x] Decide on `ErrorCodes`: centralize in `packages/shared/src/errors/codes.js`
      in Phase 2 (currently lives in B-4).

### Phase 2 (follow-up PR) — pending

- [ ] Move `ErrorCodes` enum to `packages/shared/src/errors/codes.js`. Update
      B-1 to import from canonical.
- [ ] Add a B-1 → A compatibility shim that bridges the positional-arg
      constructor to the options-object constructor (so existing callers continue
      working during the migration window).
- [ ] Migrate one job-server service at a time to import from A.
- [ ] Delete B-1, B-2 after all consumers migrated.
- [ ] Replace C's inline `{ error, status }` objects with `HttpError` subclass
      throws.

### Phase 3 (follow-up PR) — pending

- [ ] Rebase B-3 (`apply-errors.js`) onto A's `AppError` constructor while
      keeping the apply-specific subclasses (`ApplyError`, `CircuitOpenError`,
      `CaptchaError`).
- [ ] Update `classifyApplyError` and `isRetryableApplyError` to interoperate
      with A's `normalizeError`.

---

## Original document verification note

The original note says the triage doc was added without code changes. It says the document satisfied the
**first** acceptance bullet of #41:

> Triage doc enumerating each error's purpose, distinguishing identical ones
> from intentionally divergent ones.

The original note tracked the remaining bullets (canonical hierarchy
migration, `ErrorCodes` centralization, and inline-object replacement) under
Phases 2 and 3 and said they remained on #41. Their current status is not
established here.

---

## See Also

- [`docs/architecture/SSOT_IMPROVEMENT_PLAN.md`](./SSOT_IMPROVEMENT_PLAN.md)
  § SSOT-032 — original consolidation entry.
- [`packages/shared/src/errors/index.js`](../../packages/shared/src/errors/index.js)
  — canonical hierarchy (system A).
- Historical retired path: `apps/job-server/src/shared/errors/` — job-server-local hierarchy (systems B-1 through B-6). No successor path is asserted.
