# Draft: Oracle Code Review Fixes for Portfolio Worker

## Requirements (confirmed)
- Fix ALL 7 issues identified by Oracle code review
- KEEP Sentry integration (self-hosted at sentry.jclee.me)
- Portfolio-only worker - remove job dashboard endpoints
- Deploy to resume.jclee.me (Cloudflare Workers)

## Oracle Findings Summary

### P0 - CRITICAL (4 issues)

| ID | Issue | Location | Verified |
|----|-------|----------|----------|
| P0-1 | CSP Hash Mismatch - Only Korean HTML hashed | generate-worker.js:304-308 | YES |
| P0-2 | Job API Exposure - /dashboard, /api/stats, /api/applications | generate-worker.js:646-883 | YES |
| P0-3 | CSP Missing default-src | security-headers.js:42-44 | YES |
| P0-4 | Content-Type Header Bug - SECURITY_HEADERS overwrites | Multiple locations | YES |

### P1 - WARNING (3 issues)

| ID | Issue | Location | Verified |
|----|-------|----------|----------|
| P1-1 | Sentry render-blocking (no defer) | index.html:23-27, index-en.html:23-27 | YES |
| P1-2 | robots.txt allows /api/ | robots.txt:50-52 | YES |
| P1-3 | Redundant SW registration | HTML + main.js | YES |

## Technical Analysis

### P0-1: CSP Hash Extraction
```javascript
// CURRENT (line 304-308): Only extracts from indexHtml
const { scriptHashes, styleHashes } = extractInlineHashes(indexHtml);

// FIX: Extract from BOTH, union the arrays
const koHashes = extractInlineHashes(indexHtml);
const enHashes = extractInlineHashes(indexEnHtml);
const scriptHashes = [...new Set([...koHashes.scriptHashes, ...enHashes.scriptHashes])];
const styleHashes = [...new Set([...koHashes.styleHashes, ...enHashes.styleHashes])];
```

### P0-2: Job API Endpoints to Remove
Lines to remove from generate-worker.js (worker code template):
- `/dashboard` route (line 646-656)
- `/api/stats` route (line 773-834)
- `/api/applications` route (line 849-883)
- `DASHBOARD_HTML` constant (line 395)
- dashboard.html file reading (line 181-184)

### P0-3: CSP default-src Fix
Current CSP lacks baseline. Should be:
```
default-src 'none';
script-src 'self' ${hashes} ${external};
style-src 'self' ${hashes};
style-src-elem 'self' ${hashes};
img-src 'self' data:;
font-src 'self' https://fonts.gstatic.com;
connect-src 'self' https://sentry.jclee.me ${cloudflare};
manifest-src 'self';
worker-src 'self';
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
upgrade-insecure-requests
```

### P0-4: Header Spread Order Bug
Problem: `{ 'Content-Type': 'application/json', ...SECURITY_HEADERS }` 
- SECURITY_HEADERS contains `"Content-Type": "text/html;charset=UTF-8"`
- Spread puts it AFTER, so it OVERWRITES json Content-Type

Fix: Spread SECURITY_HEADERS first, then override
```javascript
{ ...SECURITY_HEADERS, 'Content-Type': 'application/json' }
```

### P1-1: Sentry defer
Add `defer` attribute to Sentry SDK script tag in both HTML files.

### P1-2: robots.txt Fix
Change line 50-52 from `Allow: /api/` to:
```
Disallow: /api/
Disallow: /dashboard
```

### P1-3: SW Registration Cleanup
Remove inline script from HTML (lines 270-278). 
Keep main.js version which has better features (update checking, controller change handling).

## Scope Boundaries
- INCLUDE: All 7 Oracle findings
- INCLUDE: Build, deploy, verification
- EXCLUDE: New features
- EXCLUDE: Refactoring beyond fixes
- KEEP: Sentry integration (per user request)

## Test Strategy Decision
- Infrastructure exists: YES (Jest)
- User wants tests: NO (quick fix deployment)
- QA approach: Manual verification via curl + browser

## Files to Modify
1. `apps/portfolio/generate-worker.js` - P0-1, P0-2, P0-4
2. `apps/portfolio/lib/security-headers.js` - P0-3
3. `apps/portfolio/index.html` - P1-1, P1-3
4. `apps/portfolio/index-en.html` - P1-1, P1-3
5. `apps/portfolio/robots.txt` - P1-2
