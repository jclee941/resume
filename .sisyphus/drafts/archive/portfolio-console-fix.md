# Draft: Portfolio Console Errors Fix

## Requirements (confirmed)
- Keep ALL analytics (GA, Sentry, Cloudflare Insights)
- Fix all console errors on https://resume.jclee.me
- User wants ZERO console errors after deployment

## Technical Decisions

### Issue 1: CSP Blocking Google Analytics
- **File:** `lib/security-headers.js:37`
- **Problem:** `script-src` missing `https://www.googletagmanager.com`
- **Fix:** Add GA domain to CSP script-src

### Issue 2: Sentry SRI Hash Incorrect
- **File:** `index.html:261-264` AND `index-en.html` (same lines)
- **Current hash:** `sha384-+ZoRJkxRPyMzrP6hUpcabGSJJ9Zar1rxfBLFpMegGnKaEC2Djg6bYmmdi9ff2VsV`
- **Correct hash (verified):** `sha384-r87PtLtqCNRN7WVYDoF6b24tH5mzHdp5/yxH2SOeuEBA43ZA0bIBOAhNjDaEveGK`
- **Fix:** Replace SRI hash in both HTML files

### Issue 3: Sentry Regex Syntax Error
- **File:** `sentry-config.js:58`
- **Current:** `/extensions//i` (INVALID - double slash)
- **Fix:** Change to `/extensions\//i` (escaped slash)

### Issue 4: Missing Favicon Assets
- **HTML references (index.html + index-en.html lines 136-138):**
  - `/favicon.svg` (MISSING)
  - `/favicon-32x32.png` (MISSING)
  - `/apple-touch-icon.png` (MISSING)
- **Files that EXIST:**
  - `icon-192.png`, `icon-512.png`
  - `icon-192.svg`, `icon-512.svg`
- **Decision:** Create missing assets from existing icons (generate-worker.js handles inlining)

### Issue 5: English Page SEO (index-en.html)
Korean content found in English page:
- Line 6: title `이재철 - AIOps / ML Platform Engineer`
- Line 13: keywords meta with Korean words
- Line 39: canonical points to `/` not `/en/`
- Lines 33-36: GA language set to `"ko"` not `"en"`
- Lines 51, 76: OG/Twitter titles in Korean
- Lines 78-81: Twitter description 100% Korean
- Lines 95-129: JSON-LD structured data with Korean
- **Fix:** Full English translation of all metadata

### Issue 6: Touch Targets (WCAG 2.5.5)
- Current CSS partially covers touch targets
- Missing: `.nav-logo`, `.hero-link`, `.project-link-title`, `.back-to-top`
- **Fix:** Add `min-height: 44px` rules for remaining selectors

## Research Findings

### Verified SRI Hash
```bash
curl -s https://browser.sentry-cdn.com/7.109.0/bundle.min.js | openssl dgst -sha384 -binary | openssl base64
# Output: r87PtLtqCNRN7WVYDoF6b24tH5mzHdp5/yxH2SOeuEBA43ZA0bIBOAhNjDaEveGK
```

### Existing Icon Files
- `/home/jclee/dev/resume/apps/portfolio/icon-192.svg`
- `/home/jclee/dev/resume/apps/portfolio/icon-192.png`
- `/home/jclee/dev/resume/apps/portfolio/icon-512.svg`
- `/home/jclee/dev/resume/apps/portfolio/icon-512.png`

### CSP Configuration
- File: `lib/security-headers.js`
- Currently allows: `sentry-cdn.com`, `cloudflareinsights.com`
- Need to add: `www.googletagmanager.com`

## Open Questions
- None - all issues have clear solutions

## Scope Boundaries
- INCLUDE: All 6 identified issues
- INCLUDE: Both index.html and index-en.html
- EXCLUDE: Any feature additions
- EXCLUDE: Design changes
- EXCLUDE: Content changes beyond SEO translations

## Test Strategy Decision
- **Infrastructure exists**: NO (no formal test setup in portfolio-worker)
- **User wants tests**: Manual verification
- **QA approach**: Manual verification via Playwright skill
  - Check console for errors
  - Verify assets load (favicon, icons)
  - Verify GA tracking calls in Network tab
  - Verify Sentry initialization

## Parallel Execution Analysis

### Wave 1 (No dependencies - can run simultaneously):
- Task 1: CSP fix (security-headers.js)
- Task 2: Sentry SRI hash fix (both HTML files)
- Task 3: Sentry regex fix (sentry-config.js)
- Task 4: Generate favicon assets (from existing icons)
- Task 5: English page SEO fix (index-en.html)
- Task 6: Touch targets CSS fix (components.css + layout.css)

### Wave 2 (After Wave 1):
- Task 7: Build worker.js (requires all code changes)

### Wave 3 (After Wave 2):
- Task 8: Deploy and verify (requires build)

**Speedup:** All source edits parallel → Build → Deploy/Verify
