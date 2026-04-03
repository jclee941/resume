# Portfolio Console Errors Fix

## TL;DR

> **Quick Summary**: Fix all 6 console errors on resume.jclee.me while keeping GA, Sentry, and Cloudflare Insights analytics fully functional.
> 
> **Deliverables**:
> - Zero console errors on production site
> - All analytics tracking working (GA, Sentry, Cloudflare)
> - Proper favicons rendering
> - English page fully translated
> - WCAG 2.5.5 compliant touch targets
> 
> **Estimated Effort**: Medium (6 parallel edits + build + deploy)
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Wave 1 edits → Build → Deploy/Verify

---

## Context

### Original Request
Fix ALL console errors on https://resume.jclee.me while keeping Google Analytics, Sentry, and Cloudflare Insights analytics active. User provided detailed findings from explore agents identifying 6 specific issues with file paths and line numbers.

### Interview Summary
**Key Discussions**:
- User wants to KEEP all analytics (GA, Sentry, Cloudflare Insights)
- User confirmed favicon generation approach (copy svg, resize png)
- User confirmed English name format: "Jaecheol Lee"
- User wants Playwright browser automation for verification

**Research Findings**:
- Verified Sentry SRI hash via `curl | openssl dgst -sha384`: `r87PtLtqCNRN7WVYDoF6b24tH5mzHdp5/yxH2SOeuEBA43ZA0bIBOAhNjDaEveGK`
- Existing icon files: `icon-192.svg`, `icon-192.png`, `icon-512.svg`, `icon-512.png`
- CSP defined in `lib/security-headers.js` line 37
- Touch target CSS partially exists - missing selectors identified

### Self-Review (Metis unavailable)
**Identified Gaps** (addressed):
- Need to verify index.html ALSO has same Sentry SRI hash issue → Confirmed both files have same lines
- Need to ensure favicon generation doesn't break build → Using ImageMagick resize which is standard
- CSP needs BOTH script-src AND connect-src for GA → Current structure handles this
- index-en.html og:url should point to /en/ not root → Added to translation scope

---

## Work Objectives

### Core Objective
Achieve ZERO console errors on https://resume.jclee.me with all analytics (GA, Sentry, Cloudflare Insights) functioning correctly.

### Concrete Deliverables
- `lib/security-headers.js` with GA domain in CSP
- `index.html` and `index-en.html` with correct Sentry SRI hash
- `sentry-config.js` with fixed regex syntax
- `favicon.svg`, `favicon-32x32.png`, `apple-touch-icon.png` generated
- `index-en.html` with full English SEO metadata
- CSS files with WCAG 2.5.5 compliant touch targets
- `worker.js` rebuilt with all changes
- Production deployment verified via Playwright

### Definition of Done
- [ ] `curl -s https://resume.jclee.me | grep -c "error"` returns 0 console errors
- [ ] GA tracking visible in Network tab (requests to googletagmanager.com succeed)
- [ ] Sentry initialized without integrity/syntax errors
- [ ] All favicon assets return 200 status
- [ ] Touch targets measure ≥44px on mobile viewport

### Must Have
- CSP allows googletagmanager.com
- Correct Sentry SRI hash
- Valid regex in sentry-config.js
- All referenced favicon assets exist
- English page has English metadata
- Touch targets meet WCAG 2.5.5

### Must NOT Have (Guardrails)
- NO new analytics platforms added
- NO design/layout changes beyond touch target sizing
- NO content changes beyond SEO translations
- NO changes to main page (index.html) content
- NO removal of any existing functionality

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: NO (no formal test setup in portfolio-worker)
- **User wants tests**: Manual verification via Playwright
- **Framework**: Playwright MCP browser automation
- **QA approach**: Automated browser verification

### Verification Approach

Each task includes agent-executable verification. Final verification (Task 8) uses Playwright for comprehensive browser testing:

**Browser Automation Checks:**
1. Navigate to https://resume.jclee.me
2. Open DevTools Console → Assert: 0 errors
3. Check Network tab → Assert: GA requests succeed (200)
4. Check Network tab → Assert: Sentry bundle loads (200)
5. Check Network tab → Assert: favicon.svg loads (200)
6. Navigate to https://resume.jclee.me/en/
7. Assert: Page title is "Jaecheol Lee - AIOps / ML Platform Engineer"
8. Mobile viewport → Assert: Touch targets ≥44px

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately - All Independent):
├── Task 1: CSP fix (security-headers.js)
├── Task 2: Sentry SRI hash fix (index.html + index-en.html)
├── Task 3: Sentry regex fix (sentry-config.js)
├── Task 4: Generate favicon assets (ImageMagick)
├── Task 5: English page SEO (index-en.html)
└── Task 6: Touch targets CSS fix

Wave 2 (After Wave 1):
└── Task 7: Build worker.js

Wave 3 (After Wave 2):
└── Task 8: Deploy and Verify (Playwright)

Critical Path: Wave 1 → Task 7 → Task 8
Parallel Speedup: ~50% faster than sequential
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 7 | 2, 3, 4, 5, 6 |
| 2 | None | 7 | 1, 3, 4, 5, 6 |
| 3 | None | 7 | 1, 2, 4, 5, 6 |
| 4 | None | 7 | 1, 2, 3, 5, 6 |
| 5 | None | 7 | 1, 2, 3, 4, 6 |
| 6 | None | 7 | 1, 2, 3, 4, 5 |
| 7 | 1, 2, 3, 4, 5, 6 | 8 | None |
| 8 | 7 | None | None (final) |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Dispatch |
|------|-------|---------------------|
| 1 | 1, 2, 3, 4, 5, 6 | 6x delegate_task(category="quick", run_in_background=true) |
| 2 | 7 | Single delegate_task after Wave 1 completes |
| 3 | 8 | delegate_task(load_skills=["playwright"]) |

---

## TODOs

- [ ] 1. Fix CSP to Allow Google Analytics

  **What to do**:
  - Edit `lib/security-headers.js` line 37
  - Add `https://www.googletagmanager.com` to script-src
  - Current: `script-src 'self' ${scriptHashes.join(' ')} ${CLOUDFLARE_SCRIPT_HASHES.join(' ')} https://browser.sentry-cdn.com ${CLOUDFLARE_ANALYTICS.script}`
  - After: `script-src 'self' ${scriptHashes.join(' ')} ${CLOUDFLARE_SCRIPT_HASHES.join(' ')} https://browser.sentry-cdn.com ${CLOUDFLARE_ANALYTICS.script} https://www.googletagmanager.com`

  **Must NOT do**:
  - Do NOT add unsafe-inline or unsafe-eval
  - Do NOT modify other CSP directives

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single-line edit with clear before/after
  - **Skills**: None required
    - Task is trivial string concatenation

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4, 5, 6)
  - **Blocks**: Task 7 (build)
  - **Blocked By**: None

  **References**:
  - `apps/portfolio/lib/security-headers.js:37` - Target line for CSP script-src
  - `apps/portfolio/lib/AGENTS.md` - CSP update guidance ("Add SHA hashes or external domains here")

  **Acceptance Criteria**:
  ```bash
  # Agent runs:
  grep -c "googletagmanager.com" apps/portfolio/lib/security-headers.js
  # Assert: Returns 1 (domain now present)
  ```

  **Commit**: YES (group with all Wave 1)
  - Message: `fix(csp): add googletagmanager.com to script-src`
  - Files: `apps/portfolio/lib/security-headers.js`

---

- [ ] 2. Fix Sentry SRI Hash in Both HTML Files

  **What to do**:
  - Edit `index.html` lines 261-264
  - Edit `index-en.html` same location
  - Replace: `sha384-+ZoRJkxRPyMzrP6hUpcabGSJJ9Zar1rxfBLFpMegGnKaEC2Djg6bYmmdi9ff2VsV`
  - With: `sha384-r87PtLtqCNRN7WVYDoF6b24tH5mzHdp5/yxH2SOeuEBA43ZA0bIBOAhNjDaEveGK`

  **Must NOT do**:
  - Do NOT change Sentry version (keep 7.109.0)
  - Do NOT remove crossorigin attribute

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: String replacement in two files
  - **Skills**: None required

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4, 5, 6)
  - **Blocks**: Task 7 (build)
  - **Blocked By**: None

  **References**:
  - `apps/portfolio/index.html:261-264` - Sentry script tag with incorrect hash
  - `apps/portfolio/index-en.html` - Same structure, same fix needed
  - Verified hash via: `curl -s https://browser.sentry-cdn.com/7.109.0/bundle.min.js | openssl dgst -sha384 -binary | openssl base64`

  **Acceptance Criteria**:
  ```bash
  # Agent runs:
  grep -c "r87PtLtqCNRN7WVYDoF6b24tH5mzHdp5" apps/portfolio/index.html
  # Assert: Returns 1
  
  grep -c "r87PtLtqCNRN7WVYDoF6b24tH5mzHdp5" apps/portfolio/index-en.html
  # Assert: Returns 1
  ```

  **Commit**: YES (group with Wave 1)
  - Message: `fix(sentry): correct SRI hash for bundle.min.js`
  - Files: `apps/portfolio/index.html`, `apps/portfolio/index-en.html`

---

- [ ] 3. Fix Sentry Regex Syntax Error

  **What to do**:
  - Edit `sentry-config.js` line 58
  - Current: `/extensions//i` (invalid - double slash)
  - After: `/extensions\//i` (escaped slash)

  **Must NOT do**:
  - Do NOT modify other denyUrls entries
  - Do NOT change Sentry configuration options

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single character fix (add backslash)
  - **Skills**: None required

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4, 5, 6)
  - **Blocks**: Task 7 (build)
  - **Blocked By**: None

  **References**:
  - `apps/portfolio/sentry-config.js:58` - Invalid regex in denyUrls array
  - JavaScript regex escape rules: forward slash in regex literal requires backslash escape

  **Acceptance Criteria**:
  ```bash
  # Agent runs:
  grep -c "extensions\\\\/" apps/portfolio/sentry-config.js
  # Assert: Returns 1 (escaped slash present)
  
  # Verify no double slash:
  grep -c "extensions//" apps/portfolio/sentry-config.js
  # Assert: Returns 0 (invalid pattern removed)
  ```

  **Commit**: YES (group with Wave 1)
  - Message: `fix(sentry): escape forward slash in denyUrls regex`
  - Files: `apps/portfolio/sentry-config.js`

---

- [ ] 4. Generate Missing Favicon Assets

  **What to do**:
  - Copy `icon-192.svg` → `favicon.svg` (direct copy, SVG is scalable)
  - Resize `icon-192.png` → `favicon-32x32.png` (32x32)
  - Resize `icon-192.png` → `apple-touch-icon.png` (180x180)
  - Use ImageMagick: `convert icon-192.png -resize 32x32 favicon-32x32.png`
  - Use ImageMagick: `convert icon-192.png -resize 180x180 apple-touch-icon.png`

  **Must NOT do**:
  - Do NOT modify the original icon-192 files
  - Do NOT change icon design/colors

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple file operations with ImageMagick
  - **Skills**: None required
    - ImageMagick is standard CLI tool

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 5, 6)
  - **Blocks**: Task 7 (build)
  - **Blocked By**: None

  **References**:
  - `apps/portfolio/icon-192.svg` - Source SVG for favicon.svg
  - `apps/portfolio/icon-192.png` - Source PNG for resizing
  - `apps/portfolio/index.html:136-138` - HTML references requiring these files

  **Acceptance Criteria**:
  ```bash
  # Agent runs:
  ls -la apps/portfolio/favicon.svg
  # Assert: File exists
  
  file apps/portfolio/favicon-32x32.png | grep -c "32 x 32"
  # Assert: Returns 1 (correct dimensions)
  
  file apps/portfolio/apple-touch-icon.png | grep -c "180 x 180"
  # Assert: Returns 1 (correct dimensions)
  ```

  **Commit**: YES (group with Wave 1)
  - Message: `feat(assets): add missing favicon files`
  - Files: `apps/portfolio/favicon.svg`, `apps/portfolio/favicon-32x32.png`, `apps/portfolio/apple-touch-icon.png`

---

- [ ] 5. Fix English Page SEO (Full Translation)

  **What to do**:
  Edit `index-en.html` to translate Korean → English:

  | Line | Current (Korean) | Target (English) |
  |------|------------------|------------------|
  | 6 | `<title>이재철 - AIOps / ML Platform Engineer</title>` | `<title>Jaecheol Lee - AIOps / ML Platform Engineer</title>` |
  | 13 | `자동화, 금융 인프라, 이재철, AIOps 엔지니어` | `automation, financial infrastructure, Jaecheol Lee, AIOps Engineer` |
  | 15 | `이재철 (Jaecheol Lee)` | `Jaecheol Lee` |
  | 35 | `language: "ko"` | `language: "en"` |
  | 39 | `href="https://resume.jclee.me"` | `href="https://resume.jclee.me/en/"` |
  | 50 | `og:url` → root | `og:url` → `/en/` |
  | 51 | `og:title` Korean | `og:title` English |
  | 76 | `twitter:title` Korean | `twitter:title` English |
  | 78-80 | `twitter:description` Korean | Full English translation |
  | 95 | `"name": "이재철"` | `"name": "Jaecheol Lee"` |
  | 98 | `"description"` Korean | English description |
  | 117 | `"name": "(주)아이티센 CTS"` | `"name": "ITCEN CTS Co., Ltd."` |
  | 127 | `"name": "이재철 이력서"` | `"name": "Jaecheol Lee Resume"` |
  | 129-130 | Korean description + `ko-KR` | English + `en-US` |

  **Must NOT do**:
  - Do NOT change page structure or layout
  - Do NOT modify hreflang tags (already correct)
  - Do NOT translate technical terms (AIOps, ML Platform, etc.)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Text replacement task with clear mappings
  - **Skills**: None required
    - Simple find/replace operations

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 4, 6)
  - **Blocks**: Task 7 (build)
  - **Blocked By**: None

  **References**:
  - `apps/portfolio/index-en.html` - Full file for editing
  - `apps/portfolio/index.html` - Korean reference (keep consistent structure)

  **Acceptance Criteria**:
  ```bash
  # Agent runs:
  grep -c "이재철" apps/portfolio/index-en.html
  # Assert: Returns 0 (no Korean name in English page)
  
  grep -c 'language: "en"' apps/portfolio/index-en.html
  # Assert: Returns 1 (GA language correct)
  
  grep -c 'canonical.*\/en\/' apps/portfolio/index-en.html
  # Assert: Returns 1 (canonical points to /en/)
  ```

  **Commit**: YES (group with Wave 1)
  - Message: `fix(seo): translate English page metadata to English`
  - Files: `apps/portfolio/index-en.html`

---

- [ ] 6. Fix Touch Targets (WCAG 2.5.5 Compliance)

  **What to do**:
  - Edit `src/styles/layout.css` to add touch target sizing for `.nav-logo`
  - Edit `src/styles/components.css` to add touch target sizing for:
    - `.hero-link`
    - `.project-link-title`
    - `.back-to-top`
  
  **CSS to add**:
  ```css
  /* In layout.css after .nav-logo definition (line ~24): */
  .nav-logo {
    /* ... existing styles ... */
    min-height: 44px;
    display: inline-flex;
    align-items: center;
  }
  
  /* In components.css, add to existing selectors or create new rule: */
  .hero-link,
  .project-link-title,
  .back-to-top {
    min-height: 44px;
    min-width: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  ```

  **Must NOT do**:
  - Do NOT change colors, fonts, or visual appearance
  - Do NOT add padding that breaks existing layout
  - Do NOT modify existing touch target rules (some already exist)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: CSS additions with clear specifications
  - **Skills**: None required

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 4, 5)
  - **Blocks**: Task 7 (build)
  - **Blocked By**: None

  **References**:
  - `apps/portfolio/src/styles/layout.css:24` - `.nav-logo` definition
  - `apps/portfolio/src/styles/components.css:26` - `.hero-link` definition
  - `apps/portfolio/src/styles/components.css:111` - `.project-link-title` definition
  - `apps/portfolio/src/styles/components.css:190-197` - Existing WCAG touch target rules to follow

  **Acceptance Criteria**:
  ```bash
  # Agent runs:
  grep -A5 ".nav-logo" apps/portfolio/src/styles/layout.css | grep -c "min-height: 44px"
  # Assert: Returns 1
  
  grep -c "hero-link.*min-height" apps/portfolio/src/styles/components.css
  # Assert: Returns 1 (or grep the rule block)
  ```

  **Commit**: YES (group with Wave 1)
  - Message: `fix(a11y): ensure all interactive elements meet 44px touch target`
  - Files: `apps/portfolio/src/styles/layout.css`, `apps/portfolio/src/styles/components.css`

---

- [ ] 7. Build worker.js

  **What to do**:
  - Run build command from portfolio-worker directory
  - Command: `npm run build` or `node generate-worker.js`
  - This compiles index.html + all assets → worker.js

  **Must NOT do**:
  - Do NOT edit worker.js directly (it's an artifact)
  - Do NOT skip this step (changes won't deploy without it)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single command execution
  - **Skills**: None required

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (sequential after Wave 1)
  - **Blocks**: Task 8 (deploy/verify)
  - **Blocked By**: Tasks 1, 2, 3, 4, 5, 6

  **References**:
  - `apps/portfolio/generate-worker.js` - Build engine
  - `apps/portfolio/AGENTS.md` - Build instructions
  - `apps/portfolio/package.json` - npm scripts

  **Acceptance Criteria**:
  ```bash
  # Agent runs:
  cd apps/portfolio && npm run build
  # Assert: Exit code 0
  
  ls -la apps/portfolio/worker.js
  # Assert: File exists and was recently modified
  
  grep -c "googletagmanager" apps/portfolio/worker.js
  # Assert: Returns 1 (CSP change propagated to build)
  ```

  **Commit**: YES
  - Message: `build: regenerate worker.js with all fixes`
  - Files: `apps/portfolio/worker.js`

---

- [ ] 8. Deploy and Verify with Playwright

  **What to do**:
  1. Deploy to Cloudflare Workers:
     ```bash
     source /home/jclee/.env && cd apps/portfolio && \
     CLOUDFLARE_API_KEY="$CLOUDFLARE_API_KEY" CLOUDFLARE_EMAIL="$CLOUDFLARE_EMAIL" \
     npx wrangler deploy --env production
     ```
  
  2. Verify with Playwright browser automation:
     - Navigate to https://resume.jclee.me
     - Check browser console for errors
     - Check Network tab for GA/Sentry/favicon requests
     - Navigate to /en/ and verify English title
     - Check mobile viewport touch targets

  **Must NOT do**:
  - Do NOT deploy to staging (user wants production)
  - Do NOT skip verification step

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Requires browser automation for verification
  - **Skills**: `["playwright"]`
    - playwright: Browser automation for console/network verification

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (final)
  - **Blocks**: None (final task)
  - **Blocked By**: Task 7

  **References**:
  - `/home/jclee/.env` - Cloudflare credentials
  - `apps/portfolio/wrangler.toml` - Deployment configuration
  - Supermemory: Previous deployment command format

  **Acceptance Criteria**:

  **Deployment Verification:**
  ```bash
  # Agent runs deployment:
  source /home/jclee/.env && cd apps/portfolio && \
  CLOUDFLARE_API_KEY="$CLOUDFLARE_API_KEY" CLOUDFLARE_EMAIL="$CLOUDFLARE_EMAIL" \
  npx wrangler deploy --env production
  # Assert: Exit code 0, deployment URL shown
  ```

  **Playwright Browser Verification:**
  ```
  # Agent executes via playwright browser automation:
  1. Navigate to: https://resume.jclee.me
  2. Wait for: page load complete
  3. Execute: browser_console_messages(level="error")
  4. Assert: 0 error messages returned
  
  5. Execute: browser_network_requests(includeStatic=false)
  6. Assert: Request to googletagmanager.com shows status 200
  7. Assert: Request to browser.sentry-cdn.com shows status 200
  
  8. Navigate to: https://resume.jclee.me/favicon.svg
  9. Assert: HTTP 200 response
  
  10. Navigate to: https://resume.jclee.me/en/
  11. Assert: Page title contains "Jaecheol Lee"
  
  12. Execute: browser_resize(width=375, height=667)  # Mobile viewport
  13. Take screenshot: .sisyphus/evidence/task-8-mobile-verification.png
  ```

  **Evidence to Capture:**
  - [ ] Deployment output log
  - [ ] Console messages screenshot (showing 0 errors)
  - [ ] Network requests showing GA/Sentry success
  - [ ] Mobile viewport screenshot

  **Commit**: NO (verification only)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1-6 (batch) | `fix(portfolio): resolve all console errors` | All Wave 1 files | grep checks |
| 7 | `build: regenerate worker.js` | worker.js | File exists |
| 8 | N/A (deploy only) | N/A | Playwright |

**Alternative:** Single atomic commit after all source changes (Tasks 1-6), then build commit (Task 7).

---

## Success Criteria

### Verification Commands
```bash
# After deployment, these should all pass:
curl -s https://resume.jclee.me/favicon.svg -o /dev/null -w "%{http_code}"  # Expected: 200
curl -s https://resume.jclee.me/favicon-32x32.png -o /dev/null -w "%{http_code}"  # Expected: 200
curl -s https://resume.jclee.me/apple-touch-icon.png -o /dev/null -w "%{http_code}"  # Expected: 200

# English page title check:
curl -s https://resume.jclee.me/en/ | grep -c "Jaecheol Lee"  # Expected: ≥1
```

### Final Checklist
- [ ] Zero console errors in browser DevTools
- [ ] GA tracking calls visible in Network tab (200 status)
- [ ] Sentry initialized (check console for "✅ Sentry initialized")
- [ ] All favicon assets return 200
- [ ] English page has English metadata
- [ ] Touch targets ≥44px on mobile
