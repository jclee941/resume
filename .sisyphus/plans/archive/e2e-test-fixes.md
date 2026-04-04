# Fix 24 E2E Test Failures - Unblock CI/CD

## TL;DR

> **Quick Summary**: Fix 24 E2E test failures across SEO (3), mobile touch (6), visual regression (12), and text size (3) categories to unblock CI/CD deployment for resume.jclee.me portfolio.
> 
> **Deliverables**:
> - Updated `index.html` with correct og:image/twitter:image (.webp) and JSON-LD potentialAction
> - Fixed `mobile.spec.js` with scrollIntoViewIfNeeded() and relaxed threshold
> - Updated visual regression baselines
> - Deployed and verified worker.js to production
> 
> **Estimated Effort**: Medium (2-3 hours)
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Task 1 + 2 (parallel) → Task 3 → Task 4 → Task 5 → Task 6

---

## Context

### Original Request
Fix 24 E2E test failures blocking CI/CD deployment. Failures span:
- SEO meta tags: 3 failures (og:image, twitter:image expect .webp but get .png)
- JSON-LD schema: 1 failure (WebSite missing potentialAction.SearchAction)
- Mobile touch: 6 failures (click on element outside viewport)
- Visual regression: 12 failures (stale baselines after content update)
- Text size: 3 failures (font-size < 14px threshold exceeded)

### Interview Summary
**Key Discussions**:
- Text size fix: Relax threshold from 5 to 8 (user approved - don't block deploy for minor mobile font issues)
- Visual snapshots: Bulk update with --update-snapshots (user approved - all changes intentional)
- Deploy strategy: Full deploy cycle with verification against production
- Test strategy: Run E2E against production after deploy

**Research Findings**:
- `index.html` line 27: `og:image` → `og-image.png` (needs change to `.webp`)
- `index.html` line 46: `twitter:image` → `og-image.png` (needs change to `.webp`)
- `index.html` lines 145-152: WebSite JSON-LD missing `potentialAction`
- `mobile.spec.js` line 217: `clickable.click()` without scrollIntoViewIfNeeded()
- `mobile.spec.js` line 118: `expect(tooSmallCount).toBeLessThan(5)` → change to 8

### Metis Review
**Identified Gaps** (addressed):
- Cloudflare cache purge: Added explicit purge step in Task 4
- Guardrails: Locked down scope to only specified changes
- Edge case - scroll race: Added waitForLoadState before scroll
- Acceptance criteria: Added explicit verification commands

---

## Work Objectives

### Core Objective
Restore CI/CD pipeline by fixing all 24 E2E test failures without introducing new issues.

### Concrete Deliverables
- `apps/portfolio/index.html` - Updated SEO meta tags and JSON-LD
- `tests/e2e/mobile.spec.js` - Fixed touch interaction and relaxed threshold
- `tests/e2e/visual.spec.js-snapshots/` - Updated baselines
- `apps/portfolio/worker.js` - Rebuilt from updated HTML

### Definition of Done
- [ ] `npm run test:e2e` passes 100% (24 previously failing tests now pass)
- [ ] `curl https://resume.jclee.me/health` returns 200 OK
- [ ] `curl -s https://resume.jclee.me/ | grep -o 'og-image\.webp'` returns matches

### Must Have
- All 24 test failures resolved
- Production deployment verified
- Visual snapshots committed to git

### Must NOT Have (Guardrails)
- NO CSS styling changes (only test threshold adjustment)
- NO new SEO schema additions (only add potentialAction to existing WebSite)
- NO worker.js refactoring (only rebuild from HTML)
- NO mobile.spec.js rewrite (only add scrollIntoViewIfNeeded)
- NO arbitrary "while we're at it" improvements
- NO changes to actual portfolio content

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: YES
- **User wants tests**: YES (run E2E after deploy)
- **Framework**: Playwright

### Verification Approach

All acceptance criteria are agent-executable via Playwright browser automation and bash commands.

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Fix index.html (SEO + JSON-LD)
└── Task 2: Fix mobile.spec.js (scroll + threshold)

Wave 2 (After Wave 1):
└── Task 3: Build worker.js

Wave 3 (After Wave 2):
└── Task 4: Deploy to Cloudflare + purge cache

Wave 4 (After Wave 3):
└── Task 5: Update visual snapshots

Wave 5 (After Wave 4):
└── Task 6: Verify all E2E tests pass

Critical Path: Task 1 → Task 3 → Task 4 → Task 5 → Task 6
Parallel Speedup: ~30% faster than sequential (Wave 1 parallelism)
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 3 | 2 |
| 2 | None | 5, 6 | 1 |
| 3 | 1 | 4 | None |
| 4 | 3 | 5 | None |
| 5 | 4 | 6 | None |
| 6 | 2, 5 | None | None (final) |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1, 2 | quick category, parallel dispatch |
| 2 | 3 | quick category |
| 3 | 4 | quick category |
| 4 | 5 | quick category with playwright skill |
| 5 | 6 | quick category with playwright skill |

---

## TODOs

- [ ] 1. Fix SEO Meta Tags and JSON-LD Schema in index.html

  **What to do**:
  - Change line 27: `og-image.png` → `og-image.webp`
  - Change line 46: `twitter:image` content from `og-image.png` → `og-image.webp`
  - Add `potentialAction` to WebSite JSON-LD (lines 145-152):
    ```json
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://resume.jclee.me/?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
    ```

  **Must NOT do**:
  - Do NOT add new JSON-LD schemas
  - Do NOT change og:image:width/height/type meta tags
  - Do NOT modify any content outside these specific lines

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple text edits in a single file, no complex logic
  - **Skills**: None required
    - Simple find-and-replace operations
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not a visual/UI task

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: Task 3 (build depends on HTML changes)
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `apps/portfolio/index.html:27` - Current og:image meta tag (change png → webp)
  - `apps/portfolio/index.html:32` - Existing og:image webp (reference format)
  - `apps/portfolio/index.html:46` - Current twitter:image (change png → webp)
  - `apps/portfolio/index.html:145-152` - WebSite JSON-LD (add potentialAction)

  **Test References**:
  - `tests/e2e/seo.spec.js:109` - og:image assertion (expects .webp)
  - `tests/e2e/seo.spec.js:219` - twitter:image assertion (expects .webp)
  - `tests/e2e/seo.spec.js:356-363` - WebSite potentialAction assertion

  **WHY Each Reference Matters**:
  - Line 27/32: Shows current og:image format; line 32 already has webp as secondary, make it primary
  - Line 46: twitter:image must match og:image format
  - Lines 145-152: Add potentialAction INSIDE the existing JSON-LD block, before closing `}`
  - seo.spec.js lines: Show exact regex pattern expected by tests

  **Acceptance Criteria**:

  **Automated Verification** (using Bash grep):
  ```bash
  # Agent runs after edit:
  grep -n 'og:image.*content.*og-image\.webp' apps/portfolio/index.html
  # Assert: Returns line 27 (or similar) with webp

  grep -n 'twitter:image.*content.*og-image\.webp' apps/portfolio/index.html
  # Assert: Returns line 46 (or similar) with webp

  grep -n 'SearchAction' apps/portfolio/index.html
  # Assert: Returns line within WebSite JSON-LD block
  ```

  **Evidence to Capture**:
  - [ ] grep output showing og:image.webp
  - [ ] grep output showing twitter:image.webp
  - [ ] grep output showing SearchAction in JSON-LD

  **Commit**: YES (groups with Task 2)
  - Message: `fix(seo): update og/twitter image to webp and add SearchAction to JSON-LD`
  - Files: `apps/portfolio/index.html`
  - Pre-commit: None (HTML only)

---

- [ ] 2. Fix Mobile Touch Test in mobile.spec.js

  **What to do**:
  - At line 217, BEFORE `await clickable.click();`, add:
    ```javascript
    await clickable.scrollIntoViewIfNeeded();
    ```
  - At line 118, change threshold from 5 to 8:
    ```javascript
    expect(tooSmallCount).toBeLessThan(8);  // Was: toBeLessThan(5)
    ```

  **Must NOT do**:
  - Do NOT rewrite the entire test
  - Do NOT change the test logic beyond these specific fixes
  - Do NOT add new test cases
  - Do NOT modify other test files

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Two small edits in a single test file
  - **Skills**: None required
    - Simple line edits
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not writing new tests, just fixing existing

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Task 5, Task 6 (test fixes must be in place before running tests)
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `tests/e2e/mobile.spec.js:217` - Current click without scroll (add scrollIntoViewIfNeeded before)
  - `tests/e2e/mobile.spec.js:118` - Current threshold toBeLessThan(5) (change to 8)
  - `tests/e2e/mobile.spec.js:209` - expect(clickable).toBeVisible() pattern (scroll goes after this)

  **Test References**:
  - `tests/AGENTS.md` - "Arbitrary Sleeps: Use networkidle or waitForSelector for stability"

  **WHY Each Reference Matters**:
  - Line 217: This is exactly where click() fails; scrollIntoViewIfNeeded() must precede it
  - Line 118: This is the threshold that causes 3 failures; relaxing to 8 allows more tolerance
  - Line 209: Shows the flow - visibility check, then scroll, then click

  **Acceptance Criteria**:

  **Automated Verification** (using Bash grep):
  ```bash
  # Agent runs after edit:
  grep -n 'scrollIntoViewIfNeeded' tests/e2e/mobile.spec.js
  # Assert: Returns line ~217 (between visibility check and click)

  grep -n 'toBeLessThan(8)' tests/e2e/mobile.spec.js
  # Assert: Returns line ~118
  ```

  **Evidence to Capture**:
  - [ ] grep output showing scrollIntoViewIfNeeded
  - [ ] grep output showing toBeLessThan(8)

  **Commit**: YES (groups with Task 1)
  - Message: `fix(test): add scrollIntoView for mobile touch and relax text size threshold`
  - Files: `tests/e2e/mobile.spec.js`
  - Pre-commit: None

---

- [ ] 3. Build worker.js from Updated HTML

  **What to do**:
  - Run `npm run build` from project root
  - Verify worker.js was regenerated with updated content
  - Verify og-image.webp reference is embedded

  **Must NOT do**:
  - Do NOT edit worker.js directly
  - Do NOT modify generate-worker.js
  - Do NOT change build configuration

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single command execution with verification
  - **Skills**: None required
  - **Skills Evaluated but Omitted**:
    - None needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (sequential)
  - **Blocks**: Task 4 (deploy needs built worker.js)
  - **Blocked By**: Task 1 (HTML changes must be complete)

  **References**:

  **Pattern References**:
  - `apps/portfolio/generate-worker.js` - Build script (do not modify, just run)
  - `apps/portfolio/worker.js` - Output artifact (verify content)

  **Documentation References**:
  - `apps/portfolio/AGENTS.md` - "NEVER modify worker.js; changes vanish on build"

  **WHY Each Reference Matters**:
  - generate-worker.js: Understanding that this reads index.html and generates worker.js
  - worker.js: Must verify the embedded HTML contains og-image.webp after build

  **Acceptance Criteria**:

  **Automated Verification** (using Bash):
  ```bash
  # Agent runs:
  cd /home/jclee/dev/resume && npm run build
  # Assert: Exit code 0

  # Verify og-image.webp is embedded:
  grep -o 'og-image\.webp' apps/portfolio/worker.js | head -3
  # Assert: Returns matches (webp reference embedded)

  # Verify SearchAction is embedded:
  grep -o 'SearchAction' apps/portfolio/worker.js
  # Assert: Returns match
  ```

  **Evidence to Capture**:
  - [ ] npm run build exit code 0
  - [ ] grep output showing og-image.webp in worker.js
  - [ ] grep output showing SearchAction in worker.js

  **Commit**: NO (worker.js is gitignored or will be deployed directly)
  - Files: None to commit (artifact only)

---

- [ ] 4. Deploy to Cloudflare and Purge Cache

  **What to do**:
  - Run `npm run deploy` from project root
  - Verify deployment succeeded
  - Purge Cloudflare cache if applicable (via wrangler or API)
  - Run health check against production

  **Must NOT do**:
  - Do NOT modify wrangler.toml
  - Do NOT change Cloudflare configuration
  - Do NOT add new routes or endpoints

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Deployment command execution with verification
  - **Skills**: None required
  - **Skills Evaluated but Omitted**:
    - None needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (sequential)
  - **Blocks**: Task 5 (snapshots need production to be updated)
  - **Blocked By**: Task 3 (deploy needs built worker.js)

  **References**:

  **Pattern References**:
  - `apps/portfolio/wrangler.toml` - Deployment configuration (do not modify)

  **Documentation References**:
  - `README.md` - Deploy commands and health check endpoints

  **WHY Each Reference Matters**:
  - wrangler.toml: Deploy target configuration
  - README.md: Health check URL format

  **Acceptance Criteria**:

  **Automated Verification** (using Bash curl):
  ```bash
  # Agent runs:
  cd /home/jclee/dev/resume && npm run deploy
  # Assert: Exit code 0, output shows "Published"

  # Health check:
  curl -s https://resume.jclee.me/health | jq -r '.status'
  # Assert: Returns "healthy"

  # Verify og:image meta tag on production:
  curl -s https://resume.jclee.me/ | grep -o 'og:image.*og-image\.webp'
  # Assert: Returns match (webp in production HTML)

  # Verify SearchAction in production:
  curl -s https://resume.jclee.me/ | grep -o 'SearchAction'
  # Assert: Returns match
  ```

  **Evidence to Capture**:
  - [ ] npm run deploy output showing "Published"
  - [ ] Health check response showing "healthy"
  - [ ] curl output confirming og-image.webp in production
  - [ ] curl output confirming SearchAction in production

  **Commit**: NO (deployment only)

---

- [ ] 5. Update Visual Regression Snapshots

  **What to do**:
  - Run Playwright with --update-snapshots flag against production
  - Bulk update all 12 stale baselines
  - Commit updated snapshot files

  **Must NOT do**:
  - Do NOT review each diff individually (user approved bulk update)
  - Do NOT modify visual.spec.js test code
  - Do NOT change maxDiffPixelRatio threshold

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single command with file commits
  - **Skills**: [`playwright`]
    - `playwright`: Understanding snapshot update workflow
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not a design task

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (sequential)
  - **Blocks**: Task 6 (verification needs updated snapshots)
  - **Blocked By**: Task 4 (production must be updated first)

  **References**:

  **Pattern References**:
  - `tests/e2e/visual.spec.js` - Visual test definitions (do not modify)
  - `tests/e2e/visual.spec.js-snapshots/` - Snapshot storage directory

  **Documentation References**:
  - `tests/AGENTS.md` - "Snapshot tolerance maxDiffPixelRatio: 0.05"
  - `playwright.config.js` - Test configuration

  **WHY Each Reference Matters**:
  - visual.spec.js: Shows which screenshots are taken (desktop-homepage.png, mobile-homepage.png, etc.)
  - Snapshots directory: Where updated baselines will be written

  **Acceptance Criteria**:

  **Automated Verification** (using Bash):
  ```bash
  # Agent runs:
  cd /home/jclee/dev/resume
  npx playwright test visual.spec.js --update-snapshots
  # Assert: Exit code 0, output shows snapshots updated

  # Verify snapshots were modified:
  git status --porcelain tests/e2e/visual.spec.js-snapshots/
  # Assert: Shows modified .png files
  ```

  **Evidence to Capture**:
  - [ ] Playwright output showing snapshot updates
  - [ ] git status showing modified snapshot files

  **Commit**: YES
  - Message: `test(visual): update regression baselines for portfolio content changes`
  - Files: `tests/e2e/visual.spec.js-snapshots/*.png`
  - Pre-commit: None

---

- [ ] 6. Verify All E2E Tests Pass

  **What to do**:
  - Run full E2E test suite against production
  - Verify all 24 previously failing tests now pass
  - Capture test summary

  **Must NOT do**:
  - Do NOT modify any test files at this stage
  - Do NOT skip failing tests
  - Do NOT proceed if any tests fail

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Test execution and verification
  - **Skills**: [`playwright`]
    - `playwright`: Understanding test output
  - **Skills Evaluated but Omitted**:
    - None needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 5 (final)
  - **Blocks**: None (final task)
  - **Blocked By**: Task 2, Task 5 (all fixes must be in place)

  **References**:

  **Pattern References**:
  - `tests/e2e/mobile.spec.js` - Mobile tests (should pass now)
  - `tests/e2e/seo.spec.js` - SEO tests (should pass now)
  - `tests/e2e/visual.spec.js` - Visual tests (should pass with updated baselines)

  **Documentation References**:
  - `playwright.config.js` - Test configuration
  - `tests/AGENTS.md` - "E2E defaults to production URL"

  **WHY Each Reference Matters**:
  - Test files: These are the files that were failing; verify they pass now
  - playwright.config.js: Confirms production URL is used

  **Acceptance Criteria**:

  **Automated Verification** (using Bash):
  ```bash
  # Agent runs:
  cd /home/jclee/dev/resume
  npm run test:e2e
  # Assert: Exit code 0

  # Verify specific tests pass:
  npm run test:e2e -- --grep "og:image|twitter:image|SearchAction|touch|text sizes" 2>&1 | tail -20
  # Assert: Output shows all tests passed
  ```

  **Evidence to Capture**:
  - [ ] Full test run output showing pass count
  - [ ] Specific grep showing previously failing tests now pass

  **Commit**: NO (verification only)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 + 2 | `fix(e2e): resolve SEO meta tags, JSON-LD schema, and mobile test issues` | `apps/portfolio/index.html`, `tests/e2e/mobile.spec.js` | grep verification |
| 5 | `test(visual): update regression baselines for portfolio content changes` | `tests/e2e/visual.spec.js-snapshots/*.png` | git status |

---

## Success Criteria

### Verification Commands
```bash
# Health check
curl -s https://resume.jclee.me/health | jq .
# Expected: {"status":"healthy",...}

# SEO meta tag verification
curl -s https://resume.jclee.me/ | grep -c 'og-image\.webp'
# Expected: 2 or more matches

# Full E2E suite
npm run test:e2e
# Expected: All tests pass (exit code 0)
```

### Final Checklist
- [ ] All 24 previously failing tests now pass
- [ ] Production site serves og-image.webp in meta tags
- [ ] WebSite JSON-LD includes potentialAction.SearchAction
- [ ] Health endpoint returns healthy
- [ ] Visual snapshots committed to git
- [ ] NO new test failures introduced
