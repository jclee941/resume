# Per-Service DI Refactor Triage — Issue #16 / P0-5

**Status**: Active triage · **Owner**: Platform · **Last Updated**: 2026-05-05

This document inventories the seven job-server services that currently use
the **closure-bound holder pattern** as a containment for module-level
mutable state, prescribes the per-service constructor-injection migration,
and ranks them by Worker-isolate safety risk.

The closure-bound holder pattern was applied in Round 3+5 audit as
_containment_, not elimination — it removes top-level mutable bindings but
still leaves shared state inside the module instance. This document plans
the elimination phase.

---

## Inventory

|   # | Service          | File                                                          | Held state         | Worker-isolate risk                                                     |
| --: | ---------------- | ------------------------------------------------------------- | ------------------ | ----------------------------------------------------------------------- |
|   1 | wanted-helpers   | `apps/job-server/src/auto-apply/strategies/wanted-helpers.js` | `lastSubmissionAt` | **High** — submission rate-limit shared across requests                 |
|   2 | auto-apply state | `apps/job-server/src/tools/auto-apply/state.js`               | `sessionState`     | **High** — apply-flow state cross-request                               |
|   3 | match-engine     | `apps/job-server/src/services/match-engine.js`                | config cache       | **Medium** — config is read-mostly, but may include user-scoped weights |
|   4 | cover-letter     | `apps/job-server/src/services/cover-letter.js`                | template cache     | **Low** — templates are read-only                                       |
|   5 | wanted-client    | `apps/job-server/src/clients/wanted-client.js`                | token holder       | **High** — auth token must not cross tenants                            |
|   6 | session-broker   | `apps/job-server/src/session-broker/index.js`                 | browser instance   | **Medium** — single Node process; isolate not applicable                |
|   7 | resume-sync      | `apps/job-server/src/services/resume-sync.js`                 | sync state         | **Medium** — sync mutex                                                 |

---

## Migration Pattern

Each service migrates from:

```js
const _xHolder = (() => {
  let v = null;
  return {
    get: () => v,
    set: (x) => {
      v = x;
    },
    clear: () => {
      v = null;
    },
  };
})();

export function doThing() {
  const v = _xHolder.get();
  // ...
}
```

to:

```js
export class Thing {
  #v = null;
  constructor(deps = {}) {
    this.#v = deps.initialV ?? null;
  }
  doThing() {
    // use this.#v
  }
}

// Optional thin functional wrapper for ergonomics:
export function createThing(deps) {
  return new Thing(deps);
}
```

Consumers receive an instance via Fastify decoration / DI container, not
via module import.

---

## Per-Service Slice Plan

Sliced in **lowest-risk-first** order so each PR is independently
mergeable and reversible.

### Slice A — read-only state (lowest risk)

- **#4 cover-letter** — template cache
  - Class wraps the cache; constructor takes `{ templateLoader }`.
  - Add `cover-letter.test.js` with two instances proving isolation.

### Slice B — process-bound state (medium risk)

- **#3 match-engine** — config cache
- **#7 resume-sync** — sync state
- **#6 session-broker** — browser instance (job-server is a Node process,
  not a Worker isolate, so this is mostly cosmetic but aligns the API)

### Slice C — auth + apply-flow state (highest risk)

- **#5 wanted-client** — token holder
  - Constructor takes a `tokenStore` (Worker KV adapter, in-process Map for
    job-server, or `null` for stateless usage).
- **#1 wanted-helpers** — `lastSubmissionAt` rate-limit state
  - Migrate to consume the canonical token-bucket from SSOT-035 / #44 once
    that lands.
- **#2 auto-apply state** — `sessionState`
  - Constructor takes the apply-pipeline context; tests verify state does
    not leak between sequential apply runs.

---

## Acceptance Criteria (per service)

- [ ] Constructor accepts dependencies via parameters.
- [ ] No module-level mutable bindings (no closure-bound holder remains).
- [ ] Dedicated `*.test.js` instantiates **two instances** in the same test
      process and verifies state isolation.
- [ ] Existing call sites updated (no `_xHolder.get()` / `_xHolder.clear()`
      references remain).
- [ ] Worker-isolate-reuse smoke test (where applicable): two simulated
      requests on the same isolate observe distinct state.

---

## Verification (this PR)

This PR adds the triage doc only — no code changes. It satisfies the
**slicing prerequisite** of #16 by ranking services by isolate risk and
ordering the migration so each slice is independently reviewable. Each
slice will be a separate PR; the issue stays open until all three slices
land and the worker-isolate smoke test passes.

---

## See Also

- [`docs/architecture/TECH_DEBT_AUDIT_2026-04-29.md`](./TECH_DEBT_AUDIT_2026-04-29.md)
  § P0-5 — original audit finding.
- [`docs/architecture/MONOREPO_REVIEW_2026-04-29.md`](./MONOREPO_REVIEW_2026-04-29.md)
  § P0-5 — review entry that produced this issue.
- [`docs/architecture/rate-limiting-triage.md`](./rate-limiting-triage.md)
  — Slice C #1 (wanted-helpers) consumes the canonical token-bucket from
  this track once it lands.
