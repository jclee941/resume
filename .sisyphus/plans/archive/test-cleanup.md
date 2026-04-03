# Resume Portfolio Test Cleanup

## TL;DR

> **Quick Summary**: Delete obsolete skipped tests (stats section removed in redesign) and fix @ts-ignore by using proper type assertion.
> 
> **Deliverables**:
> - 2 skipped visual tests deleted from visual.spec.js
> - @ts-ignore replaced with proper TypeScript-safe code
> - Planning docs verified/deleted if exist
> - All tests passing
> - Committed and pushed
> 
> **Estimated Effort**: Quick
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Task 1,2 (parallel) → Task 3 (verify) → Task 4 (commit)

---

## Context

### Original Request
Cleanup actionable tasks from E2E test analysis:
1. Delete skipped visual tests for removed stats section
2. Fix @ts-ignore in ab-testing.test.js
3. Delete completed .sisyphus planning docs (if exist)
4. Commit and push

### What's NOT In Scope (Document Only)
- Sentry configuration (7 tests) - infrastructure decision
- Performance test investigation - needs deeper analysis
- Archive file GitLab references - low priority historical

### Research Findings
- **visual.spec.js lines 52-60**: Skipped test for `.stats-grid` - stats section removed in neon redesign
- **visual.spec.js lines 167-175**: Skipped test for `.stat-card` - same reason
- **ab-testing.test.js line 406-407**: Uses `delete global.localStorage` which TypeScript treats as readonly
- **.sisyphus planning docs**: Glob returned empty - may already be deleted, verify during execution

---

## Work Objectives

### Core Objective
Remove dead test code and fix TypeScript warning for cleaner test suite.

### Concrete Deliverables
- `tests/e2e/visual.spec.js` - 2 test blocks deleted
- `tests/unit/lib/ab-testing.test.js` - @ts-ignore removed, proper type assertion added
- `.sisyphus/plans/css-csp-gitlab-cleanup.md` - deleted (if exists)
- `.sisyphus/drafts/css-csp-gitlab-cleanup.md` - deleted (if exists)

### Definition of Done
- [ ] `npm test` passes with no failures
- [ ] `npm run test:e2e` passes (or skips expected Sentry tests)
- [ ] No @ts-ignore in ab-testing.test.js
- [ ] Git working directory clean after commit

### Must Have
- All tests pass after changes
- Proper TypeScript handling for localStorage mock

### Must NOT Have (Guardrails)
- Do NOT enable Sentry tests (infrastructure not configured)
- Do NOT investigate performance test (out of scope)
- Do NOT modify archive files (low priority)
- Do NOT add new test dependencies

---

## Verification Strategy

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
> All verification via agent-executed commands.

### Test Decision
- **Infrastructure exists**: YES (Jest + Playwright)
- **Automated tests**: Tests-after (verify existing tests pass)
- **Framework**: Jest (unit), Playwright (E2E)

### Agent-Executed QA Scenarios (MANDATORY)

```
Scenario: Unit tests pass after @ts-ignore fix
  Tool: Bash
  Preconditions: Changes applied to ab-testing.test.js
  Steps:
    1. cd /home/jclee/dev/resume
    2. npm test -- --testPathPattern="ab-testing"
    3. Assert: Exit code 0
    4. Assert: stdout contains "Tests:" with no failures
  Expected Result: All ab-testing tests pass
  Evidence: Terminal output captured

Scenario: E2E visual tests pass with deleted tests removed
  Tool: Bash
  Preconditions: Changes applied to visual.spec.js
  Steps:
    1. cd /home/jclee/dev/resume
    2. npm run test:e2e -- --grep "visual"
    3. Assert: No "stats grid" or "stat card" tests in output
    4. Assert: Exit code 0 or expected skips (Sentry only)
  Expected Result: Visual tests run without deleted tests
  Evidence: Terminal output captured

Scenario: No @ts-ignore remaining in ab-testing.test.js
  Tool: Bash (grep)
  Steps:
    1. grep -n "@ts-ignore" tests/unit/lib/ab-testing.test.js
    2. Assert: No output (exit code 1)
  Expected Result: No @ts-ignore comments found
  Evidence: Grep output
```

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately - Independent Edits):
├── Task 1: Delete skipped visual tests
└── Task 2: Fix @ts-ignore in ab-testing

Wave 2 (After Wave 1):
└── Task 3: Verify all tests pass + Delete planning docs

Wave 3 (After Wave 2):
└── Task 4: Commit and push

Critical Path: Tasks 1,2 → Task 3 → Task 4
Parallel Speedup: ~30% faster than sequential
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 3 | 2 |
| 2 | None | 3 | 1 |
| 3 | 1, 2 | 4 | None |
| 4 | 3 | None | None (final) |

---

## TODOs

### Wave 1 (Start Immediately)

- [ ] 1. Delete skipped visual regression tests

  **What to do**:
  - Delete lines 51-60 in visual.spec.js (stats grid test block + comment)
  - Delete lines 166-176 in visual.spec.js (stat card test block + comment)
  - Note: Line numbers will shift after first deletion - delete from bottom up

  **Must NOT do**:
  - Do NOT delete any other skipped tests (Sentry tests are intentional)
  - Do NOT modify test configuration

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single file, simple deletions, trivial task
  - **Skills**: [`git-master`]
    - `git-master`: Will need to stage and commit changes

  **Skills Evaluated but Omitted**:
  - `typescript-programmer`: Not needed - just deleting code
  - `playwright`: Not modifying test logic

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: Task 3
  - **Blocked By**: None

  **References**:
  - `tests/e2e/visual.spec.js:51-60` - First test to delete (stats grid)
  - `tests/e2e/visual.spec.js:166-176` - Second test to delete (stat card)
  - Comment: `// Stats section removed in redesign - test skipped`

  **Acceptance Criteria**:
  - [ ] No `test.skip('stats grid screenshot'` in visual.spec.js
  - [ ] No `test.skip('single stat card screenshot'` in visual.spec.js
  - [ ] File still valid JavaScript (no syntax errors)
  - [ ] `grep -c "stats" tests/e2e/visual.spec.js` → 0 matches

  **QA Scenario**:
  ```
  Scenario: Visual tests file has no stats references
    Tool: Bash
    Steps:
      1. grep -c "stats" tests/e2e/visual.spec.js
      2. Assert: Output is "0" (no matches)
    Expected: All stats-related tests removed
  ```

  **Commit**: NO (groups with Task 2)

---

- [ ] 2. Fix @ts-ignore in ab-testing.test.js

  **What to do**:
  - Replace lines 406-407:
    ```javascript
    // @ts-ignore
    delete global.localStorage;
    ```
  - With TypeScript-safe alternative:
    ```javascript
    (global as any).localStorage = undefined;
    ```
  - OR use Object.defineProperty approach:
    ```javascript
    Object.defineProperty(global, 'localStorage', { value: undefined, writable: true });
    ```

  **Must NOT do**:
  - Do NOT change test logic
  - Do NOT modify other tests in the file

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single line fix, trivial change
  - **Skills**: [`typescript-programmer`]
    - `typescript-programmer`: Ensures proper TypeScript type handling

  **Skills Evaluated but Omitted**:
  - `git-master`: Commit handled in Task 4

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Task 3
  - **Blocked By**: None

  **References**:
  - `tests/unit/lib/ab-testing.test.js:404-413` - Test function context
  - Line 412: `global.localStorage = originalLocalStorage` - Must keep restore logic

  **Acceptance Criteria**:
  - [ ] No `@ts-ignore` in ab-testing.test.js
  - [ ] Test still passes: `npm test -- --testPathPattern="ab-testing"`
  - [ ] localStorage is properly mocked/unmocked

  **QA Scenario**:
  ```
  Scenario: No @ts-ignore and test passes
    Tool: Bash
    Steps:
      1. grep "@ts-ignore" tests/unit/lib/ab-testing.test.js
      2. Assert: No output (grep returns 1)
      3. npm test -- --testPathPattern="ab-testing"
      4. Assert: Exit code 0
    Expected: Clean code, passing test
  ```

  **Commit**: NO (groups with Task 1)

---

### Wave 2 (After Wave 1)

- [ ] 3. Verify tests pass and delete planning docs

  **What to do**:
  - Run full test suite to verify no regressions
  - Check if `.sisyphus/plans/css-csp-gitlab-cleanup.md` exists and delete
  - Check if `.sisyphus/drafts/css-csp-gitlab-cleanup.md` exists and delete
  - Note: Glob returned empty, so these may already be deleted

  **Must NOT do**:
  - Do NOT delete other planning docs
  - Do NOT delete this plan file (test-cleanup.md)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple verification and file deletion
  - **Skills**: [`git-master`]
    - `git-master`: File operations and git status

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (sequential)
  - **Blocks**: Task 4
  - **Blocked By**: Tasks 1, 2

  **Acceptance Criteria**:
  - [ ] `npm test` exits with code 0
  - [ ] `npm run test:e2e` exits with code 0 (or only Sentry skips)
  - [ ] No css-csp-gitlab-cleanup.md files in .sisyphus/

  **QA Scenario**:
  ```
  Scenario: All tests pass
    Tool: Bash
    Steps:
      1. cd /home/jclee/dev/resume
      2. npm test
      3. Assert: Exit code 0
      4. npm run test:e2e
      5. Assert: Exit code 0 or only Sentry-related skips
    Expected: Clean test run
  ```

  **Commit**: NO (groups with Task 4)

---

### Wave 3 (Final)

- [ ] 4. Commit and push all changes

  **What to do**:
  - Stage all modified files
  - Commit with message: `test: cleanup obsolete skipped tests and fix ts-ignore`
  - Push to origin/master

  **Must NOT do**:
  - Do NOT amend previous commits
  - Do NOT force push

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple git operation
  - **Skills**: [`git-master`]
    - `git-master`: Proper commit message and git workflow

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (final)
  - **Blocks**: None (final task)
  - **Blocked By**: Task 3

  **References**:
  - Project uses conventional commits: `type(scope): description`

  **Acceptance Criteria**:
  - [ ] `git status` shows clean working directory
  - [ ] `git log -1` shows new commit
  - [ ] `git push` succeeds

  **QA Scenario**:
  ```
  Scenario: Changes committed and pushed
    Tool: Bash
    Steps:
      1. git status
      2. Assert: "nothing to commit, working tree clean"
      3. git log -1 --oneline
      4. Assert: Contains "test: cleanup"
    Expected: All changes committed and pushed
  ```

  **Commit**: YES
  - Message: `test: cleanup obsolete skipped tests and fix ts-ignore`
  - Files: `tests/e2e/visual.spec.js`, `tests/unit/lib/ab-testing.test.js`
  - Pre-commit: `npm test`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 4 | `test: cleanup obsolete skipped tests and fix ts-ignore` | visual.spec.js, ab-testing.test.js | npm test |

---

## Success Criteria

### Verification Commands
```bash
# Verify no stats tests remain
grep -c "stats" tests/e2e/visual.spec.js  # Expected: 0

# Verify no @ts-ignore
grep "@ts-ignore" tests/unit/lib/ab-testing.test.js  # Expected: no output

# Run unit tests
npm test  # Expected: all pass

# Run E2E tests
npm run test:e2e  # Expected: pass (Sentry skips OK)

# Verify clean git status
git status  # Expected: clean working tree
```

### Final Checklist
- [ ] 2 skipped visual tests deleted
- [ ] @ts-ignore replaced with proper type handling
- [ ] All unit tests pass
- [ ] All E2E tests pass (excluding expected Sentry skips)
- [ ] Changes committed with conventional commit message
- [ ] Pushed to origin/master

---

## Out of Scope (Documented for Future Reference)

| Item | Reason | Future Action |
|------|--------|---------------|
| Sentry tests (7) | Needs DSN configuration | Configure Sentry in worker.js when ready |
| Performance test | Flaky, needs investigation | Deep dive into JSON-LD script timing |
| Archive GitLab refs | Historical files, low priority | Optional cleanup later |
