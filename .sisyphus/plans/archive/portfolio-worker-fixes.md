# Portfolio Worker Critical Fixes

## TL;DR

> **Quick Summary**: Fix runtime JavaScript errors, remove quantified metrics from meta tags, and improve mobile touch target accessibility for resume.jclee.me
> 
> **Deliverables**:
> - Error-free console (no TypeError from missing DOM elements)
> - Meta descriptions without numbers ("8년", "15+")
> - WCAG-compliant touch targets (44px minimum)
> - Correct lang attributes on both Korean and English pages
> 
> **Estimated Effort**: Short (2-3 hours)
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Task 1 → Task 5 (build) → Task 6 (verify)

---

## Context

### Original Request
Fix critical issues identified by Oracle review of https://resume.jclee.me:
1. main.js runtime errors from missing DOM elements
2. lang attribute mismatch (Korean content with lang="en")
3. Quantified metrics in meta/OG descriptions (user hates these)
4. hreflang pointing to /en/ that needs proper meta tags
5. Mobile touch targets too small
6. Skip link language inconsistency

### Interview Summary
**Key Discussions**:
- User explicitly hates quantified metrics ("8년", "15+", percentages)
- Site was intentionally refactored to minimal Brittany Chiang/Lee Robinson style
- Language/theme toggles were removed as part of minimization
- /en/ route exists and serves English HTML

**Research Findings**:
- `i18n.js` lines 3-4: `querySelector('.language-toggle', '.lang-text')` → null
- `theme.js` line 1: `querySelector('.theme-toggle')` → null
- These modules call `.addEventListener()` on null → TypeError
- `i18n.js` line 12 sets `lang` based on `navigator.language`, overriding Korean

### Metis Review
**Identified Gaps** (addressed):
- Skipped (tool unavailable) - proceeding with comprehensive analysis

---

## Work Objectives

### Core Objective
Eliminate JavaScript errors, remove metrics from user-visible text, and ensure WCAG accessibility compliance.

### Concrete Deliverables
- Modified `src/scripts/main.js` (remove unused module imports)
- Modified `index.html` and `index-en.html` (meta tag updates)
- Modified `manifest.json` (remove "8년")
- Modified CSS (touch target sizing)
- Rebuilt `worker.js`

### Definition of Done
- [ ] `npm run build` succeeds without errors
- [ ] Browser console shows no TypeError on page load
- [ ] `curl -s https://resume.jclee.me | grep -o 'og:description.*'` contains no numbers
- [ ] Touch targets measure ≥44px in browser DevTools

### Must Have
- Zero JavaScript console errors
- Zero quantified metrics in meta descriptions
- Skip link matches page language

### Must NOT Have (Guardrails)
- **NO** adding back language toggle
- **NO** adding back theme toggle
- **NO** changing the minimal design aesthetic
- **NO** modifying project/resume content beyond meta descriptions
- **NO** removing /en/ route (it works, just needs fixes)

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: YES (Playwright installed per tests/e2e/)
- **User wants tests**: Playwright browser automation
- **Framework**: Playwright

### Automated Verification (via Playwright skill)

Each critical fix will be verified by agent-executed browser automation:

**Task 1-2 Verification (JS Errors Fixed)**:
```
1. Navigate to: https://resume.jclee.me (after deploy)
2. Open DevTools Console
3. Assert: No "TypeError" or "Cannot read property" messages
4. Assert: No "null" related errors
5. Screenshot: .sisyphus/evidence/task-1-no-console-errors.png
```

**Task 3 Verification (Metrics Removed)**:
```bash
# Agent runs:
curl -s https://resume.jclee.me | grep -oP 'content="[^"]*"' | head -10
# Assert: No output contains "8년", "15+", or digit patterns like "\d+건", "\d+%"
```

**Task 4 Verification (Touch Targets)**:
```
1. Navigate to: https://resume.jclee.me
2. Set viewport: mobile (375x667)
3. For each nav link: measure computed height/width
4. Assert: All interactive elements >= 44px in both dimensions
5. Screenshot: .sisyphus/evidence/task-4-touch-targets.png
```

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Remove unused JS modules from main.js
├── Task 2: Fix Korean page meta descriptions
├── Task 3: Fix English page meta descriptions  
└── Task 4: Add touch target CSS

Wave 2 (After Wave 1):
├── Task 5: Build worker.js
└── Task 6: Deploy and verify

Critical Path: Task 1,2,3,4 → Task 5 → Task 6
Parallel Speedup: ~40% faster than sequential
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 5 | 2, 3, 4 |
| 2 | None | 5 | 1, 3, 4 |
| 3 | None | 5 | 1, 2, 4 |
| 4 | None | 5 | 1, 2, 3 |
| 5 | 1, 2, 3, 4 | 6 | None |
| 6 | 5 | None | None (final) |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1, 2, 3, 4 | `delegate_task(category="quick", run_in_background=true)` × 4 |
| 2 | 5, 6 | Sequential execution after Wave 1 |

---

## TODOs

- [ ] 1. Remove unused JavaScript modules from main.js

  **What to do**:
  - Edit `src/scripts/main.js`:
    - Remove line 1: `import { initLanguage } from './modules/i18n.js';`
    - Remove line 2: `import { initTheme } from './modules/theme.js';`
    - Remove line 10: `initLanguage();`
    - Remove line 11: `initTheme();`
  - Keep: `initUI()`, `initializeABTesting()`, `initWebVitals()`, service worker registration

  **Must NOT do**:
  - Delete the i18n.js or theme.js files (leave them for potential future use)
  - Remove other module imports

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple file edit with clear line changes
  - **Skills**: None needed
    - Reason: Basic text editing, no specialized domain

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4)
  - **Blocks**: Task 5 (build)
  - **Blocked By**: None

  **References**:
  - `apps/portfolio/src/scripts/main.js:1-14` - Current imports and init calls
  - `apps/portfolio/src/scripts/modules/i18n.js:3-4,16` - querySelector calls causing errors
  - `apps/portfolio/src/scripts/modules/theme.js:1,36` - querySelector calls causing errors

  **Acceptance Criteria**:
  
  **Automated Verification (Bash)**:
  ```bash
  # After edit, verify imports removed:
  grep -c "initLanguage\|initTheme" apps/portfolio/src/scripts/main.js
  # Assert: Output is "0"
  
  # Verify other imports still present:
  grep -c "initUI\|initWebVitals\|initializeABTesting" apps/portfolio/src/scripts/main.js
  # Assert: Output is "3"
  ```

  **Commit**: YES (groups with Task 5)
  - Message: `fix(portfolio): remove unused i18n/theme modules causing TypeError`
  - Files: `apps/portfolio/src/scripts/main.js`

---

- [ ] 2. Fix Korean page meta descriptions (remove metrics)

  **What to do**:
  - Edit `index.html`:
    - Line 9 (meta description): Remove "8년" - replace with qualitative description
    - Line 54 (og:description): Remove "15+" - replace with qualitative description
  - Edit `manifest.json`:
    - Line 4: Remove "8년 인프라 경험" - replace with generic description
  
  **Replacement text (no numbers)**:
  - Meta description: `"이재철 - AIOps/ML Platform 엔지니어 | Observability 스택 설계, 자동화, 금융권 인프라"`
  - OG description: `"AIOps/ML Platform 엔지니어 | Observability 스택 설계, AI 에이전트 운영, 금융권 인프라 구축"`
  - Manifest: `"AIOps & Observability 엔지니어 포트폴리오"`

  **Must NOT do**:
  - Change title tags
  - Modify JSON-LD structured data (separate task if needed)
  - Add new metrics

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple text replacement in specific lines
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4)
  - **Blocks**: Task 5 (build)
  - **Blocked By**: None

  **References**:
  - `apps/portfolio/index.html:9` - meta description with "8년"
  - `apps/portfolio/index.html:54` - og:description with "15+"
  - `apps/portfolio/manifest.json:4` - description with "8년"

  **Acceptance Criteria**:
  
  **Automated Verification (Bash)**:
  ```bash
  # Verify no metrics in Korean HTML:
  grep -E "8년|15\+|[0-9]+건|[0-9]+%" apps/portfolio/index.html | wc -l
  # Assert: Output is "0"
  
  # Verify no metrics in manifest:
  grep -E "8년|[0-9]+년" apps/portfolio/manifest.json | wc -l
  # Assert: Output is "0"
  ```

  **Commit**: YES (groups with Task 5)
  - Message: `fix(portfolio): remove quantified metrics from Korean meta tags`
  - Files: `apps/portfolio/index.html`, `apps/portfolio/manifest.json`

---

- [ ] 3. Fix English page meta descriptions and lang attribute

  **What to do**:
  - Edit `index-en.html`:
    - Line 2: Ensure `<html lang="en">` (not "ko")
    - Line 9 (meta description): Remove "8년", use English text
    - Line 54 (og:description): Remove "15+", use English text
  - Verify the page will serve with correct lang attribute
  
  **Replacement text (English, no numbers)**:
  - Meta description: `"Jaecheol Lee - AIOps/ML Platform Engineer | Observability stack design, automation, financial infrastructure"`
  - OG description: `"AIOps/ML Platform Engineer | Observability stack design, AI agent operations, financial infrastructure"`

  **Must NOT do**:
  - Translate body content (out of scope)
  - Change hreflang tags (they're correct)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple text replacement
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4)
  - **Blocks**: Task 5 (build)
  - **Blocked By**: None

  **References**:
  - `apps/portfolio/index-en.html:2` - html lang attribute
  - `apps/portfolio/index-en.html:9` - meta description
  - `apps/portfolio/index-en.html:54` - og:description

  **Acceptance Criteria**:
  
  **Automated Verification (Bash)**:
  ```bash
  # Verify lang="en":
  grep -o 'lang="en"' apps/portfolio/index-en.html | head -1
  # Assert: Output is 'lang="en"'
  
  # Verify no metrics:
  grep -E "8년|15\+|[0-9]+건|[0-9]+%" apps/portfolio/index-en.html | wc -l
  # Assert: Output is "0"
  ```

  **Commit**: YES (groups with Task 5)
  - Message: `fix(portfolio): fix English page lang attribute and remove metrics`
  - Files: `apps/portfolio/index-en.html`

---

- [ ] 4. Add touch target CSS for WCAG compliance

  **What to do**:
  - Find CSS file (likely `src/styles/main.css` or inline in index.html)
  - Add minimum touch target sizing for interactive elements:
  
  ```css
  /* Touch target accessibility - WCAG 2.5.5 Level AAA */
  .nav-links a,
  .skip-link,
  .link-subtle,
  .contact-links a {
    min-height: 44px;
    min-width: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  
  /* Ensure padding doesn't break layout */
  @media (max-width: 768px) {
    .nav-links a {
      padding: 12px 16px;
    }
  }
  ```

  - Fix skip link language on Korean page:
    - `index.html` line 184: Change "Skip to main content" → "본문으로 건너뛰기"

  **Must NOT do**:
  - Change desktop layout
  - Add touch targets to non-interactive elements
  - Remove existing styling

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: CSS changes affecting layout and accessibility
  - **Skills**: [`frontend-ui-ux`]
    - Reason: Accessibility-focused CSS modifications

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3)
  - **Blocks**: Task 5 (build)
  - **Blocked By**: None

  **References**:
  - `apps/portfolio/index.html:184` - Skip link element
  - `apps/portfolio/src/styles/main.css` - Main stylesheet (if exists)
  - WCAG 2.5.5: https://www.w3.org/WAI/WCAG21/Understanding/target-size.html

  **Acceptance Criteria**:
  
  **Automated Verification (Playwright)**:
  ```
  1. Navigate to: http://localhost:8787 (dev server)
  2. Set viewport: 375x667 (mobile)
  3. Query: document.querySelector('.nav-links a')
  4. Get computed style: height, width
  5. Assert: height >= 44 AND width >= 44
  6. Query: document.querySelector('.skip-link').textContent
  7. Assert: Contains "본문" (Korean)
  ```

  **Commit**: YES (groups with Task 5)
  - Message: `fix(portfolio): add WCAG touch targets and Korean skip link`
  - Files: `apps/portfolio/src/styles/main.css`, `apps/portfolio/index.html`

---

- [ ] 5. Build worker.js

  **What to do**:
  - Run build command from portfolio-worker directory:
  ```bash
  cd apps/portfolio && npm run build
  ```
  - Verify build succeeds
  - Verify worker.js is regenerated

  **Must NOT do**:
  - Manually edit worker.js (it's auto-generated)
  - Skip build step

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single command execution
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Wave 2)
  - **Blocks**: Task 6 (deploy/verify)
  - **Blocked By**: Tasks 1, 2, 3, 4

  **References**:
  - `apps/portfolio/generate-worker.js` - Build script
  - `apps/portfolio/package.json` - npm scripts

  **Acceptance Criteria**:
  
  **Automated Verification (Bash)**:
  ```bash
  cd apps/portfolio && npm run build 2>&1
  # Assert: Exit code 0
  # Assert: Output contains "worker.js generated successfully"
  
  # Verify worker.js updated:
  stat -c %Y apps/portfolio/worker.js
  # Assert: Modification time is within last 60 seconds
  ```

  **Commit**: YES
  - Message: `build(portfolio): regenerate worker.js with fixes`
  - Files: `apps/portfolio/worker.js`
  - Pre-commit: None (build already ran)

---

- [ ] 6. Deploy and verify fixes

  **What to do**:
  - Deploy to Cloudflare:
  ```bash
  source /home/jclee/.env && \
  cd apps/portfolio && \
  CLOUDFLARE_API_KEY="$CLOUDFLARE_API_KEY" CLOUDFLARE_EMAIL="$CLOUDFLARE_EMAIL" \
  npx wrangler deploy --env production
  ```
  - Wait for deployment to complete
  - Verify all fixes via browser automation

  **Must NOT do**:
  - Deploy to non-production environment
  - Skip verification step

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Deploy command + verification
  - **Skills**: [`playwright`]
    - Reason: Browser-based verification needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Wave 2, final)
  - **Blocks**: None (final task)
  - **Blocked By**: Task 5

  **References**:
  - `/home/jclee/.env` - Cloudflare credentials
  - `apps/portfolio/wrangler.toml` - Deployment config

  **Acceptance Criteria**:
  
  **Automated Verification (Playwright + Bash)**:
  
  **1. Console Error Check:**
  ```
  1. Navigate to: https://resume.jclee.me
  2. Capture console messages
  3. Assert: No messages containing "TypeError", "Cannot read", or "null"
  4. Screenshot: .sisyphus/evidence/final-console-clean.png
  ```
  
  **2. Meta Tag Verification:**
  ```bash
  curl -s https://resume.jclee.me | grep -oP 'og:description.*?content="[^"]*"'
  # Assert: No output contains digits followed by Korean characters (숫자+년/건/%)
  
  curl -s https://resume.jclee.me/en/ | grep -oP '<html[^>]*lang="[^"]*"'
  # Assert: Output contains 'lang="en"'
  ```
  
  **3. Touch Target Check (Mobile):**
  ```
  1. Navigate to: https://resume.jclee.me
  2. Set viewport: 375x667
  3. Measure: .nav-links a computed height/width
  4. Assert: Both >= 44px
  ```
  
  **4. Skip Link Language:**
  ```
  1. Navigate to: https://resume.jclee.me  
  2. Query: document.querySelector('.skip-link').textContent
  3. Assert: Contains Korean text (not "Skip to main content")
  ```

  **Commit**: NO (deployment, not code change)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1+2+3+4+5 | `fix(portfolio): resolve Oracle review critical issues` | main.js, index.html, index-en.html, manifest.json, styles, worker.js | `npm run build` |

**Note**: Single commit after all fixes + build to maintain atomic change.

---

## Success Criteria

### Verification Commands
```bash
# 1. No console errors (requires browser):
# Use Playwright to navigate and capture console

# 2. No metrics in meta:
curl -s https://resume.jclee.me | grep -E "8년|15\+|[0-9]+건" | wc -l
# Expected: 0

# 3. English page has correct lang:
curl -s https://resume.jclee.me/en/ | grep -o 'lang="en"'
# Expected: lang="en"

# 4. Touch targets (requires browser measurement)
# 5. Skip link Korean (requires browser)
```

### Final Checklist
- [ ] Zero TypeError in console
- [ ] Zero quantified metrics in meta/OG descriptions
- [ ] Korean page: `lang="ko"`, skip link "본문으로 건너뛰기"
- [ ] English page: `lang="en"`
- [ ] Touch targets ≥ 44px on mobile
- [ ] Build succeeds
- [ ] Deployment succeeds
