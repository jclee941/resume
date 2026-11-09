# Applications N+1 Query Fix Plan — Issue #33 / P2-15

- **Status:** Plan snapshot; implementation status not independently verified
- **Owner:** Platform
- **Plan last updated:** 2026-05-05

This document maps the N+1 query patterns in
`apps/job-dashboard/src/handlers/applications/*.js` (post-Epic-6 split),
prescribes the batching strategy, and lays out the regression coverage that
must land alongside the fix.

---

## State recorded after #28 split (snapshot)

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

The list and detail paths are separate request flows. In the list path, the
recorded pattern is one application-list query plus one timeline query per
application (`N + 1`); batching targets two prepare calls for a non-empty page.
In the detail path, the recorded test fixture expects three prepare calls:
application lookup, related-job lookup, and one batched count call.

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

When the application list is empty, skip the timeline batch and return an empty
list. When there are no related jobs, skip the count query and assign each
returned job a count of zero; do not issue an `IN ()` statement.

Constraints:

- D1 has a parameter limit (≈100 per query). For page sizes > 100, chunk
  the IDs into batches of 100. Page sizes in the dashboard are bounded
  (default 25, max 100), so a single batch is sufficient.
- Use `IN (...)` rather than `JOIN` to keep the API response shape stable
  (per acceptance criterion: "Preserve API response shape").
- The expected values below count calls to `db.prepare(...)`; they do not assert
  the number of database statements executed.

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

Acceptance criterion: "Add regression coverage / prepare-call-count assertions
for the affected timeline and COUNT paths."

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

### Phase 1 (plan definition; recorded complete)

- [x] Map the N+1 sites to the post-Epic-6-split file layout.
- [x] Decide on `IN (...)` batching with D1's parameter-limit consideration.
- [x] Decide on prepare-call-count assertion for regression coverage.
- [x] Confirm response-shape preservation.

### Phase 2 (implementation plan; completion not verified)

- [ ] Add `apps/job-dashboard/src/test-helpers/d1-mock.js` with prepare-call
      counting.
- [ ] Apply the batching transform to `list-query.js` and `detail-query.js`.
- [ ] Add `*.test.js` for both with prepare-count assertions.
- [ ] Run dashboard E2E smoke tests; verify response shape unchanged.

### Phase 3 (production verification plan; completion not verified)

- [ ] Capture before/after timing for a representative request via
      Cloudflare Workers Logs / D1 query timing.
- [ ] Ensure error rate does not change for the `/api/applications` and
      `/api/applications/:id` paths.

---

## Acceptance Criteria (per request path)

- [ ] The list path uses two prepare calls for a non-empty page, independent of page size.
- [ ] The detail path uses three prepare calls for the recorded fixture, independent of related-job count.
- [ ] API response shape unchanged (verified by E2E snapshot).
- [ ] Prepare-call-count regression tests in CI.
- [ ] Manual verification with representative datasets (25, 50, 100 apps).

---

## Verification recorded for the plan

The original change added the plan only, with no code changes. Phase 2 describes
the implementation and Phase 3 the production checks; their current completion
status is not established by this document.

---

## See Also

- [`docs/architecture/TECH_DEBT_AUDIT_2026-04-29.md`](./TECH_DEBT_AUDIT_2026-04-29.md)
  § applications.js N+1 — original audit finding.
- [`apps/job-dashboard/src/handlers/applications/`](../../apps/job-dashboard/src/handlers/applications/)
  — post-Epic-6 split location.
- Issue #28 — the prerequisite handler split, **already closed**.
