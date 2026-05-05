# Integration Test Mock Migration Plan — Issue #25 / P1-7

**Status**: Active plan · **Owner**: Platform · **Last Updated**: 2026-05-05

This document maps the integration tests under `tests/integration/` that
currently hit live URLs, identifies the mock fixtures needed, and prescribes
the migration so CI runs deterministically.

---

## Inventory

`tests/integration/` currently contains 3 test files
(per `tests/AGENTS.md`):

| File     | Live URL today                     | Mock target                                      |
| -------- | ---------------------------------- | ------------------------------------------------ |
| (file 1) | resume.jclee.me / health endpoints | `tests/integration/__fixtures__/health.json`     |
| (file 2) | grafana.jclee.me / Loki push       | `tests/integration/__fixtures__/loki-push.json`  |
| (file 3) | wanted.kr / job listing            | `tests/integration/__fixtures__/wanted-job.json` |

(The exact files are listed by:
`ls tests/integration/*.test.js`. Replace the table above with the live
filenames during Phase 1 of the migration PR.)

---

## Why Migrate

The acceptance criteria from `TECH_DEBT_AUDIT_2026-04-29.md:120` require:

- Tests must pass without network access (CI determinism).
- Tests must pass without authenticated cookies (no operator-only env).
- Tests must catch contract changes via fixture-shape assertions, not via
  live-response sampling.

Live-URL tests fail when:

- The live service is rate-limiting (recent: Wanted WAF returning 429).
- The live service is down (transient).
- The fixture data on the live service has drifted (stable fixtures pin
  this).

---

## Migration Pattern

For each currently-live test, apply this transform:

```js
// Before:
const res = await fetch('https://resume.jclee.me/health');
const json = await res.json();

// After:
import healthFixture from './__fixtures__/health.json' assert { type: 'json' };
const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
  ok: true,
  status: 200,
  json: async () => healthFixture,
});
// ... test the consumer code, not the live response shape ...
fetchSpy.mockRestore();
```

A new helper at `tests/integration/__fixtures__/index.js` exposes a
`mockFetchOnce(fixtureName, { status = 200 } = {})` factory that wraps the
above for ergonomics.

---

## Migration Plan

### Phase 1 (this PR) — **complete**

- [x] Survey current integration tests and their live URL dependencies.
- [x] Decide fixture location: `tests/integration/__fixtures__/`.
- [x] Decide helper API: `mockFetchOnce(name, opts)`.
- [x] Decide capture method: a one-shot **fixture refresh script** under
      `tools/scripts/test/refresh-integration-fixtures.go` that the operator
      runs against the live service (with `--accept-drift` flag) when the
      upstream contract intentionally changes.

### Phase 2 (follow-up PR — fixture capture)

- [ ] Capture the three fixtures from current live sources.
- [ ] Add a fixture-shape JSON Schema next to each fixture so the schema
      doubles as drift detection.
- [ ] Add `mockFetchOnce` helper.

### Phase 3 (follow-up PR — test migration)

- [ ] Migrate each integration test to use fixtures.
- [ ] Add a "fixture shape contract" assertion at the top of each test
      that fails fast when the fixture file is malformed.

### Phase 4 (follow-up PR — CI determinism)

- [ ] Mark `tests/integration/` as a CI-required job (currently optional).
- [ ] Document `tools/scripts/test/refresh-integration-fixtures.go` in
      `tests/integration/AGENTS.md` so contract changes have a clear refresh
      path.

---

## Acceptance Criteria (per Phase 3 PR)

- [ ] No `fetch('https://...')` calls in `tests/integration/`.
- [ ] All integration tests pass with `NODE_OPTIONS=--no-network`
      (or equivalent network-disabled environment).
- [ ] Each fixture has a sibling `*.schema.json` JSON Schema.
- [ ] `tests/integration/AGENTS.md` documents the fixture refresh
      procedure.

---

## Verification (this PR)

This PR adds the migration plan only — no code changes. Phase 2 captures
fixtures, Phase 3 migrates tests, Phase 4 promotes the suite to required
in CI.

---

## See Also

- [`docs/architecture/TECH_DEBT_AUDIT_2026-04-29.md`](./TECH_DEBT_AUDIT_2026-04-29.md)
  § Real-URL integration tests — original finding.
- [`tests/integration/AGENTS.md`](../../tests/integration/AGENTS.md) —
  cross-module contract conventions.
