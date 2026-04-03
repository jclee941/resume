# Draft: Oracle Code Review Fixes for Portfolio Worker

## Requirements (confirmed)
- Fix all Oracle code review issues for resume.jclee.me portfolio
- Maintain Sentry integration (self-hosted, intentional)
- Maintain Google Analytics
- Zero runtime I/O architecture (all assets inlined at build)
- Portfolio-only scope (job dashboard can be removed entirely)

## Oracle Review Findings Summary

### 🔴 CRITICAL (P0) - 4 Issues

| # | Issue | Location | Status |
|---|-------|----------|--------|
| 1 | CSP Hash Mismatch: Hashes only from Korean HTML, reused for /en/ | `generate-worker.js:304-366` vs `:632-644` | CONFIRMED |
| 2 | Job API Exposure: /dashboard, /api/stats, /api/status, /api/applications exposed on resume.jclee.me | `generate-worker.js:646-656, 773-783, 837-846, 849-883` | CONFIRMED |
| 3 | CSP Missing default-src: No baseline (missing img-src, font-src, manifest-src, worker-src) | `security-headers.js:36-45` | CONFIRMED |
| 4 | Content-Type Header Bug: JSON responses overwritten to text/html due to spread order | `generate-worker.js:582-586, 831-834, 879-882` | CONFIRMED |

### 🟡 WARNING (P1) - 3 Issues

| # | Issue | Location | Status |
|---|-------|----------|--------|
| 5 | Sentry render-blocking: No defer attribute on Sentry script | `index.html:23-27`, `index-en.html:23-27` | CONFIRMED |
| 6 | robots.txt allows /api/: Should disallow internal endpoints | `robots.txt:50-53` | CONFIRMED |
| 7 | Redundant SW registration: Both inline in HTML and in main.js | `index.html:270-278` + `main.js:11-37` | CONFIRMED |

## Technical Decisions

### Issue 1: CSP Hash Mismatch Fix
- Current: `extractInlineHashes(indexHtml)` only extracts from Korean HTML
- Both HTMLs have identical inline scripts (GA, SW registration)
- Fix: Union hashes from BOTH index.html AND index-en.html
- Alternative: Since scripts are identical, current approach may work BUT if any language-specific inline script exists, it will fail

### Issue 2: Job API Removal Decision
**User stated "job dashboard can be removed entirely"**
Options:
1. Remove all job-related routes from generate-worker.js (/dashboard, /api/stats, /api/status, /api/applications)
2. Add hostname check to only serve on job.jclee.me (already partially done)

### Issue 3: CSP Baseline Fix
Current CSP:
```
script-src 'self' [hashes] [domains]
style-src 'self' [hashes]
style-src-elem 'self' [hashes]
connect-src 'self' sentry.jclee.me cloudflareinsights.com
object-src 'none'
base-uri 'self'
form-action 'self'
frame-ancestors 'none'
upgrade-insecure-requests
```

Missing directives to add:
- `default-src 'none'` (deny-all baseline)
- `img-src 'self' data:` (for inline images/data URIs)
- `font-src 'self'` (for local fonts - no external fonts used)
- `manifest-src 'self'` (for manifest.json)
- `worker-src 'self'` (for service worker)

### Issue 4: Content-Type Bug Pattern
Current (WRONG):
```javascript
headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS }
```
SECURITY_HEADERS has `"Content-Type": "text/html;charset=UTF-8"` which overwrites!

Fix:
```javascript
headers: { ...SECURITY_HEADERS, 'Content-Type': 'application/json' }
```

Affected locations:
- Line 585: Rate limit 429 response
- Line 781: /api/stats response
- Line 833: /api/stats fallback response
- Line 845: /api/status response
- Line 881: /api/applications response

### Issue 5: Sentry defer Attribute
Current:
```html
<script src="https://browser.sentry-cdn.com/8.45.1/bundle.tracing.min.js" crossorigin="anonymous"></script>
```
Fix: Add `defer` attribute

### Issue 6: robots.txt /api/ Rule
Current (line 50-52):
```
User-agent: *
Allow: /api/
```
Fix: Change to `Disallow: /api/`

### Issue 7: Redundant SW Registration
Two locations register SW:
1. Inline in HTML (index.html:270-278, index-en.html:278-286)
2. In main.js:11-37

The main.js version is more sophisticated (includes update checking).
Fix: Remove inline SW registration from HTMLs, keep main.js version.

## Research Findings

### From security-headers.js analysis:
- SECURITY_HEADERS includes hardcoded `"Content-Type": "text/html;charset=UTF-8"`
- This causes the Content-Type bug when spreading SECURITY_HEADERS last
- Sentry domains still in CSP (should remain per user constraint)

### From generate-worker.js analysis:
- CSP hashes extracted at line 305 from `indexHtml` only (Korean)
- English HTML processed at line 316-346 but no hash extraction
- Both HTMLs use same SECURITY_HEADERS (containing Korean-only hashes)

## Open Questions

1. Job API Removal: Remove entirely from generate-worker.js, or add domain-based guards?
2. Sentry: User confirmed "must maintain Sentry integration" - so keep Sentry but add defer?
3. Test strategy: TDD or manual verification?

## Scope Boundaries
- INCLUDE: All 7 Oracle findings
- INCLUDE: Build + deploy + verify
- EXCLUDE: Job automation worker (separate codebase)
- EXCLUDE: New features (pure fix scope)
