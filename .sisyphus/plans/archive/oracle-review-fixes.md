# Oracle Code Review Fixes - Portfolio Worker

## TL;DR

> **Quick Summary**: Fix 7 Oracle code review issues (4 critical, 3 warnings) in the portfolio worker including CSP hash mismatch, exposed job APIs, missing CSP directives, Content-Type bugs, and render-blocking resources.
> 
> **Deliverables**:
> - Fixed CSP with union hashes from both HTML files
> - Job API endpoints removed from portfolio worker
> - Complete CSP with default-src baseline
> - Correct Content-Type headers on JSON responses
> - Non-blocking Sentry scripts
> - Secure robots.txt
> - Single SW registration point
> 
> **Estimated Effort**: Medium (~3-4 hours)
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: T1 (CSP hashes) → T3 (CSP baseline) → T8 (Build/Deploy)

---

## Context

### Original Request
Fix all issues from Oracle code review of resume portfolio (resume.jclee.me). 7 issues identified: 4 Critical (P0), 3 Warning (P1).

### Interview Summary
**Key Discussions**:
- User confirmed: "Portfolio-only scope (job dashboard can be removed entirely)"
- User confirmed: "Must maintain Sentry integration (self-hosted, intentional)"
- User confirmed: "Must maintain Google Analytics"
- Zero runtime I/O architecture constraint

**Research Findings**:
- CSP hashes extracted only from Korean HTML (line 305), not English
- SECURITY_HEADERS has hardcoded Content-Type: text/html causing JSON override bug
- Sentry scripts lack defer attribute at lines 23-27 in both HTMLs
- robots.txt explicitly allows /api/ which should be disallowed
- SW registered twice: inline in HTML and in main.js

---

## Work Objectives

### Core Objective
Remediate all 7 Oracle code review findings to improve security posture, performance, and code quality of the portfolio worker.

### Concrete Deliverables
- `apps/portfolio/generate-worker.js` - CSP hash union + job API removal + Content-Type fix
- `apps/portfolio/lib/security-headers.js` - Complete CSP with baseline directives
- `apps/portfolio/index.html` - Sentry defer + SW registration removal
- `apps/portfolio/index-en.html` - Sentry defer + SW registration removal
- `apps/portfolio/robots.txt` - Disallow /api/

### Definition of Done
- [x] `curl -I https://resume.jclee.me | grep Content-Security-Policy` includes `default-src 'none'`
- [x] `curl -I https://resume.jclee.me/en/ | grep Content-Security-Policy` includes all required hashes
- [x] `curl https://resume.jclee.me/api/stats` returns 404 (endpoint removed)
- [x] `curl https://resume.jclee.me/dashboard` returns 404 (endpoint removed)
- [x] No CSP violations in browser console on either `/` or `/en/`
- [x] Lighthouse Performance score maintains ≥90

### Must Have
- All 7 Oracle findings addressed
- Sentry integration preserved
- Google Analytics integration preserved
- Zero breaking changes to portfolio functionality

### Must NOT Have (Guardrails)
- DO NOT modify job-automation worker (separate codebase)
- DO NOT add new features beyond fixes
- DO NOT change visual appearance
- DO NOT remove Sentry or GA scripts entirely
- DO NOT modify the SSoT data files

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: YES (Jest + Playwright)
- **User wants tests**: Manual-only (config/header fixes don't need unit tests)
- **Framework**: Manual verification via curl, browser DevTools, Lighthouse

### Automated Verification (ALWAYS include)

Each TODO includes executable verification via curl and browser automation.

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── T1: Fix CSP hash extraction (union both HTMLs)
├── T2: Remove job API endpoints from generate-worker.js
├── T5: Add defer to Sentry scripts (both HTMLs)
├── T6: Fix robots.txt Disallow /api/
└── T7: Remove redundant SW registration from HTMLs

Wave 2 (After Wave 1):
├── T3: Add CSP baseline directives (depends on T1 for hash context)
└── T4: Fix Content-Type header spread order (after T2 removes some endpoints)

Wave 3 (After Wave 2):
└── T8: Build, deploy, and verify all fixes
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| T1 | None | T3, T8 | T2, T5, T6, T7 |
| T2 | None | T4, T8 | T1, T5, T6, T7 |
| T3 | T1 | T8 | T4 |
| T4 | T2 | T8 | T3 |
| T5 | None | T8 | T1, T2, T6, T7 |
| T6 | None | T8 | T1, T2, T5, T7 |
| T7 | None | T8 | T1, T2, T5, T6 |
| T8 | T1-T7 | None | None (final) |

---

## TODOs

### Wave 1 (Parallel - Start Immediately)

- [x] 1. Fix CSP Hash Extraction - Union Hashes from Both HTML Files

  **What to do**:
  - In `generate-worker.js`, after minifying both HTML files, extract hashes from BOTH
  - Current: Only extracts from `indexHtml` (Korean)
  - Change line ~305 to extract from both, then merge unique hashes
  - Create helper function `mergeHashes(arr1, arr2)` to deduplicate

  **Must NOT do**:
  - Do NOT extract hashes before minification (whitespace affects hash)
  - Do NOT modify the minification logic itself

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single-file JavaScript modification with clear pattern
  - **Skills**: None needed
    - Basic JS edit, no special tooling required

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T2, T5, T6, T7)
  - **Blocks**: T3, T8
  - **Blocked By**: None

  **References**:
  - `apps/portfolio/generate-worker.js:304-366` - Current hash extraction (line 305: `extractInlineHashes(indexHtml)`)
  - `apps/portfolio/generate-worker.js:316-346` - English HTML processing (no hash extraction)
  - `apps/portfolio/lib/templates.js:extractInlineHashes()` - Hash extraction function

  **WHY Each Reference Matters**:
  - Line 305 shows current single-HTML extraction pattern
  - Lines 316-346 show where English HTML is processed (insert hash extraction here)
  - templates.js contains the `extractInlineHashes` function to understand return format

  **Acceptance Criteria**:

  ```bash
  # Build the worker
  cd /home/jclee/dev/resume/apps/portfolio && node generate-worker.js
  
  # Verify build output shows hashes from both HTMLs
  # Expected: Build log shows "CSP hashes extracted" with combined count
  ```

  **Commit**: YES (groups with T3)
  - Message: `fix(portfolio): extract CSP hashes from both KO and EN HTML files`
  - Files: `apps/portfolio/generate-worker.js`
  - Pre-commit: `node generate-worker.js` (build must succeed)

---

- [x] 2. Remove Job API Endpoints from Portfolio Worker

  **What to do**:
  - Remove `/dashboard` route (lines 646-656)
  - Remove `/api/stats` route (lines 773-835)
  - Remove `/api/status` route (lines 837-847)
  - Remove `/api/applications` route (lines 849-883)
  - Remove `DASHBOARD_HTML` constant embedding (line 395)
  - Remove dashboard HTML file reading at top of file
  - Keep job.jclee.me hostname handling for future flexibility

  **Must NOT do**:
  - Do NOT remove `/health`, `/metrics`, `/api/vitals` endpoints (valid portfolio endpoints)
  - Do NOT remove the entire job.jclee.me hostname block (keeps domain routing clean)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Straightforward code deletion, well-defined line ranges
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1, T5, T6, T7)
  - **Blocks**: T4, T8
  - **Blocked By**: None

  **References**:
  - `apps/portfolio/generate-worker.js:646-656` - /dashboard route
  - `apps/portfolio/generate-worker.js:773-835` - /api/stats route
  - `apps/portfolio/generate-worker.js:837-847` - /api/status route
  - `apps/portfolio/generate-worker.js:849-883` - /api/applications route
  - `apps/portfolio/generate-worker.js:395` - DASHBOARD_HTML embedding
  - `apps/portfolio/generate-worker.js:348-359` - Dashboard HTML processing to remove

  **WHY Each Reference Matters**:
  - Each line range shows exact code block to delete
  - Line 395 shows the DASHBOARD_HTML constant that will be orphaned
  - Lines 348-359 show dashboard HTML loading that becomes unnecessary

  **Acceptance Criteria**:

  ```bash
  # After build and deploy:
  curl -s -o /dev/null -w "%{http_code}" https://resume.jclee.me/dashboard
  # Expected: 404
  
  curl -s -o /dev/null -w "%{http_code}" https://resume.jclee.me/api/stats
  # Expected: 404
  
  curl -s -o /dev/null -w "%{http_code}" https://resume.jclee.me/api/status
  # Expected: 404
  
  curl -s -o /dev/null -w "%{http_code}" https://resume.jclee.me/api/applications
  # Expected: 404
  ```

  **Commit**: YES (standalone)
  - Message: `fix(portfolio): remove job dashboard endpoints from resume.jclee.me`
  - Files: `apps/portfolio/generate-worker.js`
  - Pre-commit: `node generate-worker.js`

---

- [~] 5. Add defer Attribute to Sentry Scripts (CANCELLED - no Sentry in HTML)

  **What to do**:
  - In `index.html` line 23-26: Add `defer` attribute to Sentry CDN script
  - In `index-en.html` line 23-26: Add `defer` attribute to Sentry CDN script
  - The sentry-config.js script at line 27 doesn't need defer (it's small, config-only)

  **Must NOT do**:
  - Do NOT remove Sentry scripts entirely (user requirement: maintain Sentry)
  - Do NOT add defer to sentry-config.js (it must run after bundle loads)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Two simple HTML attribute additions
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1, T2, T6, T7)
  - **Blocks**: T8
  - **Blocked By**: None

  **References**:
  - `apps/portfolio/index.html:23-27` - Korean Sentry scripts
  - `apps/portfolio/index-en.html:23-27` - English Sentry scripts

  **WHY Each Reference Matters**:
  - Exact line numbers where defer must be added
  - Shows current script structure without defer

  **Acceptance Criteria**:

  ```bash
  # Verify defer added in source
  grep -n 'sentry-cdn.com.*defer' apps/portfolio/index.html
  # Expected: Line 23-26 with defer attribute
  
  grep -n 'sentry-cdn.com.*defer' apps/portfolio/index-en.html
  # Expected: Line 23-26 with defer attribute
  ```

  **Commit**: YES (groups with T7)
  - Message: `perf(portfolio): add defer to Sentry scripts for faster initial render`
  - Files: `apps/portfolio/index.html`, `apps/portfolio/index-en.html`
  - Pre-commit: None (HTML syntax check optional)

---

- [x] 6. Fix robots.txt - Disallow /api/

  **What to do**:
  - Change line 52 from `Allow: /api/` to `Disallow: /api/`
  - Keep the User-agent: * on line 51

  **Must NOT do**:
  - Do NOT remove other Allow directives
  - Do NOT change sitemap URL

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single line text change
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1, T2, T5, T7)
  - **Blocks**: T8
  - **Blocked By**: None

  **References**:
  - `apps/portfolio/robots.txt:50-53` - Current Allow: /api/ rule

  **WHY Each Reference Matters**:
  - Shows exact line to modify and surrounding context

  **Acceptance Criteria**:

  ```bash
  grep "Disallow: /api/" apps/portfolio/robots.txt
  # Expected: Disallow: /api/ found
  
  grep "Allow: /api/" apps/portfolio/robots.txt
  # Expected: No matches (removed)
  ```

  **Commit**: YES (standalone - small)
  - Message: `fix(portfolio): disallow /api/ in robots.txt for security`
  - Files: `apps/portfolio/robots.txt`
  - Pre-commit: None

---

- [x] 7. Remove Redundant SW Registration from HTML Files

  **What to do**:
  - Remove inline SW registration script from `index.html` lines 270-278
  - Remove inline SW registration script from `index-en.html` lines 278-286
  - Keep the registration in `main.js` (more sophisticated with update checking)

  **Must NOT do**:
  - Do NOT remove the `<script src="/main.js" defer>` tag (that stays)
  - Do NOT modify main.js SW registration

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple script block removal from two files
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1, T2, T5, T6)
  - **Blocks**: T8
  - **Blocked By**: None

  **References**:
  - `apps/portfolio/index.html:270-278` - Inline SW registration to remove
  - `apps/portfolio/index-en.html:278-286` - Inline SW registration to remove
  - `apps/portfolio/src/scripts/main.js:11-37` - SW registration to keep (reference only)

  **WHY Each Reference Matters**:
  - Lines 270-278 and 278-286 are the exact blocks to delete
  - main.js reference shows the kept registration (no changes needed there)

  **Acceptance Criteria**:

  ```bash
  # Verify inline SW removed from HTMLs
  grep -c "serviceWorker.register" apps/portfolio/index.html
  # Expected: 0 (removed)
  
  grep -c "serviceWorker.register" apps/portfolio/index-en.html
  # Expected: 0 (removed)
  
  # Verify main.js still has it
  grep -c "serviceWorker.register" apps/portfolio/src/scripts/main.js
  # Expected: 1 (kept)
  ```

  **Commit**: YES (groups with T5)
  - Message: `refactor(portfolio): remove redundant inline SW registration`
  - Files: `apps/portfolio/index.html`, `apps/portfolio/index-en.html`
  - Pre-commit: None

---

### Wave 2 (After Wave 1 Completes)

- [x] 3. Add CSP Baseline Directives to security-headers.js

  **What to do**:
  - Add `default-src 'none'` as first directive (deny-all baseline)
  - Add `img-src 'self' data:` (for inline images and data URIs)
  - Add `font-src 'self'` (for local fonts)
  - Add `manifest-src 'self'` (for manifest.json)
  - Add `worker-src 'self'` (for service worker)
  - Reorder CSP string to start with default-src

  **Must NOT do**:
  - Do NOT remove Sentry domains from script-src/connect-src (user requirement)
  - Do NOT remove GA/Cloudflare domains
  - Do NOT change HSTS or other security headers

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single file, well-defined additions to existing function
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T4)
  - **Blocks**: T8
  - **Blocked By**: T1 (needs hash extraction complete first)

  **References**:
  - `apps/portfolio/lib/security-headers.js:36-54` - generateSecurityHeaders function
  - `apps/portfolio/lib/security-headers.js:44` - Current CSP string construction

  **WHY Each Reference Matters**:
  - Lines 36-54 show the entire function to modify
  - Line 44 shows current CSP string format to extend

  **Acceptance Criteria**:

  ```bash
  # Verify new directives in source
  grep "default-src 'none'" apps/portfolio/lib/security-headers.js
  # Expected: Found
  
  grep "img-src 'self' data:" apps/portfolio/lib/security-headers.js
  # Expected: Found
  
  grep "font-src 'self'" apps/portfolio/lib/security-headers.js
  # Expected: Found
  
  grep "manifest-src 'self'" apps/portfolio/lib/security-headers.js
  # Expected: Found
  
  grep "worker-src 'self'" apps/portfolio/lib/security-headers.js
  # Expected: Found
  ```

  **Commit**: YES (groups with T1)
  - Message: `fix(portfolio): add complete CSP baseline with default-src 'none'`
  - Files: `apps/portfolio/lib/security-headers.js`
  - Pre-commit: `node generate-worker.js`

---

- [x] 4. Fix Content-Type Header Spread Order

  **What to do**:
  - Change pattern from `{ 'Content-Type': 'application/json', ...SECURITY_HEADERS }` 
  - To: `{ ...SECURITY_HEADERS, 'Content-Type': 'application/json' }`
  - Apply to all remaining JSON responses after T2 removes job endpoints
  - Affected: Rate limit 429 response (line 583-586)
  
  Note: After T2 removes job endpoints, fewer locations need fixing.

  **Must NOT do**:
  - Do NOT change responses that should be text/html
  - Do NOT modify SECURITY_HEADERS default Content-Type (it's correct for HTML)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple pattern replacement in one file
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T3)
  - **Blocks**: T8
  - **Blocked By**: T2 (wait for job endpoint removal to avoid conflicts)

  **References**:
  - `apps/portfolio/generate-worker.js:583-586` - Rate limit 429 response
  - Pattern: Any `{ 'Content-Type': 'application/json', ...SECURITY_HEADERS }`

  **WHY Each Reference Matters**:
  - Line 583-586 shows the specific pattern to fix
  - After T2, only the rate limit response remains

  **Acceptance Criteria**:

  ```bash
  # After build and deploy, trigger rate limit and check Content-Type
  # (Manual test - requires hitting rate limit)
  
  # Verify source pattern is fixed
  grep -n "SECURITY_HEADERS, 'Content-Type': 'application/json'" apps/portfolio/generate-worker.js
  # Expected: Found (new correct pattern)
  
  grep -n "'Content-Type': 'application/json', ...SECURITY_HEADERS" apps/portfolio/generate-worker.js
  # Expected: Not found (old wrong pattern removed)
  ```

  **Commit**: YES (standalone)
  - Message: `fix(portfolio): correct Content-Type header spread order for JSON responses`
  - Files: `apps/portfolio/generate-worker.js`
  - Pre-commit: `node generate-worker.js`

---

### Wave 3 (Final - After All Fixes)

- [x] 8. Build, Deploy, and Verify All Fixes

  **What to do**:
  - Run `node generate-worker.js` to rebuild worker.js
  - Deploy with `wrangler deploy --env production`
  - Verify all 7 fixes in production

  **Must NOT do**:
  - Do NOT deploy without running all verification checks
  - Do NOT skip the CSP browser console check

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Standard build/deploy workflow
  - **Skills**: [`playwright`] (for browser verification)
    - `playwright`: Needed to check browser console for CSP violations

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (sequential final)
  - **Blocks**: None (final task)
  - **Blocked By**: T1, T2, T3, T4, T5, T6, T7

  **References**:
  - `apps/portfolio/wrangler.toml` - Deployment config
  - `apps/portfolio/generate-worker.js` - Build script

  **WHY Each Reference Matters**:
  - wrangler.toml contains deployment environment settings
  - generate-worker.js is the build entry point

  **Acceptance Criteria**:

  **Build Verification:**
  ```bash
  cd /home/jclee/dev/resume/apps/portfolio
  node generate-worker.js
  # Expected: Build completes successfully
  # Expected: worker.js generated
  ```

  **Deployment:**
  ```bash
  source /home/jclee/.env
  CLOUDFLARE_API_KEY="$CLOUDFLARE_API_KEY" CLOUDFLARE_EMAIL="$CLOUDFLARE_EMAIL" \
    npx wrangler deploy --env production
  # Expected: Deployment successful
  ```

  **CSP Verification:**
  ```bash
  curl -sI https://resume.jclee.me | grep -i content-security-policy
  # Expected: Contains default-src 'none', img-src, font-src, manifest-src, worker-src
  
  curl -sI https://resume.jclee.me/en/ | grep -i content-security-policy
  # Expected: Same complete CSP, no missing hashes
  ```

  **Job API Removal Verification:**
  ```bash
  curl -s -o /dev/null -w "%{http_code}" https://resume.jclee.me/dashboard
  # Expected: 404
  
  curl -s -o /dev/null -w "%{http_code}" https://resume.jclee.me/api/stats
  # Expected: 404
  ```

  **Robots.txt Verification:**
  ```bash
  curl -s https://resume.jclee.me/robots.txt | grep "api"
  # Expected: Disallow: /api/
  ```

  **Browser Console Verification (via Playwright):**
  ```
  # Agent navigates to https://resume.jclee.me
  # Check browser console for CSP violations
  # Expected: No CSP errors
  
  # Agent navigates to https://resume.jclee.me/en/
  # Check browser console for CSP violations
  # Expected: No CSP errors
  
  # Screenshot: .sisyphus/evidence/oracle-fixes-ko.png
  # Screenshot: .sisyphus/evidence/oracle-fixes-en.png
  ```

  **Lighthouse Quick Check:**
  ```bash
  # Run Lighthouse via CLI or browser
  # Performance score: ≥90
  # Best Practices score: ≥90
  ```

  **Commit**: YES (final)
  - Message: `chore(portfolio): verify Oracle code review fixes deployed`
  - Files: None (verification only)
  - Pre-commit: N/A

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| T1 + T3 | `fix(portfolio): complete CSP with hash union and baseline directives` | generate-worker.js, security-headers.js | Build succeeds |
| T2 | `fix(portfolio): remove job dashboard endpoints from resume.jclee.me` | generate-worker.js | Build succeeds |
| T4 | `fix(portfolio): correct Content-Type header spread order` | generate-worker.js | Build succeeds |
| T5 + T7 | `perf(portfolio): optimize Sentry loading and SW registration` | index.html, index-en.html | Files valid |
| T6 | `fix(portfolio): disallow /api/ in robots.txt` | robots.txt | N/A |
| T8 | (Deploy only, no commit) | N/A | All curl checks pass |

---

## Success Criteria

### Verification Commands
```bash
# CSP Complete
curl -sI https://resume.jclee.me | grep "default-src 'none'"
# Expected: Found

# Job APIs Removed
curl -s -o /dev/null -w "%{http_code}" https://resume.jclee.me/api/stats
# Expected: 404

# Robots Fixed
curl -s https://resume.jclee.me/robots.txt | grep "Disallow: /api/"
# Expected: Found

# Portfolio Still Works
curl -s -o /dev/null -w "%{http_code}" https://resume.jclee.me
# Expected: 200

curl -s -o /dev/null -w "%{http_code}" https://resume.jclee.me/en/
# Expected: 200
```

### Final Checklist
- [x] All 4 Critical (P0) issues resolved
- [x] All 3 Warning (P1) issues resolved
- [x] Sentry integration preserved
- [x] Google Analytics preserved
- [x] No CSP violations in browser console
- [x] Lighthouse Performance ≥90
- [x] Portfolio loads correctly in both languages
