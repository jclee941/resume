# Cloudflare KV Namespace Ownership Contract

**Status:** Authoritative — required reading before changing any KV-related code
in `apps/portfolio` or `apps/job-dashboard`.
**Last updated:** 2026-09-26
**Related task:** SSOT-005 (`docs/architecture/SSOT_IMPROVEMENT_PLAN.md`)

---

## Bindings

`apps/portfolio` (the `resume.jclee.me` edge router) and `apps/job-dashboard`
(the in-process `/job/*` dashboard, ADR 0009) run inside the single `resume`
Worker defined by the root `wrangler.jsonc`, so both code paths share the same
three KV bindings:

| Binding         | KV namespace ID                    | Used by                                                                 |
| --------------- | ---------------------------------- | ----------------------------------------------------------------------- |
| `SESSIONS`      | `2b81b9b02dc34f518d2ca9552804bfef` | job-dashboard sessions, config, backups; portfolio health probe (reads) |
| `RATE_LIMIT_KV` | `fe51b0f1c2c44841b4895e8747cb408a` | job-dashboard API rate limiter and notification dead-letter log         |
| `NONCE_KV`      | `3e282b1b906c474aadcc947a06f0c1ad` | job-dashboard webhook replay protection                                 |

Portfolio page and asset rate limiting is in-memory per isolate
(`apps/portfolio/lib/worker-runtime-helpers.js`) and does not touch
`RATE_LIMIT_KV`.

---

## Key inventory

Keys start with a namespace segment. A change that adds, renames, or removes a
key pattern updates this inventory in the same commit, and every `put()` sets
`expirationTtl`.

### `SESSIONS`

| Key pattern                       | Writer                                                      | Readers                                                   | TTL               |
| --------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------- | ----------------- |
| `auth:<platform>`                 | `services/platform-session.js` (session mint, auth handler) | session consumers via `decryptPlatformSession`            | set by the writer |
| `config:notification:preferences` | `services/notifications/history-preferences.js`             | same module                                               | 30 days           |
| `resume:backup:<backupId>`        | ResumeSyncWorkflow (`workflows/resume-sync-steps.js`)       | none (manual restore aid)                                 | 30 days           |
| `jd:health:check`                 | HealthCheckWorkflow KV probe                                | same probe (read-back)                                    | 60 seconds        |
| `pf:health:check`                 | none                                                        | portfolio `/health` and `/api/status` (connectivity read) | not written       |

`auth:<platform>` values are AES-GCM ciphertext under the `ENCRYPTION_KEY`
Worker secret; a value that does not decrypt is treated as absent.
CleanupWorkflow scans the `auth:` prefix and deletes only expired plaintext
records.

### `RATE_LIMIT_KV`

| Key pattern                                     | Writer                                                                   | TTL                      |
| ----------------------------------------------- | ------------------------------------------------------------------------ | ------------------------ |
| `ratelimit:v2:<policy>:<ip>:<endpoint>:<state>` | `@resume/shared/rate-limit` KV sliding window (job-dashboard `index.js`) | window, strike, or block |
| `failed_notification:<jobId>`                   | `queues/notification-dlq-handler.js`                                     | 30 days                  |

The limiter is best-effort (KV reads and writes are not atomic). CleanupWorkflow
deletes only keys whose `expiration` has already passed.

### `NONCE_KV`

| Key pattern                       | Writer and reader                    | TTL        |
| --------------------------------- | ------------------------------------ | ---------- |
| `webhook:nonce:<timestamp>:<sig>` | `services/auth-webhook-signature.js` | 10 minutes |

---

## Rules

1. Public, unauthenticated routes never write KV per request. KV accepts about
   one write per second per key and bills every write; probe connectivity with
   `get()` instead.
2. Bulk `list()` + `delete()` sweeps pass a `prefix` or delete only keys that
   are already expired.
3. `auth:*` values go through `services/platform-session.js`; never store a
   plaintext session.
4. New key patterns reuse a namespace above or add a row here in the same
   change.

---

## Verification checklist (run before any KV-related PR)

- [ ] Every new `put()` uses a documented key pattern and sets `expirationTtl`.
- [ ] No bulk `list()` + `delete()` without a `prefix` or expiry filter.
- [ ] Session writes use `writePlatformSession()`.
- [ ] This document lists every key pattern the change adds or removes.
