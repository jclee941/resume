# SHARED PACKAGE KNOWLEDGE BASE

**Generated:** 2026-10-09
**Commit:** `f24027a0`
**Branch:** `master`

## OVERVIEW

Worker-compatible utility domains, platform clients, and reusable resume mappings behind explicit subpath exports.

Scope reason: score 13; shared runtime and export boundary.

## WHERE TO LOOK

| Task                  | Location                                    | Notes                                                                 |
| --------------------- | ------------------------------------------- | --------------------------------------------------------------------- |
| Export map            | `package.json`                              | No root export; explicit subpaths and one mapping wildcard            |
| Errors/validation     | `src/errors/`, `src/validation/`            | Typed failures and schema adapters                                    |
| Logging               | `src/logger/`                               | Logger, request context, console and optional Loki transports         |
| Browser adapter       | `src/browser/`                              | Public imports are `browser/service` and `browser/stealth`            |
| Wanted API            | `src/clients/wanted/`                       | Explicit client/profile/resume subpaths, no endpoint wildcard         |
| Retry and rate limits | `src/retry/`, `src/rate-limit/`             | Circuit breaking, HTTP retries, KV-backed limits                      |
| Encryption            | `src/crypto/`                               | Root exposes constants; `crypto/webcrypto` exposes encryption helpers |
| Sessions/auth/cookies | `src/session/`, `src/auth/`, `src/cookies/` | Separate normalization, constants, cookie, and HMAC exports           |
| Platform mappings     | `src/platform-sync/`                        | Wanted, JobKorea, Remember, SK Careers                                |
| Job URL policy        | `src/job-url-canonicalization.js`           | Cross-application canonicalization                                    |

## CONVENTIONS

- Import `@resume/shared/<subpath>`; `@resume/shared` and `@resume/shared/browser` are not exported.
- Nested platform directories have explicit entries; `platform-sync/*` covers flat helper files.
- `session` exports normalization only; cookie and constant consumers use their dedicated subpaths.
- Keep domain barrels thin and module I/O explicit.
- Browser support uses optional `@cloudflare/puppeteer`; cryptography uses WebCrypto.
- Prefer structured Logger transports for new logging; console transport and existing diagnostic calls are not forbidden by ESLint.
- Run `npm run test:shared` for colocated Node tests; `npm run test:jest` also covers shared consumers.
- Public export regression coverage lives in `tests/unit/shared/package-exports.test.js`.

## ANTI-PATTERNS

- Do not infer a Wanted endpoint subpath from the source directory layout.
- Do not send encryption callers to the constants-only `crypto` barrel.
- Do not restore removed host session stores or retired Elasticsearch exports.
- Do not add app-specific route or orchestration policy to reusable helpers.

Parent: [../AGENTS.md](../AGENTS.md)
