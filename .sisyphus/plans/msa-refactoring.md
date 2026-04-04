# MSA Refactoring Execution Plan — Resume Monorepo

**Created:** 2026-03-16
**Status:** Completed
**Branch:** master

## Overview

Extract shared modules from `apps/job-server/src/shared/` into `packages/shared/` (`@resume/shared`), then refactor the God Worker entry point. Three phases, six waves, six atomic commits.

### Problem Statement

The resume monorepo has tight cross-app coupling:
1. `apps/job-dashboard/` imports directly from `../../job-server/src/shared/` (14 imports across 12 files)
2. `apps/portfolio/entry.js` is a God Worker: inlines ~89 lines of ES logging, imports job-dashboard worker + all 7 Workflow classes
3. Vestigial `JOB_DB` D1 binding defined but never used

### Scope

**In scope:**
- Phase 1: Extract errors, logger, ES client into `packages/shared/`
- Phase 2: Refactor entry.js inline code, remove JOB_DB
- Phase 3: Worker separation planning document (ADR only, no implementation)

**Out of scope:** No separate auth service, no API gateway, no event-driven changes, no DB migrations, no job-server changes beyond import updates, no new CI/CD, no subdomain routing.

### Dependency Chain (Verified)

```
errors/index.js (self-contained, 267 lines, 12 exports)
elasticsearch/index.js (self-contained, 238 lines)
    ↓ both imported by ↓
logger/index.js (437 lines, imports ../errors and ../clients/elasticsearch)
```

Key insight: preserving the same relative directory structure under `packages/shared/src/` means zero internal import changes within the extracted modules.

---

## Phase 1 — Shared Package Extraction

### Wave 0: Contract Tests (Commit A)

Lock public API surfaces before moving anything.

| Task | Description | Acceptance Criteria |
|------|-------------|-------------------|
| W0-T1 | Contract tests for `errors/index.js` | Tests verify all 12 exports (AppError, HttpError, ValidationError, AuthenticationError, NotFoundError, ConflictError, RateLimitError, ExternalServiceError, TimeoutError, normalizeError, isRetryable, toHttpResponse), inheritance chains, normalizeError edge cases (Error, string, null, object, unknown), isRetryable rules, toHttpResponse shape. `npm test -- tests/unit/shared/errors.test.js` passes. |
| W0-T2 | Contract tests for `elasticsearch/index.js` | Tests verify ElasticsearchClient construction, index() method signature, bulk() batching, search() shape, ECS field mapping, error wrapping. Uses mocked fetch. `npm test -- tests/unit/shared/es-client.test.js` passes. |
| W0-T3 | Contract tests for `logger/index.js` | Tests verify Logger construction with ES client + index name, log level methods (info, warn, error, debug), RequestContext construction and field extraction, flush() delegation, structured log shape. Uses mocked ES client. `npm test -- tests/unit/shared/logger.test.js` passes. |

**Parallelism:** W0-T1, W0-T2, W0-T3 are independent.
**Commit:** `test(shared): add contract tests for errors, es-client, and logger API surfaces`

### Wave 1: Package Scaffold

| Task | Description | Acceptance Criteria |
|------|-------------|-------------------|
| W1-T1 | Create `packages/shared/package.json` | name=`@resume/shared`, type="module", subpath exports: `./errors` → `./src/errors/index.js`, `./logger` → `./src/logger/index.js`, `./es-client` → `./src/clients/elasticsearch/index.js`. Valid JSON. |
| W1-T2 | Register workspace in root `package.json` | `"packages/shared"` in workspaces array. `npm ls @resume/shared` resolves. `npm install` succeeds. |

**Dependency:** W1-T2 depends on W1-T1.

### Wave 2: File Migration — Dual-Path State (Commit B)

| Task | Description | Acceptance Criteria |
|------|-------------|-------------------|
| W2-T1 | Copy `errors/index.js` to `packages/shared/src/errors/index.js` | `diff` shows identical content. |
| W2-T2 | Copy `elasticsearch/index.js` to `packages/shared/src/clients/elasticsearch/index.js` | `diff` shows identical content. |
| W2-T3 | Copy `logger/index.js` to `packages/shared/src/logger/index.js` | Internal relative imports resolve. `node -e "import('@resume/shared/logger')"` succeeds. |

**Parallelism:** W2-T1 and W2-T2 independent. W2-T3 depends on both.
**Commit:** `feat(shared): create @resume/shared package with errors, logger, and es-client`
**Verification:** npm install succeeds, contract tests still pass against old paths, zero consumer changes.

### Wave 3: Import Rewiring + Cleanup (Commit C)

| Task | Description | Acceptance Criteria |
|------|-------------|-------------------|
| W3-T1 | Rewire 12 job-dashboard files | Replace `../../job-server/src/shared/errors/index.js` → `@resume/shared/errors`, `../../job-server/src/shared/logger/index.js` → `@resume/shared/logger`. Files: src/index.js, src/router.js, src/queue-consumer.js, 9 handler files. `grep -r "job-server/src/shared" apps/job-dashboard/` returns zero. |
| W3-T2 | Rewire job-server internal imports | Any remaining imports of `./shared/errors`, `./shared/logger`, `./shared/clients/elasticsearch` in apps/job-server/src/ rewired to `@resume/shared/*`. `grep` returns zero matches. |
| W3-T3 | Rewire contract test imports | Tests import from `@resume/shared/*` instead of relative paths. `npm test -- tests/unit/shared/` passes. |
| W3-T4 | Delete original source files | Remove `errors/index.js`, `logger/index.js`, `clients/elasticsearch/index.js` from `apps/job-server/src/shared/`. `npm test` passes, `npm run build` succeeds. |

**Parallelism:** W3-T1, W3-T2, W3-T3 independent. W3-T4 after all three.
**Commit:** `refactor(shared): rewire all consumers to @resume/shared and remove originals`

---

## Phase 2 — Entry.js God Worker Refactoring

### Wave 4: Extract Inline ES Logging (Commit D)

| Task | Description | Acceptance Criteria |
|------|-------------|-------------------|
| W4-T1 | Replace ~89 lines of inline ES logging in entry.js with `@resume/shared/es-client` import | Line count drops by ~70+. `node -c apps/portfolio/entry.js` valid. All 7 Workflow exports preserved. |
| W4-T2 | Verify build pipeline | `node apps/portfolio/generate-worker.js` succeeds. |

**Commit:** `refactor(portfolio): replace inline ES logging with @resume/shared/es-client`

### Wave 5: JOB_DB Binding Cleanup (Commit E)

| Task | Description | Acceptance Criteria |
|------|-------------|-------------------|
| W5-T1 | Remove JOB_DB D1 binding from wrangler.toml | `grep JOB_DB apps/portfolio/wrangler.toml` returns zero. RESUME_DB still present. |
| W5-T2 | Scan codebase for JOB_DB references | `grep -r "JOB_DB" apps/` returns zero. |

**Commit:** `chore(portfolio): remove vestigial JOB_DB D1 binding`

---

## Phase 3 — Worker Separation (Planning Only)

### Wave 6: Separation Planning (Commit F)

| Task | Description | Acceptance Criteria |
|------|-------------|-------------------|
| W6-T1 | Create ADR for worker separation | Document evaluates: (a) separate workers per domain, (b) Service Bindings vs HTTP, (c) Workflow export placement, (d) queue handler placement, (e) deployment topology. Sections: scope, options, trade-offs, recommendation, next steps. |

**Commit:** `docs(adr): add worker separation planning document`

---

## Risk Matrix

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Logger internal imports break after copy | Critical | Low | Directory structure preserved exactly |
| Wrangler bundler fails to resolve @resume/shared | High | Low | npm workspaces symlinks; other workspace packages already work |
| Contract tests miss an export | Medium | Low | Tests enumerate all named exports via Object.keys() |
| generate-worker.js build breaks | High | Medium | Separate verification task W4-T2 |
| JOB_DB removal breaks hidden reference | Medium | Low | Full codebase grep in W5-T2 |
| Cross-app imports missed during rewiring | High | Low | Verification grep for zero matches |

## Rollback Points

- **After Commit A:** Tests only — safe to abandon
- **After Commit B:** Dual-path — git revert removes package, old imports still work
- **After Commit C:** Phase 1 complete — fully verified before commit
- **After Commit D:** Entry.js refactored — git revert restores inline logging
- **After Commit E:** JOB_DB removed — git revert restores harmless binding

## Verification Checklist (Per Wave)

- [ ] `npm test` passes
- [ ] `npm run build` succeeds
- [ ] `grep -r "job-server/src/shared" apps/job-dashboard/` returns zero (after Wave 3)
- [ ] `tsc --noEmit` passes (if applicable)
- [ ] All 7 Workflow class exports in entry.js preserved
