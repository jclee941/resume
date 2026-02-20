# Manual Deployment Guide - Resume Portfolio

**Created**: 2025-11-11T21:21:45Z
**Status**: ⚠️ Automated deployment blocked - manual intervention required
**Features Ready**: Open Graph image + Web Vitals tracking

---

## 🚨 Current Situation

### ✅ Completed Work

- **Code**: All features complete and tested (commits: 1159cc7, 7148d48, 3eda1d5)
- **Tests**: 10/10 E2E tests passing
- **Repository**: Committed to GitHub
- **Build**: worker.js generated (150.06 KB)

### ❌ Deployment Blockers

1. **GitHub SSH**: `Permission denied (publickey)` - SSH key invalid/expired
2. **GitHub HTTPS**: `Invalid username or token` - Stored credentials expired
3. **Wrangler Local**: `Unable to authenticate request [code: 10001]` - API token invalid/insufficient

### 📊 Impact

- **Production version**: 2025-11-08T14:42:20Z (3 days old)
- **Missing features**: Open Graph social preview + Web Vitals tracking
- **Users affected**: Anyone sharing resume site on social media

---

## ⚡ Quick Deployment (Automation Scripts)

**NEW**: Three helper scripts for streamlined deployment:

### 1. Quick Deploy (Recommended)

```bash
# One-command deployment with all checks
./scripts/deployment/quick-deploy.sh
```

- Checks prerequisites (Node.js, npm, git)
- Runs all tests (unit + E2E)
- Builds worker.js with timestamp
- Deploys to Cloudflare Workers
- Runs comprehensive verification
- **Requires**: `CLOUDFLARE_API_TOKEN` environment variable

### 2. Deployment Helper

```bash
# Step-by-step deployment with progress indicators
./scripts/deployment/deploy-helper.sh
```

- 6-stage deployment pipeline
- Color-coded progress output
- Git status validation
- Production URL summary
- **Requires**: `CLOUDFLARE_API_TOKEN` environment variable

### 3. Verification Only

```bash
# Verify existing deployment (7 comprehensive checks)
./scripts/verification/verify-deployment.sh
```

- Deployment timestamp check
- Open Graph image validation
- OG meta tags verification
- Web Vitals tracking check
- Vitals endpoint test
- Security headers validation
- Prometheus metrics check
- **No credentials required** (read-only checks)

**Usage Example**:

```bash
# Set API token (get from Cloudflare Dashboard)
export CLOUDFLARE_API_TOKEN=your_token_here

# Deploy with one command
./scripts/deployment/quick-deploy.sh

# Or verify existing deployment
./scripts/verification/verify-deployment.sh
```

---

## 🔧 Manual Deployment Steps (If Automation Fails)

### Option 1: Fix GitHub Authentication (Best Long-term Solution)

This enables automatic CI/CD deployment on every push to `master`.

#### Step 1: Generate New GitHub Personal Access Token (PAT)

1. Go to GitHub Settings:

   ```
   https://github.com/settings/tokens
   ```

2. Click "Generate new token" → "Generate new token (classic)"

3. Configure token:
   - **Note**: "Resume Portfolio Deployment"
   - **Expiration**: 90 days (or custom)
   - **Scopes** (check these boxes):
     - ✅ `repo` (Full control of private repositories)
     - ✅ `workflow` (Update GitHub Action workflows)

4. Click "Generate token"

5. **IMPORTANT**: Copy the token immediately (shown once only)
   - Format: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

#### Step 2: Update Stored Credentials

```bash
# Remove old credentials
rm ~/.git-credentials

# Add new credentials (replace YOUR_PAT with actual token)
echo "https://qws941:YOUR_PAT@github.com" > ~/.git-credentials
chmod 600 ~/.git-credentials

# Test credentials
git ls-remote https://github.com/qws941/resume.git
```

#### Step 3: Push to GitHub

```bash
cd /home/jclee/dev/resume

# Push to GitHub via HTTPS
git push github-https master

# Expected result: GitHub Actions workflow starts
# Monitor at: https://github.com/qws941/resume/actions
```

#### Step 4: Verify Deployment

```bash
# Wait 2-3 minutes for GitHub Actions to complete, then:

# Check deployment timestamp
curl -s https://resume.jclee.me/health | jq -r '.deployed_at'
# Expected: 2025-11-11T21:11:43Z or newer

# Verify OG image
curl -I https://resume.jclee.me/og-image.png
# Expected: HTTP 200, Content-Type: image/png

# Test Web Vitals endpoint
curl -X POST https://resume.jclee.me/api/vitals \
  -H "Content-Type: application/json" \
  -d '{"lcp":1000,"fid":50,"cls":0.1,"fcp":800,"ttfb":200}'
# Expected: HTTP 200
```

---

### Option 2: Local Wrangler Deployment (Quick Fix)

Use this if you need immediate deployment without fixing GitHub auth.

#### Step 1: Get Fresh Cloudflare API Token

1. Log in to Cloudflare Dashboard:

   ```
   https://dash.cloudflare.com/
   ```

2. Navigate to:

   ```
   My Profile (top right) → API Tokens
   ```

3. Click "Create Token"

4. Use template: "Edit Cloudflare Workers"
   - Or create custom token with permissions:
     - ✅ Account - Workers Scripts - Edit
     - ✅ Account - Workers KV Storage - Edit
     - ✅ Zone - Workers Routes - Edit

5. **Copy the token immediately**
   - Format: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

#### Step 2: Get Account ID

1. In Cloudflare Dashboard, go to "Workers & Pages"
2. Look for "Account ID" in the right sidebar
3. Copy the Account ID (format: 32-character hex string)

#### Step 3: Configure Wrangler

```bash
cd /home/jclee/dev/resume

# Option A: Interactive login (opens browser)
npx wrangler login

# Option B: Set environment variables (if you have tokens)
export CLOUDFLARE_API_TOKEN="your_new_token_here"
export CLOUDFLARE_ACCOUNT_ID="your_account_id_here"

# Add to ~/.bashrc for persistence
echo 'export CLOUDFLARE_API_TOKEN="your_token"' >> ~/.bashrc
echo 'export CLOUDFLARE_ACCOUNT_ID="your_account_id"' >> ~/.bashrc
source ~/.bashrc
```

#### Step 4: Deploy

```bash
cd /home/jclee/dev/resume

# Rebuild worker.js with latest timestamp
npm run build

# Deploy to Cloudflare Workers (root-safe)
npx wrangler deploy --config typescript/portfolio-worker/wrangler.toml --env production

# Expected output:
# ⛅️ wrangler 4.43.0
# Total Upload: XX KB
# Uploaded resume (X.XX sec)
# Published resume (X.XX sec)
#   https://resume.jclee.me
# Current Deployment ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

#### Step 5: Verify Deployment

Same as Option 1, Step 4 above.

---

### Option 3: Fix GitHub SSH Key (Alternative)

If you prefer SSH over HTTPS tokens.

#### Step 1: Generate New SSH Key

```bash
# Generate Ed25519 key (recommended)
ssh-keygen -t ed25519 -C "qws941@kakao.com" -f ~/.ssh/id_ed25519_github

# Or RSA if Ed25519 not supported
ssh-keygen -t rsa -b 4096 -C "qws941@kakao.com" -f ~/.ssh/id_rsa_github

# Press Enter for all prompts (no passphrase for automation)
```

#### Step 2: Add Key to SSH Agent

```bash
# Start SSH agent
eval "$(ssh-agent -s)"

# Add key
ssh-add ~/.ssh/id_ed25519_github
# Or: ssh-add ~/.ssh/id_rsa_github
```

#### Step 3: Add Key to GitHub

```bash
# Copy public key to clipboard
cat ~/.ssh/id_ed25519_github.pub
# Or: cat ~/.ssh/id_rsa_github.pub

# Then:
# 1. Go to https://github.com/settings/keys
# 2. Click "New SSH key"
# 3. Title: "Resume Deployment - Rocky Linux"
# 4. Key type: Authentication Key
# 5. Paste the key (starts with ssh-ed25519 or ssh-rsa)
# 6. Click "Add SSH key"
```

#### Step 4: Test SSH Connection

```bash
# Test GitHub SSH
ssh -T git@github.com

# Expected output:
# Hi qws941! You've successfully authenticated, but GitHub does not provide shell access.
```

#### Step 5: Push to GitHub

```bash
cd /home/jclee/dev/resume

# Push to GitHub via SSH
git push github master

# Expected result: GitHub Actions workflow starts
```

#### Step 6: Verify Deployment

Same as Option 1, Step 4 above.

---

## 📋 Verification Checklist

After successful deployment using any option:

### 1. Deployment Timestamp

```bash
curl -s https://resume.jclee.me/health | jq '.'
```

**Expected**:

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "deployed_at": "2025-11-11T21:11:43.356Z", // Should be recent
  "uptime_seconds": 123,
  "metrics": {
    "requests_total": 5,
    "requests_success": 5,
    "requests_error": 0,
    "vitals_received": 0
  }
}
```

### 2. Open Graph Image

```bash
# Check HTTP headers
curl -I https://resume.jclee.me/og-image.png

# Download and verify
curl -s https://resume.jclee.me/og-image.png -o /tmp/og-test.png
file /tmp/og-test.png  # Should say "PNG image data, 1200 x 630"
ls -lh /tmp/og-test.png  # Should be ~84 KB
```

### 3. Open Graph Meta Tags

```bash
curl -s https://resume.jclee.me | grep -A5 'og:image'
```

**Expected**:

```html
<meta property="og:image" content="https://resume.jclee.me/og-image.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:type" content="image/png" />
```

### 4. Web Vitals Tracking Script

```bash
curl -s https://resume.jclee.me | grep -c "observeLCP\|observeFID\|observeCLS"
```

**Expected**: 3 (one match for each observer function)

### 5. Web Vitals Endpoint

```bash
curl -X POST https://resume.jclee.me/api/vitals \
  -H "Content-Type: application/json" \
  -d '{"lcp":1250,"fid":50,"cls":0.05,"fcp":800,"ttfb":200,"url":"/","timestamp":1699000000000,"userAgent":"curl-test"}' \
  -w "\nHTTP Status: %{http_code}\n"
```

**Expected**: HTTP Status: 200

### 6. Social Media Previews

Test the Open Graph image on social media validators:

**Twitter Card Validator**:

```
https://cards-dev.twitter.com/validator
```

- Enter: `https://resume.jclee.me`
- Should show: 1200x630 image with your name and title

**Facebook Sharing Debugger**:

```
https://developers.facebook.com/tools/debug/
```

- Enter: `https://resume.jclee.me`
- Click "Debug" → "Scrape Again" to refresh cache
- Should show: OG image preview

**LinkedIn Post Inspector**:

```
https://www.linkedin.com/post-inspector/
```

- Enter: `https://resume.jclee.me`
- Should show: Rich preview with OG image

### 7. CSP Hashes (Security Check)

```bash
curl -I https://resume.jclee.me | grep "Content-Security-Policy"
```

**Expected**: Should contain 2 script hashes and 1 style hash (no unsafe-inline)

---

## 🐛 Troubleshooting

### Issue: "GitHub Actions didn't trigger"

**Solution**:

```bash
# Check GitHub Actions status
# Go to: https://github.com/qws941/resume/actions

# If no workflow run:
# 1. Check if .github/workflows/deploy.yml exists in repo
# 2. Verify push reached GitHub: git log origin/master
# 3. Check GitHub Actions enabled: Settings → Actions → General
```

### Issue: "Deployment timestamp didn't update"

**Possible causes**:

1. Deployment failed (check GitHub Actions logs)
2. Browser cache (hard refresh: Ctrl+Shift+R)
3. Cloudflare cache (wait 1-2 minutes)

**Solution**:

```bash
# Force cache bypass
curl -H "Cache-Control: no-cache" https://resume.jclee.me/health

# Purge Cloudflare cache
npx wrangler deployments list  # Get deployment ID
# Then purge via Cloudflare Dashboard
```

### Issue: "OG image returns 404"

**Possible causes**:

1. worker.js wasn't regenerated (`npm run build` skipped)
2. Deployment failed silently
3. Route not properly configured

**Solution**:

```bash
cd /home/jclee/dev/resume

# Regenerate worker.js
npm run build

# Check if OG_IMAGE_BASE64 exists in worker.js
grep "OG_IMAGE_BASE64" typescript/portfolio-worker/worker.js | head -1
# Expected: const OG_IMAGE_BASE64 = 'iVBORw0KGgo...'

# Redeploy
npm run deploy:wrangler:root
```

### Issue: "Web Vitals not being logged"

**Possible causes**:

1. No user traffic yet (vitals require real user interactions)
2. Loki integration issue
3. Tracking script not loaded

**Solution**:

```bash
# Test vitals endpoint manually
curl -X POST https://resume.jclee.me/api/vitals \
  -H "Content-Type: application/json" \
  -d '{"lcp":1000,"fid":50,"cls":0.1}'

# Check Grafana Loki for logs
# Go to: https://grafana.jclee.me
# Explore → Loki → {job="resume-worker"}
```

### Issue: "Social media still shows old preview"

**Cause**: Social platforms cache OG images aggressively (1-7 days)

**Solution**:

```bash
# Force cache refresh on each platform:

# Twitter: https://cards-dev.twitter.com/validator
# - Enter URL → "Preview card" button

# Facebook: https://developers.facebook.com/tools/debug/
# - Enter URL → "Scrape Again" button (may need 2-3 times)

# LinkedIn: https://www.linkedin.com/post-inspector/
# - Enter URL → Wait 24 hours for cache expiry
# - Or: Add query parameter: https://resume.jclee.me?v=2
```

---

## 📚 Reference Documentation

**GitHub Actions Workflow**:

- File: `.github/workflows/deploy.yml`
- Jobs: test → build → deploy-worker → verify-deployment
- Secrets required: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`

**Worker Generation**:

- Script: `web/generate-worker.js`
- Input: `web/index.html`, `web/styles.css`, `web/data.json`, `web/og-image.png`
- Output: `web/worker.js` (150.06 KB)
- Process: CSS injection, data injection, OG embedding, minification, CSP hashing

**Commits**:

- 1159cc7: "feat(seo): Add Open Graph image for social sharing"
- 7148d48: "feat(analytics): Add Web Vitals tracking implementation"
- 3eda1d5: "docs: Update deployment status - OG image & Web Vitals awaiting deployment"

---

## 💡 Recommendations

### Immediate (Today)

1. ✅ **Deploy to production** using one of the three options above
2. ✅ **Verify all 7 checks** in the verification checklist
3. ✅ **Test social media previews** on Twitter, Facebook, LinkedIn

### Short-term (This Week)

1. 📱 **Monitor Web Vitals data** in Grafana Loki (wait for organic traffic)
2. 🔄 **Set up credential rotation reminder** (PAT expires in 90 days)
3. 📊 **Baseline performance metrics**: Document initial LCP, FID, CLS values

### Long-term (This Month)

1. 🔐 **Implement Grok AI resume improvements**:
   - Add specific dates: "19개월 (2023.01~2024.07)"
   - Expand acronyms: "EPP (Endpoint Protection Platform)"
   - Add concrete time values: "90% 단축 (10시간 → 1시간)"
2. 🎨 **A/B test OG image variations**: Different colors, layouts
3. 📈 **Performance optimization**: Based on Web Vitals data

---

## 🆘 Support

**If stuck after trying all options**:

1. **Check deployment status**:

   ```bash
   cat docs/DEPLOYMENT_STATUS.md
   ```

2. **Review error logs**:

   ```bash
   # Wrangler logs
   ls -lt ~/.config/.wrangler/logs/ | head -5

   # GitHub Actions logs
   # https://github.com/qws941/resume/actions
   ```

3. **Verify local build**:

   ```bash
   npm run build
   npm test
   npm run test:e2e

   # All should pass before deployment
   ```

4. **Contact**:
   - Email: qws941@kakao.com
   - GitHub Issues: https://github.com/qws941/resume/issues

---

**Last Updated**: 2025-11-11T21:21:45Z
**Author**: OpenCode AI Assistant
**Version**: 1.0.0
