# Wanted Client Triage — SSOT-037 / Issue #46

**Status**: Active triage · **Owner**: Platform · **Last Updated**: 2026-05-05

This document maps the two Wanted-platform API clients in the monorepo,
identifies their overlap and divergence, and prescribes the consolidation
direction (promote the job-server-local client to the canonical location).

---

## Inventory

### A. `packages/shared/src/wanted-client.js` (191 LOC) — older, simpler

**Why it exists**: original Wanted client used by tools/scripts and any
shared module that needed Wanted access.
**API surface**: small. `WantedClient` class with: `request(method, url, opts)`,
plus method bundles re-exported from sibling files (`wanted-resume-api.js`,
`wanted-skill-api.js`, `wanted-profile-api.js`).
**Auth**: cookie + CSRF, no built-in retry.
**Errors**: `WantedAPIError extends Error`.

### B. `apps/job-server/src/shared/clients/wanted/` (six files, 300 LOC across the core)

| File                        | LOC | Role                                          |
| --------------------------- | --: | --------------------------------------------- |
| `http-client.js`            |  89 | HttpClient + WantedAPIError + 401 retry       |
| `wanted-api.js`             | 143 | WantedAPI class composing endpoints           |
| `types.js`                  |  63 | TypeScript-style typedefs + `JOB_CATEGORIES`  |
| `index.js`                  |   5 | barrel                                        |
| `endpoints/jobs.js`         |   — | JobsEndpoint, CompaniesEndpoint, AuthEndpoint |
| `endpoints/applications.js` |   — | ApplicationsEndpoint                          |
| `endpoints/profile.js`      |   — | ProfileEndpoint                               |
| `endpoints/resume.js`       |   — | ResumeEndpoint, SkillEndpoint                 |

**Method count**: 40+ across endpoints.
**Auth**: cookie + CSRF + automatic 401 → re-login retry.
**Errors**: `WantedAPIError` (re-exported from `http-client.js`).
**Tests**: live in `apps/job-server/src/shared/clients/wanted/__tests__/`.

---

## Overlap Audit

| Concern               | A (shared)                            | B (job-server)                                                    | Decision                                        |
| --------------------- | ------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------- |
| Base URL constants    | `https://www.wanted.co.kr` + variants | same set                                                          | identical, **dedupe**                           |
| Job categories enum   | `JOB_CATEGORIES` (subset)             | `JOB_CATEGORIES` (superset)                                       | merge into B's superset                         |
| `WantedAPIError`      | hand-rolled                           | hand-rolled                                                       | **identical** semantics, dedupe                 |
| `request()` low-level | yes                                   | yes                                                               | B's is sophisticated (401-retry + CSRF refresh) |
| Endpoint methods      | resume / skill / profile only         | jobs / companies / auth / applications / profile / resume / skill | B is a superset                                 |
| Stealth/UA rotation   | no                                    | no (handled by crawler layer)                                     | n/a                                             |

A's surface is a **strict subset** of B's. There is no behavior in A that
is missing from B except the package layout (top-level methods on
`WantedClient` vs `WantedAPI`'s endpoint composition).

---

## Decision

**Promote B (`apps/job-server/src/shared/clients/wanted/`) to the canonical
location** as `packages/clients-wanted/`. A becomes a thin re-export with
deprecation notice; the older method-bundle files
(`wanted-resume-api.js`, `wanted-skill-api.js`, `wanted-profile-api.js`) are
removed once consumers update.

**Why promote B and not extend A**:

1. B has 40+ methods organized into endpoint classes (clean separation).
2. B has automatic 401-retry + CSRF refresh (production-hardened).
3. B has dedicated tests (`apps/job-server/src/shared/clients/wanted/__tests__/`)
   that A lacks.
4. B's types live in `types.js` and migrate naturally to `packages/types`.

---

## Canonical Home Structure (proposed for Phase 2)

```text
packages/clients-wanted/
├── package.json            # @resume/clients-wanted
├── src/
│   ├── index.js            # barrel
│   ├── http-client.js      # moved from apps/job-server/src/shared/clients/wanted/
│   ├── wanted-api.js       # moved
│   ├── types.js            # moved → also re-exported from @resume/types/wanted
│   └── endpoints/          # moved
│       ├── jobs.js
│       ├── applications.js
│       ├── profile.js
│       └── resume.js
└── __tests__/              # moved from apps/job-server/src/shared/clients/wanted/__tests__/
```

---

## Migration Plan

### Phase 1 (this PR) — **complete**

- [x] Inventory both clients.
- [x] Confirm A's surface is a strict subset of B's.
- [x] Decide direction: B → canonical at `packages/clients-wanted/`.
- [x] Decide types location: `types.js` → `@resume/types/wanted`.

### Phase 2 (follow-up PR — package extraction)

- [ ] Create `packages/clients-wanted/` with B's source.
- [ ] Add workspace entry to root `package.json`.
- [ ] Make `apps/job-server/src/shared/clients/wanted/` a thin re-export
      (or delete and update job-server imports — depends on how many call sites).
- [ ] Move `types.js` to `@resume/types/wanted`; both packages re-export.

### Phase 3 (follow-up PR — A retirement)

- [ ] Identify every consumer of `@resume/shared/wanted-client`. Currently:
      inspect `tools/scripts/`, `apps/portfolio/`, integration tests.
- [ ] Migrate each consumer to `@resume/clients-wanted`.
- [ ] Delete `packages/shared/src/wanted-client.js`,
      `packages/shared/src/wanted-resume-api.js`,
      `packages/shared/src/wanted-skill-api.js`,
      `packages/shared/src/wanted-profile-api.js`.

---

## Verification (this PR)

This PR adds the triage doc only — no code changes. It satisfies the
**"Decision"** acceptance bullet of #46 (decide whether to promote
`apps/job-server/...` or absorb into `packages/shared`).

---

## See Also

- [`docs/architecture/SSOT_IMPROVEMENT_PLAN.md`](./SSOT_IMPROVEMENT_PLAN.md)
  § SSOT-037 — original consolidation entry.
- [`apps/job-server/AGENTS.md`](../../apps/job-server/AGENTS.md) — `WantedAPI`
  conventions (40+ methods, Skills v1 only, Links API broken).
- [`packages/shared/src/wanted-client.js`](../../packages/shared/src/wanted-client.js)
  — older client to be retired.
