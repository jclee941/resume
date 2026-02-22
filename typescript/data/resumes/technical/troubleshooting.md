# Troubleshooting Guide

## Common Issues & Solutions

### 🔴 Deployment Issues

#### Issue: Deployed site shows old HTML content

**Symptoms**:

- Changes to `index.html` or `resume.html` not reflected on live site
- Recently updated text/styles not visible

**Cause**: Forgot to run `generate-worker.js` before deployment

**Solution**:

```bash
# ALWAYS run this before deploying
cd typescript/portfolio-worker
node generate-worker.js

# Then deploy
wrangler deploy
```

**Prevention**: Add to `.github/workflows/ci.yml`:

```yaml
- name: Generate Worker
  run: cd typescript/portfolio-worker && node generate-worker.js
```

---

#### Issue: "Worker exceeds 1MB size limit"

**Symptoms**:

```
Error: Script startup exceeded CPU time limit.
```

**Cause**: HTML files too large when embedded in worker.js

**Solution 1 - Minify HTML**:

```bash
npm install -g html-minifier

html-minifier --collapse-whitespace \
  --remove-comments \
  --minify-css true \
  --minify-js true \
  typescript/portfolio-worker/index.html -o typescript/portfolio-worker/index.min.html
```

**Solution 2 - Extract CSS**:

```bash
# Move CSS to separate file (enables caching)
# See: /resume/architecture.md#future-enhancements
```

**Current Status**: HTML ~76KB, well under limit ✅

---

#### Issue: "Wrangler command not found"

**Symptoms**:

```bash
wrangler deploy
# bash: wrangler: command not found
```

**Solution**:

```bash
# Install globally
npm install -g wrangler

# Or use npx
npx wrangler deploy

# Verify installation
wrangler --version
```

---

### 🟡 Build Issues

#### Issue: "Cannot find module 'fs'" in generate-worker.js

**Symptoms**:

```
Error: Cannot find module 'fs'
```

**Cause**: Running in browser environment instead of Node.js

**Solution**:

```bash
# Ensure running with Node.js
node typescript/portfolio-worker/generate-worker.js

# NOT: browser console or Deno
```

---

#### Issue: Template literal syntax errors in worker.js

**Symptoms**:

```
SyntaxError: Unexpected token
```

**Cause**: Backticks (`) or `$` in HTML not properly escaped

**Solution**: Check `generate-worker.js` escaping logic:

```javascript
// Should escape:
.replace(/`/g, '\\`')     // Backticks
.replace(/\$/g, '\\$')    // Dollar signs
```

**Verification**:

```bash
# Search for unescaped backticks
grep -n '`' typescript/portfolio-worker/worker.js | grep -v '\\'
```

---

### 🟢 Content Issues

#### Issue: Korean characters display as "□□□"

**Symptoms**:

- Garbled Korean text
- Unicode characters not rendering

**Cause**: Missing UTF-8 charset declaration

**Solution**: Verify in HTML:

```html
<meta charset="UTF-8" />
```

And in `worker.js`:

```javascript
headers: {
  'Content-Type': 'text/html;charset=UTF-8'
}
```

---

#### Issue: Dark mode not persisting

**Symptoms**:

- Dark mode resets on page refresh
- Theme preference not saved

**Cause**: localStorage not working or cleared

**Solution**:

```javascript
// Check localStorage in browser console
localStorage.getItem('theme'); // Should return 'dark' or 'light'

// Clear and reset
localStorage.clear();
window.location.reload();
```

**Current Implementation**: Working via `typescript/portfolio-worker/index.html` line 1100+ ✅

---

### 🔵 Performance Issues

#### Issue: Slow page load on first visit

**Symptoms**:

- Long Time to First Byte (TTFB)
- White screen delay

**Diagnosis**:

```bash
# Measure performance
curl -w "@curl-format.txt" -o /dev/null -s https://resume.jclee.me

# Check from multiple locations
# Use: https://www.webpagetest.org/
```

**Solutions**:

1. **Enable caching** (already implemented):

   ```javascript
   'Cache-Control': 'public, max-age=3600'
   ```

2. **Preconnect to external domains**:

   ```html
   <link rel="preconnect" href="https://fonts.googleapis.com" />
   <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
   ```

3. **Lazy-load fonts**:
   ```css
   @font-face {
     font-family: 'Playfair Display';
     font-display: swap; /* Prevent FOIT */
   }
   ```

---

#### Issue: High Cloudflare Workers CPU usage

**Symptoms**:

- Slow response times
- CPU time limit warnings

**Cause**: Heavy JavaScript processing in worker

**Current Status**: Minimal JS (just routing) ✅

**Monitor**:

```bash
wrangler tail --status error
```

---

### 🟣 Development Issues

#### Issue: Changes not visible when using `wrangler dev`

**Symptoms**:

- Local dev server shows old content
- Hot reload not working

**Solution**:

```bash
# Stop wrangler dev (Ctrl+C)

# Regenerate worker
node generate-worker.js

# Restart dev server
wrangler dev
```

**Better Approach**: Use file watcher

```bash
# Install nodemon
npm install -g nodemon

# Auto-regenerate on HTML changes
nodemon --watch typescript/portfolio-worker/index.html --watch typescript/portfolio-worker/resume.html \
  --exec "node typescript/portfolio-worker/generate-worker.js && wrangler dev"
```

---

#### Issue: CORS errors when testing locally

**Symptoms**:

```
Access to fetch at 'https://fonts.googleapis.com/...' blocked by CORS
```

**Cause**: Local dev server restrictions

**Solution**: Add CORS headers in `worker.js`:

```javascript
headers: {
  'Content-Type': 'text/html;charset=UTF-8',
  'Access-Control-Allow-Origin': '*',  // For dev only
}
```

**Production**: Remove `Access-Control-Allow-Origin: *` for security

---

### 🟠 PDF Generation Issues

#### Issue: "pandoc: command not found"

**Symptoms**:

```bash
./toss/pdf-convert.sh
# pandoc: command not found
```

**Solution**:

```bash
# Ubuntu/Debian
sudo apt-get install pandoc texlive-xetex texlive-lang-korean

# macOS
brew install pandoc
brew install --cask mactex
```

---

#### Issue: Korean fonts missing in PDF

**Symptoms**:

- PDF shows boxes instead of Korean characters
- "Missing font" warnings

**Solution**: Install Korean font package

```bash
# Ubuntu/Debian
sudo apt-get install fonts-nanum fonts-nanum-coding

# macOS
brew tap homebrew/cask-fonts
brew install --cask font-nanum font-nanum-gothic
```

Update `pdf-convert.sh`:

```bash
pandoc input.md -o output.pdf \
  --pdf-engine=xelatex \
  --variable mainfont="NanumGothic"
```

---

### 🔧 GitLab CI/CD Issues

#### Issue: Deployment fails with "Invalid API token"

**Symptoms**:

```
Error: 10000: Authentication error
```

**Cause**: Expired or incorrect `CLOUDFLARE_API_TOKEN`

**Solution**:

1. Generate new API token: Cloudflare Dashboard → My Profile → API Tokens
2. Update GitHub Secret: Repository → Settings → Secrets → `CLOUDFLARE_API_TOKEN`

**Required Permissions**:

- Account: Workers Scripts (Edit)
- Zone: Workers Routes (Edit)

---

#### Issue: "Gemini API failed" in deployment notes

**Symptoms**:

- Deployment succeeds but no summary generated
- GitHub Actions shows API error

**Cause**: `GEMINI_API_KEY` missing or invalid

**Solution**:

```bash
# This is optional - deployment still works
# Update GitHub Secret if you want AI-generated notes
```

**Workaround**: Remove Gemini step from `.github/workflows/ci.yml`

---

## Diagnostic Commands

### Check deployment status

```bash
wrangler deployments list
```

### View live logs

```bash
wrangler tail --format pretty
```

### Test worker locally

```bash
cd typescript/portfolio-worker && wrangler dev
# Visit http://localhost:8787
```

### Validate worker.js syntax

```bash
node -c typescript/portfolio-worker/worker.js
```

### Check HTML size

```bash
wc -c typescript/portfolio-worker/index.html typescript/portfolio-worker/resume.html
```

### Verify UTF-8 encoding

```bash
file -bi typescript/portfolio-worker/index.html
# Should show: text/html; charset=utf-8
```

### Test from different regions

```bash
# Use curl with different DNS
curl -H "Host: resume.jclee.me" https://[CLOUDFLARE_IP]/
```

---

## Getting Help

### Resources

- **Cloudflare Workers Docs**: https://developers.cloudflare.com/workers/
- **Wrangler CLI Docs**: https://developers.cloudflare.com/workers/wrangler/
- **Project Issues**: https://github.com/jclee-homelab/resume/issues

### Logs Location

- **GitHub Actions**: Repository → Actions → [Workflow] → Logs
- **Cloudflare**: Dashboard → Workers & Pages → resume → Logs
- **Local**: `~/.wrangler/logs/`

### Debug Mode

```bash
# Enable verbose logging
wrangler deploy --verbose

# Debug worker execution
wrangler tail --debug
```

---

## Emergency Rollback

If production is broken:

```bash
# Method 1: Wrangler CLI
wrangler rollback

# Method 2: Git revert
git revert HEAD
cd typescript/portfolio-worker && node generate-worker.js
wrangler deploy

# Method 3: Cloudflare Dashboard
# Navigate to Workers → resume → Rollback
```

**Recovery Time Objective (RTO)**: < 5 minutes
