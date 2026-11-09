# Per-Service DI Refactor Triage — Issue #16 / P0-5

**Status**: Closed · **Owner**: Platform · **Last Updated**: 2026-09-29

> **2026-09-29:** every inventoried service lived in `apps/job-server`, which was retired ([ADR 0010](../adr/0010-retire-local-job-server.md)). Nothing in this triage remains to migrate.

> **Archive note:** This is a historical triage and proposal. The inventory and migration sequence below describe the retired job-server design; they are not a current service inventory or an approved migration queue.

This document records seven job-server services that the original triage
described as using the **closure-bound holder pattern** to contain
module-level mutable state. Its constructor-injection proposal and
Worker-isolate risk rankings apply to that historical design.

The original triage described the closure-bound holder pattern as
_containment_, not elimination: it removed top-level mutable bindings but
left shared state inside the module instance. The proposed elimination phase
is historical.

---

## Inventory

|   # | Service          | File                                                        | Held state         | Worker-isolate risk                                                     |
| --: | ---------------- | ----------------------------------------------------------- | ------------------ | ----------------------------------------------------------------------- |
|   1 | wanted retry     | `apps/job-server/src/auto-apply/strategies/wanted-retry.js` | `lastSubmissionAt` | **High** — submission rate-limit shared across requests                 |
|   2 | auto-apply state | `apps/job-server/src/tools/auto-apply/state.js`             | `sessionState`     | **High** — apply-flow state cross-request                               |
|   3 | match-engine     | `apps/job-server/src/services/match-engine.js`              | config cache       | **Medium** — config is read-mostly, but may include user-scoped weights |
|   4 | cover-letter     | `apps/job-server/src/services/cover-letter.js`              | template cache     | **Low** — templates are read-only                                       |
|   5 | wanted-client    | `apps/job-server/src/clients/wanted-client.js`              | token holder       | **High** — auth token must not cross tenants                            |
|   6 | session-broker   | `apps/job-server/src/session-broker/index.js`               | browser instance   | **Medium** — single Node process; isolate not applicable                |
|   7 | resume-sync      | `apps/job-server/src/services/resume-sync.js`               | sync state         | **Medium** — sync mutex                                                 |

---

## Historical migration pattern

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

## Historical per-service slice plan

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
- **#1 wanted retry** — `lastSubmissionAt` rate-limit state
  - Migrate to consume the canonical token-bucket from SSOT-035 / #44 once
    that lands.
- **#2 auto-apply state** — `sessionState`
  - Constructor takes the apply-pipeline context; tests verify state does
    not leak between sequential apply runs.

---

## Historical acceptance criteria (per service)

- [ ] Constructor accepts dependencies via parameters.
- [ ] No module-level mutable bindings (no closure-bound holder remains).
- [ ] Dedicated `*.test.js` instantiates **two instances** in the same test
      process and verifies state isolation.
- [ ] Existing call sites updated (no `_xHolder.get()` / `_xHolder.clear()`
      references remain).
- [ ] Worker-isolate-reuse smoke test (where applicable): two simulated
      requests on the same isolate observe distinct state.

---

## Original document verification note

The original note says the triage doc was added without code changes and
satisfied the **slicing prerequisite** of #16 by ranking services by isolate
risk. It proposed separate PRs for each slice and said the issue would stay
open until all three slices and the worker-isolate smoke test were complete.

---

## See Also

- [`docs/architecture/TECH_DEBT_AUDIT_2026-04-29.md`](./TECH_DEBT_AUDIT_2026-04-29.md)
  § P0-5 — original audit finding.
- [`docs/architecture/MONOREPO_REVIEW_2026-04-29.md`](./MONOREPO_REVIEW_2026-04-29.md)
  § P0-5 — review entry that produced this issue.
- [`docs/architecture/rate-limiting-triage.md`](./rate-limiting-triage.md)
  — related historical discussion of Slice C #1 (Wanted retry rate limiting).
  The current owner and migration status are not established by this document.
