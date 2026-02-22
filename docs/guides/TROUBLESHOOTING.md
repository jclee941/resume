# Troubleshooting Guide

Common issues and solutions for the Resume Portfolio System.

## Table of Contents

1. [Build Issues](#build-issues)
2. [Deployment Issues](#deployment-issues)
3. [Test Failures](#test-failures)
4. [Runtime Issues](#runtime-issues)
5. [Performance Issues](#performance-issues)
6. [Security Issues](#security-issues)

---

## Build Issues

### Issue: HTML Parse Error During Build

**Error Message:**

```
Error: Parse Error: <0.1%</span>
```

**Cause:** HTML contains unescaped `<` characters in data values.

**Solution:**

```bash
# Find problematic values in data.json
grep -n '<' typescript/portfolio-worker/data.json | grep -v 'http'

# Replace < with Korean text or HTML entity
# Before: "error_rate": "<0.1%"
# After:  "error_rate": "0.1% 미만"
```

**Prevention:** Always use text descriptions instead of `<` or `>` symbols in data.json.

---

### Issue: Worker Size Exceeds Limit

**Error Message:**

```
Error: Worker size (1.2MB) exceeds Cloudflare limit (1MB)
```

**Cause:** Too much content embedded in worker.js.

**Solution:**

```bash
# Check current worker size
ls -lh typescript/portfolio-worker/worker.js

# Identify large components
node -e "
const fs = require('fs');
const worker = fs.readFileSync('typescript/portfolio-worker/worker.js', 'utf8');
console.log('Total:', (worker.length / 1024).toFixed(2), 'KB');
"

# Options to reduce size:
# 1. Externalize large assets (images, fonts)
# 2. Minify more aggressively
# 3. Remove unused code
```

**Current Budget:** ~300KB (well under 1MB limit)

---

### Issue: CSP Hash Mismatch

**Error Message (Browser Console):**

```
Refused to execute inline script because it violates CSP
```

**Cause:** CSP hashes don't match actual inline script content.

**Solution:**

```bash
# Rebuild to recalculate hashes
npm run build

# Verify hashes are generated
grep "sha256-" typescript/portfolio-worker/worker.js | head -5

# Deploy with new hashes
npm run deploy:wrangler:root
```

**Root Cause:** The build script was using `.trim()` on script content before hashing, but browsers hash the exact content including whitespace.

**Fix Applied:** Removed `.trim()` from hash calculation (commit f67b5eb).

---

### Issue: Template Literal Escape Errors

**Error Message:**

```
SyntaxError: Unexpected token '`'
```

**Cause:** Backticks or dollar signs in HTML not properly escaped.

**Solution:**

```bash
# Check for unescaped characters
grep -n '`' typescript/portfolio-worker/index.html
grep -n '\$' typescript/portfolio-worker/index.html

# The build script should escape these automatically
# If not, check typescript/portfolio-worker/lib/utils.js escapeTemplateLiterals function
```

---

## Deployment Issues

### Issue: Wrangler Authentication Failed

**Error Message:**

```
Error: Authentication error (code: 10001)
```

**Cause:** Invalid or expired Cloudflare API token.

**Solution:**

```bash
# Option 1: Use REST API deployment (recommended)
npm run deploy:wrangler:root

# Option 2: Re-authenticate Wrangler
wrangler login

# Option 3: Set API token directly
export CLOUDFLARE_API_TOKEN=your_token
npx wrangler deploy --config typescript/portfolio-worker/wrangler.toml --env production
```

**See:** `docs/CLOUDFLARE_TOKEN_SETUP.md` for token configuration.

---

### Issue: Deployment Succeeds but Site Shows Old Content

**Cause:** Forgot to run `npm run build` before deploying.

**Solution:**

```bash
# Rebuild and redeploy
npm run build
npm run deploy:wrangler:root

# Or use the combined command
npm run build && npm run deploy:wrangler:root
```

**Prevention:** Always run `npm run build` after editing source files.

---

### Issue: GitHub Actions Deployment Failed

**Error Message:**

```
Error: Resource not accessible by integration
```

**Cause:** Missing or incorrect GitHub Actions variables.

**Solution:**

1. Go to GitHub repository → Settings → Secrets and variables → Actions
2. Verify these variables exist:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
3. Regenerate tokens if expired

---

## Test Failures

### Issue: E2E Tests Fail After Adding Project

**Error Message:**

```
Expected 11 projects, found 12
```

**Cause:** Test expectations don't match new project count.

**Solution:**

```bash
# Update test expectations
vim tests/e2e/portfolio.spec.js

# Find and update the project count
# const EXPECTED_PROJECTS = 12;  // was 11

npm run test:e2e
```

---

### Issue: Unit Tests Fail with "Cannot log after tests are done"

**Error Message:**

```
Cannot log after tests are done. Did you forget to wait for something async?
```

**Cause:** Console.log statements in production code running after test completion.

**Solution:**

```bash
# Use logger instead of console.log
# Before: console.log('message');
# After:  logger.log('message');

# The logger is silent during tests
# See: typescript/portfolio-worker/logger.js
```

---

### Issue: Playwright Tests Timeout

**Error Message:**

```
Timeout of 30000ms exceeded
```

**Cause:** Dev server not running or slow startup.

**Solution:**

```bash
# Ensure build is complete
npm run build

# Run with longer timeout
npm run test:e2e -- --timeout=60000

# Or start dev server manually first
npm run dev &
npm run test:e2e
```

---

### Issue: Visual Regression Tests Fail

**Error Message:**

```
Screenshot comparison failed: 5% difference
```

**Cause:** Intentional UI changes or rendering differences.

**Solution:**

```bash
# Update baseline screenshots
npm run test:e2e -- --update-snapshots

# Review changes
git diff tests/e2e/visual.spec.js-snapshots/

# Commit if changes are intentional
git add tests/e2e/visual.spec.js-snapshots/
git commit -m "test: update visual snapshots"
```

---

## Runtime Issues

### Issue: Health Endpoint Returns 500

**Error Message:**

```json
{ "status": "error", "message": "Internal server error" }
```

**Cause:** Worker runtime error.

**Solution:**

```bash
# Check Cloudflare dashboard for error logs
# Dashboard → Workers → resume → Logs

# Common causes:
# 1. Missing environment variables
# 2. Invalid JSON in embedded data
# 3. Unhandled exceptions

# Test locally first
npm run dev
curl http://localhost:8787/health
```

---

### Issue: Metrics Endpoint Returns Empty

**Error Message:**

```
# No metrics returned
```

**Cause:** Metrics not initialized or worker just deployed.

**Solution:**

```bash
# Metrics accumulate over time
# Wait for some traffic, then check again
curl https://resume.jclee.me/metrics

# If still empty, check worker logs
wrangler tail
```

---

### Issue: PDF Downloads Return 404

**Error Message:**

```
404 Not Found
```

**Cause:** PDF files not in expected location or path mismatch.

**Solution:**

```bash
# Check PDF file exists
ls -la typescript/portfolio-worker/downloads/*.pdf

# Verify data.json paths
grep "pdfUrl" typescript/portfolio-worker/data.json

# Ensure paths match actual file locations
```

---

## Performance Issues

### Issue: Slow Page Load (LCP > 2.5s)

**Cause:** Large resources blocking render.

**Solution:**

```bash
# Run Lighthouse audit
npm run lighthouse

# Common fixes:
# 1. Preconnect to font servers
# 2. Lazy load images below fold
# 3. Reduce CSS size
# 4. Optimize images

# Check current performance
curl -w "@curl-format.txt" https://resume.jclee.me
```

---

### Issue: High CLS (Cumulative Layout Shift)

**Cause:** Elements shifting during page load.

**Solution:**

```css
/* Reserve space for images */
img {
  width: 100%;
  height: auto;
  aspect-ratio: 16/9;
}

/* Reserve space for fonts */
@font-face {
  font-display: swap;
}
```

---

### Issue: Worker Cold Start Delay

**Cause:** Worker evicted from edge cache.

**Solution:**

- This is normal for low-traffic sites
- Cloudflare keeps workers warm based on traffic
- First request after idle may be slower (~50-100ms)
- Subsequent requests are fast (<10ms)

---

## Security Issues

### Issue: CSP Violation in Browser Console

**Error Message:**

```
Refused to load script from 'https://example.com'
```

**Cause:** External resource not in CSP whitelist.

**Solution:**

```bash
# Add domain to CSP in typescript/portfolio-worker/lib/security-headers.js
# script-src: add 'https://example.com'
# style-src: add 'https://example.com'

# Rebuild and deploy
npm run build
npm run deploy:wrangler:root
```

---

### Issue: Mixed Content Warning

**Error Message:**

```
Mixed Content: The page was loaded over HTTPS, but requested an insecure resource
```

**Cause:** HTTP resource loaded on HTTPS page.

**Solution:**

```bash
# Find HTTP URLs
grep -r "http://" typescript/portfolio-worker/

# Replace with HTTPS
sed -i 's|http://|https://|g' typescript/portfolio-worker/data.json
```

---

### Issue: CORS Error

**Error Message:**

```
Access to fetch has been blocked by CORS policy
```

**Cause:** Cross-origin request without proper headers.

**Solution:**

```javascript
// Add CORS headers for API endpoints
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
```

---

## Quick Diagnostic Commands

```bash
# Check build status
npm run build && echo "Build OK" || echo "Build FAILED"

# Check test status
npm test && echo "Tests OK" || echo "Tests FAILED"

# Check worker size
ls -lh typescript/portfolio-worker/worker.js

# Check deployment status
curl -I https://resume.jclee.me

# Check health endpoint
curl https://resume.jclee.me/health | jq

# Check metrics
curl https://resume.jclee.me/metrics

# View worker logs (live)
wrangler tail

# Run all checks
npm run build && npm test && npm run test:e2e && echo "All checks passed!"
```

---

## Getting Help

1. **Check existing docs:** `docs/` directory
2. **Search issues:** GitHub Issues
3. **Check logs:** Cloudflare dashboard → Workers → Logs
4. **Local debugging:** `npm run dev` + browser DevTools

---

## Common Error Codes

| Code  | Meaning      | Solution                 |
| ----- | ------------ | ------------------------ |
| 10001 | Auth error   | Re-authenticate Wrangler |
| 10002 | Script error | Check worker.js syntax   |
| 10003 | Size limit   | Reduce worker size       |
| 10004 | CPU limit    | Optimize code            |
| 10005 | Memory limit | Reduce memory usage      |
