# Cloudflare KV Namespace Ownership Contract

**Status:** Authoritative — required reading before changing any KV-related code in `apps/portfolio` or `apps/job-dashboard`.
**Last updated:** 2026-04-27
**Related task:** SSOT-005 (`docs/architecture/SSOT_IMPROVEMENT_PLAN.md`)

---

## Problem statement

`apps/portfolio` (Cloudflare Worker at `resume.jclee.me`) and `apps/job-dashboard`
(Cloudflare Worker at `resume.jclee.me/job/*`, deployed independently) currently
bind to the **same three KV namespaces by ID** in their respective
`wrangler.jsonc` files:

| Binding name      | KV namespace ID                    | portfolio | job-dashboard |
|-------------------|------------------------------------|-----------|---------------|
| `SESSIONS`        | `2b81b9b02dc34f518d2ca9552804bfef` | bound     | bound         |
| `RATE_LIMIT_KV`   | `fe51b0f1c2c44841b4895e8747cb408a` | bound     | bound         |
| `NONCE_KV`        | `3e282b1b906c474aadcc947a06f0c1ad` | bound     | bound         |

This is **intentional sharing** (both workers serve the same surface area at
`resume.jclee.me`), but until this document existed there was no **key-naming
convention or read/write contract** enforcing that the two workers do not
accidentally collide on key names. A bug in either worker could overwrite or
corrupt the other's data without warning.

---

## Key-prefix convention (enforced by code review)

All keys written by either worker MUST be prefixed by a **two-letter origin
tag** followed by `:`. Reads MAY scan unprefixed keys ONLY for documented
shared records (see "Shared records" below).

| Origin             | Prefix | Example                                    |
|--------------------|--------|--------------------------------------------|
| portfolio worker   | `pf:`  | `pf:nonce:abc123`, `pf:health:_check`      |
| job-dashboard      | `jd:`  | `jd:auth:wanted`, `jd:rate:ip:1.2.3.4`     |
| **shared records** | none   | `auth:wanted`, `resume:current`, `backup:*`|

**Migration path for legacy unprefixed keys**: existing code uses unprefixed
`auth:wanted`, `resume:current`, `backup:*` keys (see "Current key inventory"
below). These are grandfathered as shared records. **No new unprefixed keys may
be added.**

---

## Per-binding read/write matrix

### `SESSIONS`

Stores: auth tokens (Wanted/JobKorea), resume snapshots, workflow
checkpoints, backups, health check probe data.

| Key pattern               | Owner          | Readers              | Notes                                      |
|---------------------------|----------------|----------------------|--------------------------------------------|
| `auth:wanted`             | job-dashboard  | job-dashboard, portfolio (read-only) | Wanted OneID session, 24h TTL              |
| `auth:{platform}`         | job-dashboard  | job-dashboard        | Per-platform session blob                  |
| `resume:current`          | job-dashboard  | job-dashboard        | Latest resume snapshot from packages/data  |
| `backup:*`                | job-dashboard  | job-dashboard        | D1 export snapshots from `backup` workflow |
| `pf:health:*`             | portfolio      | portfolio            | Worker health probe                        |
| `jd:health:*`             | job-dashboard  | job-dashboard        | Worker health probe                        |

**Existing usage (verified 2026-04-27):**
- `apps/portfolio/lib/worker-routes.js:193-194` — writes `_health_check` ❗
  (legacy unprefixed; should be migrated to `pf:health:check`)
- `apps/job-dashboard/src/workflows/resume-sync-helpers.js:48,182` — reads `auth:wanted`
- `apps/job-dashboard/src/workflows/backup.js:103,132,141` — `backup:*`
- `apps/job-dashboard/src/workflows/cleanup.js:42-60` — purges `auth:*` over TTL
- `apps/job-dashboard/src/workflows/application/profile.js:65` — reads `resume:current`
- `apps/job-dashboard/src/workflows/application/platforms.js:17,150` — reads `auth:wanted`
- `apps/job-dashboard/src/workflows/job-crawling.js:45,230` — reads `auth:{platform}`

### `RATE_LIMIT_KV`

Stores: HTTP rate-limit windows, strike counts, block states, DLQ failures.

| Key pattern             | Owner         | Readers       | Notes                                      |
|-------------------------|---------------|---------------|--------------------------------------------|
| `jd:rate:ip:*`          | job-dashboard | job-dashboard | IP-based sliding window                    |
| `jd:rate:strike:*`      | job-dashboard | job-dashboard | Strike count for repeat violators          |
| `jd:rate:block:*`       | job-dashboard | job-dashboard | Active block state                         |
| `jd:dlq:*`              | job-dashboard | job-dashboard | DLQ snapshots from notification queue      |
| `pf:rate:*`             | portfolio     | portfolio     | (currently unused — reserved)              |

**Existing usage:**
- `apps/job-dashboard/src/middleware/rate-limit.js:55,75,79,90,92,121` —
  uses unprefixed keys (must migrate to `jd:rate:*`)
- `apps/job-dashboard/src/queues/notification-dlq-handler.js:113` — DLQ writes
- `apps/job-dashboard/src/workflows/cleanup.js:138,150` — purges entire KV (HAZARD: would also wipe `pf:*` keys if portfolio adopts this binding)

### `NONCE_KV`

Stores: one-time CSP nonces, CSRF tokens, single-use redirect tokens.

| Key pattern             | Owner         | Readers       | Notes                                      |
|-------------------------|---------------|---------------|--------------------------------------------|
| `pf:nonce:*`            | portfolio     | portfolio     | CSP nonces, ~5 min TTL                     |
| `jd:csrf:*`             | job-dashboard | job-dashboard | CSRF token store for admin forms           |

---

## Shared records (grandfathered — do NOT add to this list)

The following unprefixed keys are read by both workers in their current state
and are considered shared records. Modifying their schema requires updating
**both** workers in the same release.

- `SESSIONS::auth:wanted` — Wanted session, written by job-dashboard, may be
  read by portfolio in future for proxy auth contexts.
- `SESSIONS::resume:current` — canonical resume snapshot.

---

## Hazardous patterns to avoid

1. **Bulk `list()` + `delete()` without prefix** (e.g.
   `apps/job-dashboard/src/workflows/cleanup.js:138-150`) — currently safe
   because portfolio writes nothing to `RATE_LIMIT_KV`, but the moment
   portfolio writes a `pf:rate:*` key, this code will silently delete it. Add
   a `prefix: 'jd:'` filter when migrating.
2. **Reusing the same KV ID across environments** — if you ever bind the
   production `2b81b9b02dc34f518d2ca9552804bfef` to a preview worker, you risk
   preview traffic mutating production keys. Use `preview_id` distinct from
   `id`.
3. **Reading without TTL awareness** — `auth:wanted` is auto-expired by
   cleanup.js. Always defensive-check for `null` reads.

---

## Future evolution (cross-reference)

- **SSOT-015** (Wrangler base config) — extracts `compatibility_date` and
  `compatibility_flags` to a shared base; this doc evolves to reference that
  base.
- **SSOT-035** (Rate limit consolidation) — moves the `RATE_LIMIT_KV` access
  pattern from app-local middleware to `packages/shared/rate-limit/`. This
  doc's prefix conventions become enforceable as primitive options.
- **SSOT-052** (`Env` interface SSOT) — types these bindings in
  `packages/contracts/src/env.ts` so collisions are visible at type-check time.

---

## Rollback procedure

If an accidental key collision is detected (e.g. portfolio overwrites
`auth:wanted`):

1. Pause writes from the offending worker via Cloudflare dashboard
   (`Workers → Triggers → Disable`).
2. Restore from the most recent `backup:*` snapshot in SESSIONS.
3. Run `apps/job-dashboard` `cleanup` workflow to refresh expired sessions.
4. Re-enable the offending worker only after a code-level prefix fix has
   landed and been verified in preview environment.

---

## Verification checklist (run before any KV-related PR)

- [ ] All new `env.SESSIONS.put()` / `.delete()` / `.list({prefix})` calls use
      one of the documented prefixes.
- [ ] No bulk `list()` without `prefix` option.
- [ ] If touching `auth:*`, `resume:*`, or `backup:*`, both `apps/portfolio`
      and `apps/job-dashboard` were inspected for impact.
- [ ] Updated this document if a new key pattern was introduced.
