# KV Cache Test Coverage Plan — Issue #31 / P2-13

**Status**: Active plan · **Owner**: Platform · **Last Updated**: 2026-05-05

This document inventories the KV-cache code paths in the monorepo and
prescribes the unit tests that are still missing for deterministic CI
coverage of read/write/TTL/expiry/failure semantics.

---

## Inventory

KV is used by both Worker apps (portfolio + job-dashboard). Search:

```bash
grep -rln 'env\.\(SESSIONS\|RATE_LIMIT_KV\|NONCE_KV\)\|cache\.\(put\|get\|delete\)' \
  --include='*.js' apps/
```

returns:

| File                                                                     | KV usage                            | Existing test coverage                        |
| ------------------------------------------------------------------------ | ----------------------------------- | --------------------------------------------- |
| `apps/job-dashboard/src/middleware/rate-limit.js`                        | KV sliding-window                   | covered indirectly via integration tests      |
| `apps/job-dashboard/src/routes/workflows.js`                             | KV idempotency keys                 | none                                          |
| `apps/job-dashboard/src/routes/health.js`                                | KV ping                             | none                                          |
| `apps/job-dashboard/src/queues/notification-dlq-handler.js`              | KV dedup                            | none                                          |
| `apps/job-dashboard/src/workflows/backup.js`                             | KV backup metadata                  | none                                          |
| `apps/job-dashboard/src/workflows/resume-sync-platforms.js`              | KV per-platform state               | none                                          |
| `apps/job-dashboard/src/workflows/application/profile.js`                | KV profile cache                    | none                                          |
| `apps/job-dashboard/src/workflows/application/platforms.js`              | KV per-platform state               | none                                          |
| `apps/job-dashboard/src/workflows/job-crawling/platform-crawlers.js`     | KV crawler cursors                  | none                                          |
| `apps/job-dashboard/src/workflows/job-crawling/job-crawling-workflow.js` | KV workflow state                   | none                                          |
| `apps/job-server/src/shared/services/cache/`                             | three-tier cache (memory + KV + D1) | **100% coverage** (verified locally)          |
| `apps/job-server/src/shared/services/cache.js`                           | LRUCache (in-memory only, not KV)   | tests in `__tests__/performance.test.js` only |

The mature pattern lives in `apps/job-server/src/shared/services/cache/` —
already 100% statement / branch / line / function coverage with 20 tests.
The gap is: **the 9 files in `apps/job-dashboard/` that touch KV directly,
without going through a shared cache layer**.

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

### Phase 2 (follow-up PR — promote shared cache)

- [ ] Move `apps/job-server/src/shared/services/cache/` →
      `packages/shared/src/cache/` with subpath export
      `@resume/shared/cache`.
- [ ] Re-run the 20 tests in their new home; verify 100% coverage holds.
- [ ] Update job-server import paths to `@resume/shared/cache`.

### Phase 3 (follow-up PR — adopt in job-dashboard)

- [ ] Migrate the 4 lowest-risk consumers
      (`workflows/backup.js`, `workflows/resume-sync-platforms.js`,
      `workflows/job-crawling/job-crawling-workflow.js`,
      `routes/health.js`) to consume `@resume/shared/cache`.
- [ ] Add per-consumer test files asserting cache hit / miss / TTL /
      failure semantics with `KVNamespaceMock`.

### Phase 4 (follow-up PR — adopt in middleware + remaining workflows)

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

This PR adds the plan only — no code changes. The implementation work is
sliced into Phase 2/3/4 PRs above.

---

## See Also

- [`apps/job-server/src/shared/services/cache/`](../../apps/job-server/src/shared/services/cache/)
  — mature three-tier cache (memory + KV + D1); 100% coverage.
- [`apps/job-server/src/test-helpers/mocks.js`](../../apps/job-server/src/test-helpers/mocks.js)
  — `KVNamespaceMock` pattern to be reused in Phase 3/4 tests.
- [`docs/architecture/TECH_DEBT_AUDIT_2026-04-29.md`](./TECH_DEBT_AUDIT_2026-04-29.md)
  § KV cache — original audit finding.
