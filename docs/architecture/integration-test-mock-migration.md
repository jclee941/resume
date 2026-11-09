# Integration Test Mock Migration Plan — Issue #25 / P1-7

**Status**: Historical plan snapshot; implementation status unverified · **Owner**: Platform · **Snapshot date**: 2026-05-05

> **Status boundary:** This is a proposal snapshot dated 2026-05-05. Its implementation status and current CI requirements have not been established here. Checked Phase 1 items and “this PR” wording below record the original plan, not fresh verification.

This document records a proposal about tests under `tests/integration/` that
the 2026-05-05 audit described as using live URLs. Their current names,
dependencies, and implementation status have not been verified here.

---

## Inventory

The following is an illustrative placeholder inventory, not a verified list of
current test files. The original plan cited `tests/AGENTS.md`; verify the
current test names and live dependencies before treating these rows as an
inventory:

| Placeholder | Example URL in proposal            | Proposed mock target                             |
| ----------- | ---------------------------------- | ------------------------------------------------ |
| (file 1)    | resume.jclee.me / health endpoints | `tests/integration/__fixtures__/health.json`     |
| (file 2)    | grafana.jclee.me / Loki push       | `tests/integration/__fixtures__/loki-push.json`  |
| (file 3)    | wanted.kr / job listing            | `tests/integration/__fixtures__/wanted-job.json` |

The `(file 1)` through `(file 3)` labels are placeholders, not filenames.

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

## Illustrative migration pattern

For a test verified to use a live URL, the original proposal suggested this
transform:

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

The original note says this document added a plan without code changes. The
phase descriptions below are proposals; they do not establish implementation
or current CI status.

---

## See Also

- [`docs/architecture/TECH_DEBT_AUDIT_2026-04-29.md`](./TECH_DEBT_AUDIT_2026-04-29.md)
  § Real-URL integration tests — original finding.
- [`tests/integration/AGENTS.md`](../../tests/integration/AGENTS.md) —
  cross-module contract conventions.
