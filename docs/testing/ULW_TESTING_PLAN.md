# ULW Testing Plan: Wanted/JobKorea Auto-Apply & Auto-Sync

**Version**: 1.0.0  
**Date**: 2025-04-04  
**Status**: TDD-Oriented Execution Plan  
**Estimated Duration**: 2-3 hours (parallel execution)

---

## Executive Summary

This plan provides a systematic approach to debug, test, and verify the Wanted/JobKorea auto-apply and auto-sync functionality using a TDD-oriented methodology with parallel task execution. The plan covers unit tests, integration tests, and E2E tests with clear dependencies and success criteria.

---

## Architecture Overview

### Sync System

```
SSOT (packages/data/resumes/master/resume_data.json)
    │
    ├──► Wanted (API-based) ──► WantedAPI ──► Chaos API v2
    │                           Session: ~/.OpenCode/data/wanted-session.json
    │
    ├──► JobKorea (Browser-based) ──► Playwright + Stealth
    │                                  Session: CDP/Cookie extraction
    │
    └──► Saramin (Browser-based) ──► Playwright + Stealth
```

### Auto-Apply System

```
Auto-Apply Flow:
    1. Search Phase ──► UnifiedJobCrawler
    2. Filter Phase ──► JobFilter (heuristic + AI hybrid scoring)
                       <60: skip | 60-74: review | ≥75: auto-apply
    3. Apply Phase ──► AutoApplier (Playwright stealth form submission)
```

---

## Phase 0: Prerequisites & Environment Setup

### Task 0.1: Verify Environment

**Parallel**: Yes (independent)  
**Estimated Time**: 5 minutes

```bash
# Check Node.js version (>=22.0.0 required)
node --version

# Check npm workspaces
npm ls

# Verify required directories exist
ls -la ~/.OpenCode/data/
ls -la apps/job-server/src/auto-apply/
```

**Success Criteria**:

- [ ] Node.js ≥22.0.0
- [ ] All npm workspaces installed
- [ ] `~/.OpenCode/data/` directory exists
- [ ] `wanted-session.json` exists or can be created

### Task 0.2: Session Health Check

**Parallel**: No (depends on Task 0.1)  
**Estimated Time**: 5 minutes

```bash
cd apps/job-server

# Check Wanted session status
node -e "
  import { SessionManager } from './src/shared/services/session/index.js';
  const h = SessionManager.checkHealth('wanted');
  console.log(JSON.stringify(h, null, 2));
"
```

**Success Criteria**:

- [ ] Session health check returns valid status
- [ ] If expired, session refresh strategy determined (OneID API vs Quick Login)

---

## Phase 1: Profile Sync Testing

### Philosophy

**TDD Approach**: Write tests → Run tests (fail) → Fix code → Run tests (pass)

### Task 1.1: Unit Tests - Profile Sync Handlers

**Parallel**: Yes  
**Estimated Time**: 20 minutes  
**Priority**: High

**Files to Test**:

- `apps/job-server/scripts/profile-sync/wanted-sections.js`
- `apps/job-server/scripts/profile-sync/jobkorea-handler.js`

**Test Commands**:

```bash
cd apps/job-server

# Run existing unit tests
npm test

# If tests fail, run with verbose output
npm test -- --test-name-pattern="profile-sync"
```

**Expected Test Coverage**:

```javascript
// Test cases to verify:
1. Wanted skills sync (v1 API only - v2 is broken)
2. Wanted careers CRUD operations
3. Wanted educations CRUD operations
4. JobKorea browser-based profile update
5. Data mapping from SSOT to platform format
6. Error handling for API failures
```

**Success Criteria**:

- [ ] All unit tests pass
- [ ] Coverage ≥60% lines, ≥55% functions, ≥70% branches
- [ ] No test failures in profile-sync related tests

**Atomic Commit Strategy**:

```bash
# If fixing test failures:
git add apps/job-server/scripts/profile-sync/
git commit -m "fix(profile-sync): resolve unit test failures

- Fix Wanted skills v1 API integration
- Update JobKorea selector mappings
- Add error handling for missing fields

Tests: npm test passes"
```

### Task 1.2: Integration Tests - Cross-Platform Sync

**Parallel**: Yes (with Task 1.1)  
**Estimated Time**: 30 minutes  
**Priority**: High

**Files to Test**:

- `apps/job-server/scripts/profile-sync.js` (567 lines)
- `tests/integration/resume-sync-validation.test.js`

**Test Commands**:

```bash
# From root directory
npm run test:jest -- tests/integration/resume-sync-validation.test.js

# Or run all integration tests
npm run test:jest -- tests/integration/
```

**Test Scenarios**:

```javascript
1. Full sync pipeline (dry-run mode)
   - Input: SSOT resume_data.json
   - Expected: Diff output showing changes
   - Verify: No actual API calls made

2. Platform-specific sync
   - Wanted only: `node scripts/profile-sync.js wanted --diff`
   - JobKorea only: `node scripts/profile-sync.js jobkorea --diff`

3. SSOT to Platform data mapping validation
   - Verify: personal.name → profile.name
   - Verify: careers[] → work experience section
   - Verify: educations[] → education section
   - Verify: skills[] → skills/tags section
```

**Success Criteria**:

- [ ] Integration tests pass
- [ ] Dry-run mode produces expected diffs
- [ ] Data mapping is accurate for all platforms
- [ ] Error handling works for invalid/missing data

**Atomic Commit Strategy**:

```bash
# If fixing integration issues:
git add apps/job-server/scripts/profile-sync.js
git add tests/integration/resume-sync-validation.test.js
git commit -m "fix(sync): resolve integration test failures

- Fix data mapping for JobKorea education section
- Add null checks for optional fields
- Update test fixtures with realistic data

Integration tests: PASS"
```

### Task 1.3: E2E Tests - Profile Sync End-to-End

**Parallel**: No (depends on Task 1.2)  
**Estimated Time**: 40 minutes  
**Priority**: Medium

**Files to Test**:

- `apps/job-server/src/e2e.test.js` (existing E2E tests)
- `apps/job-server/src/pipeline.test.js` (pipeline tests)

**Test Commands**:

```bash
cd apps/job-server

# Run E2E tests (requires valid session)
npm run test:e2e

# Run pipeline tests
npm run test:pipeline
```

**Test Scenarios**:

```javascript
// Scenario 1: Full Sync Pipeline
1. Export current resume from Wanted
2. Generate diff between SSOT and remote
3. Apply sync (dry-run)
4. Verify no unintended changes

// Scenario 2: Resume Update Pipeline
1. Modify SSOT resume_data.json
2. Run sync with --diff flag
3. Verify diff detects changes
4. Run sync with --apply flag
5. Verify remote resume updated

// Scenario 3: Session Management
1. Test with expired session
2. Verify auto-refresh attempt
3. Test with invalid credentials
4. Verify graceful error handling
```

**Success Criteria**:

- [ ] E2E tests pass (may require valid session)
- [ ] Pipeline tests pass
- [ ] Session refresh works correctly
- [ ] Error messages are user-friendly

**Manual Verification** (if automated tests insufficient):

```bash
# Dry-run sync
cd apps/job-server
node scripts/profile-sync.js --diff

# Check output for:
# - Accurate diff detection
# - No JavaScript errors
# - Proper logging
```

---

## Phase 2: Auto-Apply Testing

### Task 2.1: Unit Tests - Job Filter & Scoring

**Parallel**: Yes  
**Estimated Time**: 25 minutes  
**Priority**: High

**Files to Test**:

- `apps/job-server/src/shared/services/apply/job-filter.js` (398 lines)
- `tests/unit/job-automation/unified-apply-system.test.js`

**Test Commands**:

```bash
# From root
npm run test:jest -- tests/unit/job-automation/

# Run job-server unit tests
cd apps/job-server
npm test -- --test-name-pattern="job-filter"
```

**Test Scenarios**:

```javascript
// Critical thresholds to verify:
1. Score < 60 → SKIP
   - Input: Low match job
   - Expected: filtered out, no application

2. Score 60-74 → REVIEW (manual approval)
   - Input: Medium match job
   - Expected: Telegram notification with approval buttons

3. Score ≥ 75 → AUTO-APPLY
   - Input: High match job
   - Expected: Automatic application submission

4. Heuristic vs AI scoring
   - Test heuristic-only mode (fallback)
   - Test AI-enhanced mode (primary)
   - Verify consistent scoring between modes
```

**Success Criteria**:

- [ ] All threshold tests pass
- [ ] Scoring logic produces consistent results
- [ ] Review queue correctly identifies borderline matches
- [ ] Auto-apply only triggers for high-confidence matches

**Atomic Commit Strategy**:

```bash
# If fixing scoring issues:
git add apps/job-server/src/shared/services/apply/job-filter.js
git commit -m "fix(auto-apply): correct scoring thresholds

- Fix heuristic scoring for DevOps keywords
- Adjust threshold boundaries (60/75)
- Add weight for preferred companies

Unit tests: PASS
Coverage: 72% lines"
```

### Task 2.2: Unit Tests - Apply Orchestrator

**Parallel**: Yes (with Task 2.1)  
**Estimated Time**: 20 minutes  
**Priority**: High

**Files to Test**:

- `apps/job-server/src/shared/services/apply/orchestrator.js` (180 lines)
- `apps/job-server/src/auto-apply/application-manager.js`

**Test Commands**:

```bash
cd apps/job-server
npm test -- --test-name-pattern="orchestrator"
```

**Test Scenarios**:

```javascript
1. Three-phase execution
   - Phase 1: Search completes successfully
   - Phase 2: Filter produces correct job list
   - Phase 3: Apply processes jobs in order

2. Error recovery
   - Simulate network failure during search
   - Verify retry logic (max 3 attempts)
   - Verify graceful degradation

3. Rate limiting
   - Test maxDailyApplications enforcement
   - Verify counter increments correctly
   - Test reset at midnight

4. Daily limit: 20 applications
   - Submit 20 applications
   - Verify 21st is rejected
   - Verify proper error message
```

**Success Criteria**:

- [ ] All orchestrator tests pass
- [ ] Three-phase flow executes correctly
- [ ] Error recovery works as designed
- [ ] Rate limiting enforced strictly

### Task 2.3: Integration Tests - Full Apply Flow

**Parallel**: No (depends on Task 2.1 & 2.2)  
**Estimated Time**: 35 minutes  
**Priority**: High

**Files to Test**:

- `tests/integration/auto-apply-full-flow.test.js` (687 lines)

**Test Commands**:

```bash
# From root
npm run test:jest -- tests/integration/auto-apply-full-flow.test.js

# With coverage
npm run test:jest -- tests/integration/auto-apply-full-flow.test.js --coverage
```

**Test Scenarios** (from existing test file):

```javascript
// Scenario A: Full Apply Pipeline
searchJobs → filterByMatchScore → applyToJobs → trackApplication

// Scenario B: Match Score Filtering
- Test minMatchScore threshold (default: 70)
- Verify jobs below threshold are skipped
- Verify borderline jobs enter review queue

// Scenario C: Error Recovery
- Simulate form submission failure
- Verify retry mechanism (max 3)
- Verify error logging

// Scenario D: Daily Limit Enforcement
- Mock 20 applications in database
- Attempt 21st application
- Verify rejection with proper message
```

**Success Criteria**:

- [ ] All 4 integration scenarios pass
- [ ] Coverage meets thresholds (60/55/70)
- [ ] No circular dependencies introduced
- [ ] Mock objects properly isolate external services

**Atomic Commit Strategy**:

```bash
# If fixing integration issues:
git add tests/integration/auto-apply-full-flow.test.js
git add apps/job-server/src/shared/services/apply/
git commit -m "fix(auto-apply): resolve full flow integration issues

- Fix ApplyOrchestrator phase transitions
- Add missing error handling in job-filter
- Update test mocks for new API signatures

Integration tests: 4/4 PASS
Coverage: 68% lines"
```

### Task 2.4: E2E Tests - Auto-Apply End-to-End

**Parallel**: No (depends on Task 2.3)  
**Estimated Time**: 45 minutes  
**Priority**: Medium

**Files to Test**:

- `apps/job-server/src/auto-apply/__tests__/auto-apply.e2e.test.js` (994 lines)

**Test Commands**:

```bash
cd apps/job-server

# Run E2E tests
npm run test:e2e

# Run auto-apply specific tests
npm test -- --test-name-pattern="auto-apply"
```

**Test Scenarios** (from existing 9 test groups):

```javascript
// Test Group 1: Full Workflow
- Complete search → filter → apply pipeline
- Verify D1 persistence of applications

// Test Group 2: Filtering & Scoring
- Keyword matching accuracy
- Company preference weighting
- Experience level matching

// Test Group 3: Cover Letter Generation
- AI-generated cover letters
- Template-based fallback
- Customization per job

// Test Group 4: Approval Workflow
- Telegram notifications
- Approval button functionality
- Rejection handling

// Test Group 5: Form Submission
- Wanted platform submission
- JobKorea platform submission
- Error handling for failed submissions

// Test Group 6: Error Handling
- Network timeouts
- Invalid job URLs
- Platform detection failures

// Test Group 7: Notifications
- Telegram integration
- Success/failure reporting
- Daily summary reports

// Test Group 8: D1 Persistence
- Application record creation
- Status updates
- Historical tracking

// Test Group 9: Scheduler
- Cron job execution
- Overlap prevention
- Graceful shutdown
```

**Success Criteria**:

- [ ] All 9 test groups pass
- [ ] D1 operations work correctly
- [ ] Telegram notifications sent
- [ ] No memory leaks in long-running tests

**Manual Verification** (if needed):

```bash
# Dry-run auto-apply
cd apps/job-server
node src/auto-apply/cli.js unified --dry-run --max=3

# Verify:
# - Jobs are found
# - Scoring produces expected results
# - No actual applications sent (dry-run)
```

---

## Phase 3: Cron & Automation Testing

### Task 3.1: Auto-Apply Cron Tests

**Parallel**: Yes  
**Estimated Time**: 20 minutes  
**Priority**: Medium

**Files to Test**:

- `apps/job-server/scripts/auto-apply-cron.js` (294 lines)

**Test Commands**:

```bash
cd apps/job-server

# Test cron script (dry-run)
node scripts/auto-apply-cron.js --dry-run

# Check logs
cat ~/.opencode/data/wanted-logs/auto-apply-$(date +%Y-%m-%d).log
```

**Test Scenarios**:

```javascript
1. Session Health Check
   - Verify SessionManager.checkHealth() called
   - Test session refresh on expiry
   - Test graceful failure on auth error

2. Auto-Apply Execution
   - Verify CLI invoked with correct args
   - Test --apply flag propagation
   - Test --max=N enforcement

3. Logging
   - Verify structured logging format
   - Test log rotation
   - Verify error details captured

4. Exit Codes
   - Success: exit code 0
   - Partial failure: exit code 1
   - Complete failure: exit code 2
```

**Success Criteria**:

- [ ] Cron script executes without errors
- [ ] Session health check works
- [ ] Logs are structured and readable
- [ ] Exit codes are correct

**Atomic Commit Strategy**:

```bash
# If fixing cron issues:
git add apps/job-server/scripts/auto-apply-cron.js
git commit -m "fix(cron): resolve auto-apply cron failures

- Fix session health check logic
- Add proper error exit codes
- Improve logging for debugging

Cron test: PASS (dry-run)"
```

---

## Phase 4: Cross-Cutting Tests

### Task 4.1: Session Management Tests

**Parallel**: Yes  
**Estimated Time**: 15 minutes  
**Priority**: High

**Files to Test**:

- `apps/job-server/src/shared/services/session/`

**Test Commands**:

```bash
cd apps/job-server
npm test -- --test-name-pattern="session"
```

**Test Scenarios**:

```javascript
1. Session Persistence
   - Cookie storage in ~/.OpenCode/data/wanted-session.json
   - 24-hour TTL enforcement
   - Concurrent access handling

2. Session Refresh Strategies
   - OneID API login (primary)
   - Quick-login fallback
   - CDP cookie extraction

3. Multi-Platform Sessions
   - Wanted session
   - JobKorea session
   - Saramin session
```

**Success Criteria**:

- [ ] Session persists correctly
- [ ] TTL enforcement works
- [ ] Refresh strategies execute properly

### Task 4.2: Error Handling & Recovery Tests

**Parallel**: Yes  
**Estimated Time**: 15 minutes  
**Priority**: Medium

**Test Commands**:

```bash
# From root
npm run test:jest -- tests/integration/network-failure-scenarios.test.js
```

**Test Scenarios**:

```javascript
1. Network Failures
   - Timeout handling
   - Retry with exponential backoff
   - Circuit breaker pattern

2. API Errors
   - 500 errors (Wanted Links API is broken)
   - 429 rate limiting
   - 401/403 auth errors

3. Browser Automation Failures
   - Page load timeouts
   - Element not found
   - CAPTCHA detection
```

**Success Criteria**:

- [ ] All error scenarios handled gracefully
- [ ] Retry logic works correctly
- [ ] No unhandled promise rejections

---

## Phase 5: Final Verification & Reporting

### Task 5.1: Full Test Suite Execution

**Parallel**: No (depends on all previous phases)  
**Estimated Time**: 15 minutes  
**Priority**: High

**Commands**:

```bash
# From root - run all tests
npm test

# Full verification pipeline
npm run automate:ssot
```

**Success Criteria**:

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass (or documented skips)
- [ ] Coverage thresholds met
- [ ] Type check passes
- [ ] Lint passes

### Task 5.2: Manual Smoke Tests

**Parallel**: No  
**Estimated Time**: 10 minutes  
**Priority**: Medium

**Commands**:

```bash
# Test profile sync dry-run
cd apps/job-server
node scripts/profile-sync.js --diff

# Test auto-apply dry-run
node src/auto-apply/cli.js unified --dry-run --max=2

# Check session status
node -e "
  import { SessionManager } from './src/shared/services/session/index.js';
  console.log(SessionManager.checkHealth('wanted'));
"
```

**Success Criteria**:

- [ ] Profile sync produces valid diff output
- [ ] Auto-apply dry-run completes without errors
- [ ] Session status is accurate

---

## Parallel Execution Plan

### Parallel Group A: Unit Tests (Phase 1 & 2)

```
Task 1.1: Unit Tests - Profile Sync Handlers (20min)
Task 2.1: Unit Tests - Job Filter & Scoring (25min)
Task 2.2: Unit Tests - Apply Orchestrator (20min)
─────────────────────────────────────────
Total: 25min (max of parallel tasks)
```

### Parallel Group B: Integration Tests (Phase 1 & 2)

```
Task 1.2: Integration Tests - Cross-Platform Sync (30min)
Task 2.3: Integration Tests - Full Apply Flow (35min)
─────────────────────────────────────────
Total: 35min (max of parallel tasks)
```

### Parallel Group C: Independent Tests (Phase 3 & 4)

```
Task 3.1: Auto-Apply Cron Tests (20min)
Task 4.1: Session Management Tests (15min)
Task 4.2: Error Handling Tests (15min)
─────────────────────────────────────────
Total: 20min (max of parallel tasks)
```

### Sequential Chain: E2E Tests (High Dependencies)

```
Task 0.1: Environment Verification (5min)
   ↓
Task 0.2: Session Health Check (5min)
   ↓
Task 1.3: E2E Tests - Profile Sync (40min) [depends on 1.2]
   ↓
Task 2.4: E2E Tests - Auto-Apply (45min) [depends on 2.3]
   ↓
Task 5.1: Full Test Suite (15min)
   ↓
Task 5.2: Manual Smoke Tests (10min)
─────────────────────────────────────────
Total: 120min (sequential)
```

### Total Execution Time

- Parallel groups: 80 minutes
- Sequential chain: 120 minutes
- **Total**: ~3.5 hours with full parallelism, ~5 hours sequential

---

## Dependency Graph

```
Phase 0 (Setup)
    │
    ├── Task 0.1 ──┐
    │              │
    └── Task 0.2 ──┘
                   │
Phase 1 (Sync)     │
    │              │
    ├── Task 1.1 ──┼──► Task 1.2 ──► Task 1.3
    │              │
Phase 2 (Apply)    │
    │              │
    ├── Task 2.1 ──┤
    │              │
    ├── Task 2.2 ──┼──► Task 2.3 ──► Task 2.4
    │              │
Phase 3 (Cron)     │
    │              │
    └── Task 3.1 ──┤
                   │
Phase 4 (Cross)    │
    │              │
    ├── Task 4.1 ──┤
    │              │
    └── Task 4.2 ──┘
                   │
Phase 5 (Final)    │
    │              │
    ├── Task 5.1 ──┘
    │
    └── Task 5.2
```

---

## Atomic Commit Strategy

### Commit Message Template

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Commit Types for This Plan

- `fix(profile-sync):` - Profile sync fixes
- `fix(auto-apply):` - Auto-apply fixes
- `fix(cron):` - Cron script fixes
- `test(sync):` - Sync test additions
- `test(apply):` - Auto-apply test additions
- `refactor(session):` - Session management improvements
- `docs(tests):` - Test documentation updates

### Commit Checklist

For each atomic commit:

- [ ] All tests pass before commit
- [ ] Changes are focused on single concern
- [ ] Commit message follows template
- [ ] No unrelated file changes
- [ ] Coverage not decreased (ideally increased)

### Example Commits

```bash
# After fixing Wanted skills sync:
git add apps/job-server/scripts/profile-sync/wanted-sections.js
git commit -m "fix(profile-sync): correct Wanted skills v1 API integration

- Use v1 endpoint (v2 returns 500)
- Map skill names to tag_type_ids
- Add error handling for missing mappings

Unit tests: PASS
Coverage: 65% → 72%"

# After fixing job-filter scoring:
git add apps/job-server/src/shared/services/apply/job-filter.js
git commit -m "fix(auto-apply): adjust scoring thresholds for DevOps roles

- Lower threshold for Kubernetes experience (70 → 65)
- Add bonus for security-related keywords
- Fix company preference weight calculation

Unit tests: 15/15 PASS"
```

---

## Success Criteria Summary

### Must Have (Block Release)

- [ ] All unit tests pass (npm test in job-server)
- [ ] All integration tests pass (npm run test:jest)
- [ ] Coverage thresholds met (60/55/70)
- [ ] Type check passes (npm run typecheck)
- [ ] Lint passes (npm run lint)
- [ ] Profile sync dry-run produces valid output
- [ ] Auto-apply dry-run completes without errors

### Should Have (High Priority)

- [ ] E2E tests pass (or documented skips with reasons)
- [ ] Session refresh works automatically
- [ ] Error handling covers all known failure modes
- [ ] Documentation updated for any API changes

### Nice to Have (If Time Permits)

- [ ] Coverage >80% for critical paths
- [ ] Performance tests (application submission <30s)
- [ ] Load tests (concurrent applications)
- [ ] Visual regression tests for dashboard

---

## Rollback Plan

If critical failures are found:

1. **Immediate Rollback**:

   ```bash
   git stash  # Stash current changes
   git checkout <last-known-good-commit>
   npm test  # Verify rollback
   ```

2. **Investigation**:
   - Run `git bisect` to find first bad commit
   - Check `~/.opencode/data/wanted-logs/` for error details
   - Review recent changes to sync/apply modules

3. **Fix Strategy**:
   - Create feature branch from good commit
   - Apply fixes incrementally
   - Run full test suite after each fix
   - Merge back to main only when all tests pass

4. **Emergency Hotfix** (if needed):
   ```bash
   git checkout -b hotfix/sync-emergency
   # Apply minimal fix
   git commit -m "hotfix: emergency sync fix"
   git push origin hotfix/sync-emergency
   # Create PR for review
   ```

---

## Appendix A: Known Issues & Workarounds

### Issue 1: Wanted Links API Broken (500 Error)

**Status**: Known limitation (Wanted-side issue)  
**Workaround**: Manual link management via web UI  
**Impact**: Low (links rarely change)

### Issue 2: Skills API v2 Returns 500

**Status**: Must use v1 API only  
**Workaround**: Code enforces v1 endpoint  
**Impact**: Medium (requires maintaining v1 compatibility)

### Issue 3: CloudFront WAF Blocks Automation

**Status**: Active mitigation in place  
**Workaround**: Stealth plugins + UA rotation  
**Impact**: Medium (requires session refresh every 24h)

### Issue 4: JobKorea CAPTCHA

**Status**: Occasional occurrence  
**Workaround**: Manual intervention required  
**Impact**: Low (rare, usually during peak hours)

---

## Appendix B: Debugging Commands

```bash
# Check session file
cat ~/.OpenCode/data/wanted-session.json

# Check logs
tail -f ~/.opencode/data/wanted-logs/auto-apply-$(date +%Y-%m-%d).log

# Test Wanted API directly
cd apps/job-server
node -e "
  import WantedAPI from './src/shared/clients/wanted/index.js';
  const api = new WantedAPI();
  const profile = await api.getProfile();
  console.log(profile);
"

# Test JobKorea crawler
cd apps/job-server
node -e "
  import JobKoreaCrawler from './src/crawlers/jobkorea-crawler.js';
  const crawler = new JobKoreaCrawler();
  const jobs = await crawler.search('DevOps', { limit: 5 });
  console.log(jobs);
"

# Verify SSOT data
cat packages/data/resumes/master/resume_data.json | jq '.personal, .careers[0]'
```

---

## Appendix C: Test Environment Variables

```bash
# Required for testing
export WANTED_EMAIL="your@email.com"
export WANTED_COOKIES="your_cookie_string"
# OR
export WANTED_PASSWORD="your_password"
export WANTED_ONEID_CLIENT_ID="your_client_id"

# Optional (for Telegram notifications)
export TELEGRAM_BOT_TOKEN="your_bot_token"
export TELEGRAM_CHAT_ID="your_chat_id"

# Testing flags
export DRY_RUN=true
export MAX_APPLICATIONS=3
export LOG_LEVEL=debug
```

---

## Plan Completion Checklist

- [x] Phase 0: Prerequisites identified
- [x] Phase 1: Profile sync testing tasks defined
- [x] Phase 2: Auto-apply testing tasks defined
- [x] Phase 3: Cron automation testing tasks defined
- [x] Phase 4: Cross-cutting tests defined
- [x] Phase 5: Final verification tasks defined
- [x] Dependencies mapped
- [x] Parallel execution groups identified
- [x] Atomic commit strategy documented
- [x] Success criteria defined
- [x] Rollback plan documented
- [x] Known issues documented

---

**Plan Status**: READY FOR EXECUTION  
**Next Step**: Begin Phase 0 - Environment Verification
