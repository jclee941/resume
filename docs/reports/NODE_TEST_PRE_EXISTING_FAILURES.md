# Node Test Pre-existing Failures

**Discovered**: 2026-04-10
**Context**: After fixing the `node --test` hang in `apps/job-server` (commit `fb4657c`),
7 test failures became visible. These failures are **pre-existing** — they were present
before the hang fix, but the hanging test runner masked them by never completing.

**CI Status**: `.github/workflows/ci.yml` keeps `test-node: continue-on-error: true`
until these failures are resolved.

## Verification of "Pre-existing" Claim

```bash
# On commit 754cbd2 (before any lint/hang work):
git stash
git checkout 754cbd2 -- apps/job-server/src/session-broker/
cd apps/job-server
timeout 20 node --test --test-reporter=spec \
  src/session-broker/__tests__/session-broker-service.test.js
# Result: same failures (healthy vs degraded mismatch)
```

## Failure Inventory (7 total)

### Group A: SessionBrokerService healthCheck (5 failures)

**File**: `apps/job-server/src/session-broker/__tests__/session-broker-service.test.js`

| #   | Test                                                | Line | Expected                                                        | Actual                                                                      |
| --- | --------------------------------------------------- | ---- | --------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 1   | returns valid status for a healthy session          | ~68  | 'healthy'                                                       | 'degraded' or missing fields                                                |
| 2   | triggers renewal when the session is nearing expiry | ~102 | renewal triggered                                               | not triggered                                                               |
| 3   | triggers renewal when the session is expired        | ~134 | renewal triggered                                               | not triggered                                                               |
| 4   | returns an error when renewal fails after retries   | ~169 | structured error                                                | undefined or mismatch                                                       |
| 5   | returns platform status in health checks            | ~190 | `{status:'degraded', platforms:{wanted:{...}, linkedin:{...}}}` | `{status:'healthy', platforms:{wanted:{...no renewedAt, no lastError...}}}` |

**Root cause (test #5, sampled)**:
`SessionBrokerService.getHealth()` at `src/session-broker/services/session-broker-service.js:356-376`
iterates over the hardcoded `SUPPORTED_SESSION_BROKER_PLATFORMS` (= `['wanted']`), but
tests pass `platforms: ['wanted', 'linkedin']` via constructor options.

**Also missing from the return object**:

- `platforms[x].renewedAt`
- `platforms[x].lastError`

**Fix strategy**:

1. Add `this.platforms = options.platforms || [...SUPPORTED_SESSION_BROKER_PLATFORMS]` to constructor
2. Change `getHealth()` iteration source to `this.platforms`
3. Extract `renewedAt` from `checkSession()` result (already returned by checkSession)
4. Track `lastError` per platform (probably via a new `this.#lastErrors` Map)
5. Handle 'linkedin' and other non-wanted platforms as "no login flow → always EXPIRED"

Tests 1-4 likely share related root causes once the constructor + getHealth changes land.

### Group B: Apply service integration (2 failures)

**File**: `apps/job-server/src/shared/services/apply/__tests__/integration.test.js`

| #   | Test                                                                                        | Duration | Notes                                                              |
| --- | ------------------------------------------------------------------------------------------- | -------: | ------------------------------------------------------------------ |
| 1   | integrates RetryService behavior through Wanted strategy failures and open circuit fallback |   7143ms | Hits actual retry timing; circuit breaker may not open as expected |
| 2   | full pipeline integration keeps D1 state consistent across services                         |     ~5ms | Assertion mismatch on application state after full pipeline        |

**Root cause**: Unknown without deeper investigation. Likely related to:

- RetryService configuration or mock setup
- `applyToJob` in `wanted-strategy.js` not threading errors through properly
- D1 state not being committed/read correctly with `InMemoryD1Client`

## Recommended Work Plan

1. **Fix Group A first** (higher value, clearer root cause):
   - One commit: refactor `SessionBrokerService` to accept `platforms` option and return complete platform status
   - Run session broker tests only; verify all 5 pass
   - Commit: `fix(session-broker): support configurable platforms in getHealth + return renewedAt/lastError`

2. **Fix Group B** (requires deeper investigation):
   - Debug RetryService timing — might need mock timers
   - Check D1 state flow through apply pipeline
   - Separate commits per test fix

3. **Finally**: Remove `continue-on-error: true` from `.github/workflows/ci.yml:80` once all 7 pass.
   Commit: `ci: re-enable test-node as blocking after pre-existing test fixes`

## Verification

After fixing:

```bash
cd apps/job-server
timeout 30 npm test
# Expect: 782 tests, 782 pass, 0 fail, 0 cancelled, ~8s duration
```

```bash
# And then CI should pass with test-node as blocking:
gh run list --repo jclee941/resume --workflow=ci.yml --limit 1
```

## Related Commits

- `fb4657c` — `fix(job-server): unblock node --test hang via timer unref + LazyCrawlerRegistry repair`
  (made these failures visible by fixing the 180s+ hang)
- `754cbd2` — last commit where test-node was first split from test-jest
  (continue-on-error introduced here)
