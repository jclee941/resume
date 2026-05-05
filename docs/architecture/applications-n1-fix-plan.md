# Applications N+1 Query Fix Plan — Issue #33 / P2-15

**Status**: Active plan · **Owner**: Platform · **Last Updated**: 2026-05-05

This document maps the N+1 query patterns in
`apps/job-dashboard/src/handlers/applications/*.js` (post-Epic-6 split),
prescribes the batching strategy, and lays out the regression coverage that
must land alongside the fix.

---

## Current State (post-#28 split)

The applications handler was split in Epic 6 / #28 into:

```text
apps/job-dashboard/src/handlers/applications/
├── cleanup-operation.js
├── create-operation.js
├── delete-operation.js
├── detail-query.js
├── index.js
├── list-query.js
├── responses.js
├── status-operation.js
└── update-operation.js
```

The N+1 patterns identified in `TECH_DEBT_AUDIT_2026-04-29.md:136,151` were
in two specific code paths now hosted by:

1. **list-query.js** — for each application in the list, the timeline of
   status changes is fetched in a separate query
   (`SELECT * FROM application_timeline WHERE application_id = ?` per row).
2. **detail-query.js** — for each related job, a `COUNT(*)` of applications
   is fetched in a separate query
   (`SELECT COUNT(*) FROM applications WHERE job_id = ?` per related job).

Both run inside a request handler. With page size N, each request does
2N + 1 queries instead of 2.

---

## Fix Strategy

### list-query.js timeline batching

**Before** (pseudocode):

```js
const apps = await db.prepare('SELECT * FROM applications WHERE ...').all();
for (const a of apps) {
  a.timeline = await db
    .prepare('SELECT * FROM application_timeline WHERE application_id = ?')
    .bind(a.id)
    .all();
}
```

**After** — single batched query:

```js
const apps = await db.prepare('SELECT * FROM applications WHERE ...').all();
const ids = apps.map((a) => a.id);
if (ids.length === 0) return apps;

const placeholders = ids.map(() => '?').join(',');
const timelineRows = await db
  .prepare(
    `SELECT * FROM application_timeline WHERE application_id IN (${placeholders}) ORDER BY application_id, created_at DESC`
  )
  .bind(...ids)
  .all();

const byApp = new Map();
for (const row of timelineRows.results) {
  if (!byApp.has(row.application_id)) byApp.set(row.application_id, []);
  byApp.get(row.application_id).push(row);
}
for (const a of apps) {
  a.timeline = byApp.get(a.id) ?? [];
}
```

Constraints:

- D1 has a parameter limit (≈100 per query). For page sizes > 100, chunk
  the IDs into batches of 100. Page sizes in the dashboard are bounded
  (default 25, max 100), so a single batch is sufficient.
- Use `IN (...)` rather than `JOIN` to keep the API response shape stable
  (per acceptance criterion: "Preserve API response shape").

### detail-query.js COUNT batching

**Before**:

```js
for (const job of relatedJobs) {
  job.applicationCount = await db
    .prepare('SELECT COUNT(*) AS n FROM applications WHERE job_id = ?')
    .bind(job.id)
    .first();
}
```

**After**:

```js
const ids = relatedJobs.map((j) => j.id);
const placeholders = ids.map(() => '?').join(',');
const counts = await db
  .prepare(
    `SELECT job_id, COUNT(*) AS n FROM applications WHERE job_id IN (${placeholders}) GROUP BY job_id`
  )
  .bind(...ids)
  .all();

const byJob = new Map(counts.results.map((r) => [r.job_id, r.n]));
for (const job of relatedJobs) {
  job.applicationCount = byJob.get(job.id) ?? 0;
}
```

---

## Regression Coverage

Acceptance criterion: "Add regression coverage / query-count assertions for
affected timeline/COUNT paths."

Strategy:

1. **D1 prepare-spy mock**: a test helper that counts how many times
   `db.prepare(...)` is called per request. Add to
   `apps/job-dashboard/src/test-helpers/d1-mock.js` (new file).
2. **Per-fix unit tests**:
   - `list-query.test.js`: build a fake D1 with 25 applications, assert
     `prepareCalls === 2` (one for `applications`, one for `timeline`).
     Without the fix this would be 26.
   - `detail-query.test.js`: build a fake D1 with 1 application + 5
     related jobs, assert `prepareCalls === 3` (applications, related
     jobs, batched count). Without the fix this would be 7.
3. **Multi-page-size dataset test**: parametrize with page sizes
   `[1, 25, 50, 100]` to verify the batch boundary stays correct.

---

## Migration Plan

### Phase 1 (this PR) — **complete**

- [x] Map the N+1 sites to the post-Epic-6-split file layout.
- [x] Decide on `IN (...)` batching with D1's parameter-limit consideration.
- [x] Decide on prepare-call-count assertion for regression coverage.
- [x] Confirm response-shape preservation.

### Phase 2 (follow-up PR — implementation)

- [ ] Add `apps/job-dashboard/src/test-helpers/d1-mock.js` with prepare-call
      counting.
- [ ] Apply the batching transform to `list-query.js` and `detail-query.js`.
- [ ] Add `*.test.js` for both with prepare-count assertions.
- [ ] Run dashboard E2E smoke tests; verify response shape unchanged.

### Phase 3 (production verification)

- [ ] Capture before/after timing for a representative request via
      Cloudflare Workers Logs / D1 query timing.
- [ ] Ensure error rate does not change for the `/api/applications` and
      `/api/applications/:id` paths.

---

## Acceptance Criteria

- [ ] Both code paths perform ≤2 D1 queries regardless of page size.
- [ ] API response shape unchanged (verified by E2E snapshot).
- [ ] Prepare-count regression tests in CI.
- [ ] Manual verification with representative datasets (25, 50, 100 apps).

---

## Verification (this PR)

This PR adds the plan only — no code changes. Phase 2 implements the
batching; Phase 3 verifies in production. The issue stays open until
Phase 2 lands.

---

## See Also

- [`docs/architecture/TECH_DEBT_AUDIT_2026-04-29.md`](./TECH_DEBT_AUDIT_2026-04-29.md)
  § applications.js N+1 — original audit finding.
- [`apps/job-dashboard/src/handlers/applications/`](../../apps/job-dashboard/src/handlers/applications/)
  — post-Epic-6 split location.
- Issue #28 — the prerequisite handler split, **already closed**.
