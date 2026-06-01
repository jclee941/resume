# Rate Limiting Triage — SSOT-035 / Issue #44

**Status**: Active triage · **Owner**: Platform · **Last Updated**: 2026-05-05

This document maps every rate-limiting strategy in the monorepo, identifies
the genuinely-different deployment contexts vs the duplicated token-bucket
logic, and prescribes the canonical primitives.

---

## Inventory

### A. `apps/job-dashboard/src/middleware/rate-limit.js` (173 LOC)

**Context**: HTTP middleware running in the job-dashboard Cloudflare Worker.
**Strategy**: Sliding window in Cloudflare KV.
**Limit shape**: 60 req / minute / IP, per-endpoint customizable.
**Why KV**: middleware needs cross-request state across CF data centers; KV
is the only available shared store at the Worker edge.

### B. `apps/job-server/src/shared/services/orchestrator/rate-limiter.js` (275 LOC)

**Context**: In-process crawl orchestrator (Node.js MCP server).
**Strategy**: Token bucket + sliding window combined; per-platform budgets;
respects `Retry-After` headers from the upstream platform.
**Limit shape**: per-platform (e.g. Wanted: 10 rpm with 1s minimum gap +
3-burst; LinkedIn: 5 rpm with 5s minimum gap; etc.).
**Why in-memory**: orchestrator is a single Node process; bucket state is
ephemeral and fits in heap.

### C. `apps/job-dashboard/src/services/rate-limiter/token-bucket.js` (201 LOC)

**Context**: Workflow-level rate limiter inside job-dashboard (queue
producer side).
**Strategy**: Token bucket only.
**Limit shape**: per-workflow budget (job-crawling, application,
resume-sync) before enqueuing.
**Why duplicated**: was implemented before the orchestrator's bucket
existed; same algorithm, different file.

---

## Identical / Divergent Decisions

| Pair   | Status                                                                                                                  | Decision                                                                                            |
| ------ | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| A vs B | **Different deployment contexts** (KV-backed for Worker edge HTTP middleware vs in-memory for single-Node orchestrator) | Keep separate. Both consume the canonical token-bucket primitive but differ on the storage adapter. |
| A vs C | A is HTTP middleware, C is workflow producer; **storage adapter differs** but both run in Worker                        | Keep both, but C's token-bucket code is duplicated and should consume the canonical primitive.      |
| B vs C | Algorithm identical (token bucket)                                                                                      | Both consume the canonical primitive.                                                               |

---

## Canonical Home Structure (proposed for Phase 2)

```text
packages/shared/src/rate-limit/
├── index.js                # barrel
├── token-bucket.js         # pure algorithm: refill/take/peek
├── sliding-window.js       # pure algorithm: count-in-window
├── adapters/
│   ├── memory.js           # in-process Map (used by B)
│   ├── kv.js               # Cloudflare KV (used by A, C)
│   └── do.js               # Durable Object (future, exact-once semantics)
└── __tests__/
    ├── token-bucket.test.js
    ├── sliding-window.test.js
    └── adapters/
        ├── memory.test.js
        └── kv.test.js
```

The split is: **algorithms are pure**, **adapters do I/O**. Each consumer
picks an algorithm + an adapter.

| Consumer                     | Algorithm                         | Adapter  |
| ---------------------------- | --------------------------------- | -------- |
| A (job-dashboard middleware) | `sliding-window`                  | `kv`     |
| B (job-server orchestrator)  | `token-bucket` + `sliding-window` | `memory` |
| C (job-dashboard workflows)  | `token-bucket`                    | `kv`     |

---

## Migration Plan

### Phase 1 (this PR) — **complete**

- [x] Inventory every rate-limit implementation.
- [x] Identify deployment-justified divergences (KV vs memory).
- [x] Decide canonical algorithm + adapter split.
- [x] Map each consumer to its (algorithm, adapter) pair.

### Phase 2 (follow-up PR — primitives)

- [ ] Add `packages/shared/src/rate-limit/{token-bucket,sliding-window}.js`
      as pure algorithms.
- [ ] Add `packages/shared/src/rate-limit/adapters/{memory,kv}.js`.
- [ ] 90%+ unit-test coverage with deterministic clock injection.

### Phase 3 (follow-up PR — migrate consumers, one at a time)

- [ ] B (job-server orchestrator) → consume canonical token-bucket +
      memory adapter. Lowest-risk migration (in-process, no KV writes change
      shape).
- [ ] C (job-dashboard workflows) → consume canonical token-bucket + kv
      adapter. Verify KV key shape backward-compat.
- [ ] A (job-dashboard middleware) → consume canonical sliding-window + kv
      adapter. Highest-risk (production HTTP path); land behind a feature flag.

### Future (separate ticket)

- [ ] Cloudflare native rate-limit binding (#15 [P1-4]) — operator-blocked.
      When that lands, A migrates to the binding and the kv adapter is retired
      for the middleware path; B and C remain on the canonical primitives.

---

## Verification (this PR)

This PR adds the triage doc only — no code changes. It satisfies the
"identify duplication vs deployment-justified divergence" prerequisite of
issue #44 and prescribes the algorithm-vs-adapter split that Phase 2
implements.

---

## See Also

- [`docs/architecture/SSOT_IMPROVEMENT_PLAN.md`](./SSOT_IMPROVEMENT_PLAN.md)
  § SSOT-035 — original consolidation entry.
- Issue #15 [P1-4] — Cloudflare native rate-limit binding (operator-blocked).
- [`apps/job-server/src/shared/services/orchestrator/rate-limiter.js`](../../apps/job-server/src/shared/services/orchestrator/rate-limiter.js)
  — most-mature implementation; the canonical algorithms will mirror its
  shape minus the platform-specific budgets.
