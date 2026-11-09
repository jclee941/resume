# KV Cache Test Coverage Plan — Issue #31 / P2-13

**Status**: Historical plan snapshot · **Owner**: Platform · **Snapshot date**: 2026-05-05

> **2026-09-29:** `apps/job-server` was retired ([ADR 0010](../adr/0010-retire-local-job-server.md)), so the three-tier cache this plan meant to promote no longer exists. The shared-cache promotion is void. The proposed tests for direct KV calls require a fresh inventory before use. `workflows/backup.js` was removed with BackupWorkflow (D1 Time Travel covers backups).
>
> The inventory and phases below preserve the 2026-05-05 proposal; they are not a current coverage report or implementation queue.

The original proposal inventoried KV-cache code paths and proposed unit tests
for read/write/TTL/expiry/failure semantics. Its inventory and missing-test
claims require current verification.

---

## Inventory

KV is used by both Worker apps (portfolio + job-dashboard). Search:

```bash
grep -rln 'env\.\(SESSIONS\|RATE_LIMIT_KV\|NONCE_KV\)\|cache\.\(put\|get\|delete\)' \
  --include='*.js' apps/
```

returns:

| File                                                                     | KV usage                                    | Existing test coverage                                    |
| ------------------------------------------------------------------------ | ------------------------------------------- | --------------------------------------------------------- |
| `apps/job-dashboard/src/middleware/rate-limit.js`                        | KV sliding-window                           | covered indirectly via integration tests                  |
| `apps/job-dashboard/src/routes/workflows.js`                             | KV idempotency keys                         | none                                                      |
| `apps/job-dashboard/src/routes/health.js`                                | KV ping                                     | none                                                      |
| `apps/job-dashboard/src/queues/notification-dlq-handler.js`              | KV dedup                                    | none                                                      |
| `apps/job-dashboard/src/workflows/backup.js`                             | KV backup metadata                          | none                                                      |
| `apps/job-dashboard/src/workflows/resume-sync-platforms.js`              | KV per-platform state                       | none                                                      |
| `apps/job-dashboard/src/workflows/application/profile.js`                | KV profile cache                            | none                                                      |
| `apps/job-dashboard/src/workflows/application/platforms.js`              | KV per-platform state                       | none                                                      |
| `apps/job-dashboard/src/workflows/job-crawling/platform-crawlers.js`     | KV crawler cursors                          | none                                                      |
| `apps/job-dashboard/src/workflows/job-crawling/job-crawling-workflow.js` | KV workflow state                           | none                                                      |
| `apps/job-server/src/shared/services/cache/`                             | retired three-tier cache (memory + KV + D1) | **100% coverage** (claim recorded in 2026-05-05 proposal) |
| `apps/job-server/src/shared/services/cache.js`                           | LRUCache (in-memory only, not KV)           | tests in `__tests__/performance.test.js` only             |

The proposal described `apps/job-server/src/shared/services/cache/` as its
mature reference. That path was retired with job-server. The claimed coverage
and the list of nine dashboard files are historical and need a fresh check
before they are used as current evidence.

---

## Decision

The cleanest fix is **two-fold**:

1. **Promote the three-tier cache from `apps/job-server/src/shared/services/cache/`
   to `packages/shared/src/cache/`** so job-dashboard can adopt it. This
   makes the per-file ad-hoc KV calls go through the same well-tested
   implementation. (Aligns with Epic 4 / SSOT consolidation philosophy.)

2. **Add unit tests for the remaining ad-hoc KV touch points** with mocked
   KV bindings, using the `KVNamespaceMock` pattern already in
   `apps/job-server/src/test-helpers/mocks.js`.

Step 1 deduplicates by elimination; step 2 covers what cannot be elevated
into the shared layer (per-file domain-specific coordination).

---

## Migration Plan

### Phase 1 (this PR) — **complete**

- [x] Inventory the 9 ad-hoc KV touch points in `apps/job-dashboard/`.
- [x] Confirm `apps/job-server/src/shared/services/cache/` is the mature
      reference (100% coverage, 20 tests, three-tier semantics already
      exercised).
- [x] Decide elevation path: promote to `packages/shared/src/cache/` with
      Phase 2 deduplication in job-dashboard.

### Phase 2 (historical follow-up proposal — promote shared cache)

- [ ] Move `apps/job-server/src/shared/services/cache/` →
      `packages/shared/src/cache/` with subpath export
      `@resume/shared/cache`.
- [ ] Re-run the 20 tests in their new home; verify 100% coverage holds.
- [ ] Update job-server import paths to `@resume/shared/cache`.

### Phase 3 (historical follow-up proposal — adopt in job-dashboard)

- [ ] Migrate the 4 originally listed consumers
      (`workflows/backup.js` was removed with BackupWorkflow;
      `workflows/resume-sync-platforms.js`,
      `workflows/job-crawling/job-crawling-workflow.js`,
      `routes/health.js`) to consume `@resume/shared/cache`.
- [ ] Add per-consumer test files asserting cache hit / miss / TTL /
      failure semantics with `KVNamespaceMock`.

### Phase 4 (historical follow-up proposal — adopt in middleware + remaining workflows)

- [ ] Migrate `middleware/rate-limit.js` (highest-risk, production HTTP
      path) once Phase 3 has burned in.
- [ ] Migrate the remaining 4 workflow consumers.
- [ ] Delete any duplicated KV helpers that remain.

---

## Acceptance Criteria

- [ ] Per-file unit tests covering: cache hit, miss, expiration / stale
      behavior, write failure (KV throw), read failure (KV throw).
- [ ] No live Cloudflare KV calls in any `*.test.js` file.
- [ ] `c8` coverage on `packages/shared/src/cache/` ≥ 90% across stmts,
      branches, lines, funcs (already 100% today; preserve).
- [ ] CI integration: tests run on every PR via the existing `test-jest` /
      `test-node` jobs.

---

## Verification (this PR)

The original note says this document added a plan without code changes. Its
implementation phases and acceptance criteria are retained as historical
proposals, not current work status.

---

## See Also

- Historical retired path: `apps/job-server/src/shared/services/cache/` — the proposal's three-tier cache reference; its coverage claim is not current verification.
- Historical retired path: `apps/job-server/src/test-helpers/mocks.js` — the proposal's `KVNamespaceMock` reference; no successor path is asserted.
- [`docs/architecture/TECH_DEBT_AUDIT_2026-04-29.md`](./TECH_DEBT_AUDIT_2026-04-29.md)
  § KV cache — original audit finding.
