# Session Management Triage — SSOT-034 / Issue #43

**Status**: Active triage · **Owner**: Platform · **Last Updated**: 2026-05-05

This document maps every session-handling implementation in the monorepo,
distinguishes the orthogonal concerns currently muddled together, and
prescribes the layered consolidation. **#43 is the highest-risk item in
Epic 4** per the original SSoT plan; this triage exists so the migration
PRs can land in safe slices.

---

## Inventory

### A. Wanted-platform session lifecycle

#### A-1. `apps/job-server/src/shared/services/session/session-manager.js` (385 LOC)

In-process Wanted session manager. Owns:

- 24h TTL cookie persistence (`~/.OpenCode/data/wanted-session.json`).
- Cookie + CSRF token lifecycle.
- Session staleness probing.
- Fallback to interactive `quick-login.go` script when stale.

#### A-2. `apps/job-server/src/session-broker/services/` (six files, 546 LOC)

Out-of-process Wanted session broker (Docker, port 3456). Five files:

| File                           | LOC | Role                          |
| ------------------------------ | --: | ----------------------------- |
| `session-broker-service.js`    | 102 | HTTP server façade            |
| `session-broker-operations.js` | 234 | renew / probe / invalidate    |
| `session-broker-storage.js`    |  62 | filesystem persistence        |
| `session-broker-state.js`      |  19 | in-memory state               |
| `session-broker-constants.js`  |  26 | TTLs, paths, retry budgets    |
| `wanted-login-flow.js`         | 126 | stealth Playwright login flow |

A-1 and A-2 both encode the **same Wanted session contract** (cookie names,
TTL, staleness criteria) in two places. A-1 is the consumer side (called from
crawlers + apply pipeline); A-2 is the producer side (renews when the consumer
hits stale). They communicate via JSON-on-disk + an HTTP probe endpoint.

### B. Admin auth session (job-dashboard)

#### B-1. `apps/job-dashboard/src/services/auth.js` (289 LOC, including HMAC + cookie helpers)

Cookie session for the admin dashboard. Owns:

- Cookie issuance / verification with HMAC signing.
- Webhook signature verification (Stripe-style).
- Login / logout flows tied to Google OAuth.
- CSRF token issuance.

#### B-2. `apps/job-dashboard/src/durable-objects/browser-session-do.js`

Durable Object holding **transient browser sessions** for crawl/apply runs
(Chromium contexts, cookies-of-the-moment). This is **state**, not auth.

### C. Portfolio worker session helpers (codegen)

#### C-1. `apps/portfolio/lib/auth.js` (179 LOC, codegen)

Generates the inline `verifySession()` template embedded into the portfolio
worker. Functions: `verifyGoogleToken`, `signMessage`, `verifySignature`,
`verifySession`. **Codegen — not a runtime session store.**

---

## Concerns Currently Muddled

| Concern                                           | Where it lives today                                        | Where it should live                                                                                                             |
| ------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Cookie issuance + signing                         | A-1 (consumer side), B-1 (admin side), C-1 (codegen)        | Canonical primitive in `packages/shared/src/cookies/`                                                                            |
| HMAC sign / verify                                | B-1 inline, C-1 codegen                                     | Canonical in `packages/shared/src/crypto/hmac` (per SSOT-033)                                                                    |
| TTL enforcement                                   | A-1, A-2, B-1 each implement their own clock + expiry check | Canonical in `packages/shared/src/session/ttl.js` (deterministic clock injection)                                                |
| Wanted session contract (cookie names, staleness) | A-1 + A-2 duplicate                                         | Single SSoT in `apps/job-server/src/shared/clients/wanted/session-contract.js` (already job-server-local; document the contract) |
| Browser DO state                                  | B-2                                                         | Stays as-is (correctly Durable-Object-shaped)                                                                                    |

The Wanted session lifecycle (A) and the admin auth session (B) are
**different concerns** and should not be merged into one class. What CAN
be unified is the **primitives** they both build on (cookie helpers, HMAC,
TTL).

---

## Decisions

| Pair / Concern                                        | Decision                                                                                                                       |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| A-1 ↔ A-2 (Wanted session, two sides of one contract) | **Keep both**; extract the cookie-name / TTL / staleness contract into a single `session-contract.js` module that both import. |
| A vs B (Wanted vs admin)                              | **Different domains; keep separate.** They share primitives (cookies, HMAC, TTL), not state.                                   |
| C codegen                                             | Stays as codegen. Will consume the canonical HMAC primitive from SSOT-033.                                                     |
| Cookie helpers across A-1, B-1, C-1                   | Promote to `packages/shared/src/cookies/index.js`.                                                                             |
| TTL clock + skew handling                             | Promote to `packages/shared/src/session/ttl.js` with injected clock.                                                           |

---

## Migration Plan

### Phase 1 (this PR) — **complete**

- [x] Inventory every session/auth module.
- [x] Distinguish "Wanted session lifecycle" from "admin auth session" from
      "browser DO transient state".
- [x] Identify the truly shared primitives (cookies, HMAC, TTL).
- [x] Decide canonical homes.

### Phase 2 (follow-up PR — primitives only)

- [ ] Add `packages/shared/src/cookies/index.js` (parse, serialize, sign,
      verify; covers SameSite, Secure, HttpOnly, Domain). 90%+ unit-test coverage.
- [ ] Add `packages/shared/src/session/ttl.js` (clock-injected TTL helper).
- [ ] B-1 (`apps/job-dashboard/src/services/auth.js`) consumes the new
      primitives; cookie code becomes a thin wrapper.

### Phase 3 (follow-up PR — Wanted contract extraction)

- [ ] Extract `apps/job-server/src/shared/clients/wanted/session-contract.js`
      with canonical cookie names, TTL, staleness criteria.
- [ ] A-1 and A-2 import from the contract module (no behavior change).

### Phase 4 (follow-up PR — codegen alignment)

- [ ] C-1's `signMessage` / `verifySignature` codegen emits a re-export of
      `@resume/shared/crypto/hmac` instead of an inline implementation.

---

## Verification (this PR)

This PR adds the triage doc only — no code changes. It satisfies the
**triage prerequisite** of #43. The four-phase migration is documented above
with explicit safety boundaries to land each phase as an independent PR.

---

## See Also

- [`docs/architecture/encryption-triage.md`](./encryption-triage.md) — SSOT-033
  (HMAC primitives + crypto layout this work depends on).
- [`docs/architecture/SSOT_IMPROVEMENT_PLAN.md`](./SSOT_IMPROVEMENT_PLAN.md)
  § SSOT-034 — original consolidation entry.
- [`apps/job-server/AGENTS.md`](../../apps/job-server/AGENTS.md) — Wanted
  session conventions (`~/.OpenCode/data/wanted-session.json`).
- [`docs/security/SECRET_ROTATION_PLAYBOOK.md`](../security/SECRET_ROTATION_PLAYBOOK.md)
  § Session signing keys — rotation cadence.
