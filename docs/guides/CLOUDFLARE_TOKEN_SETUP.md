# Cloudflare API Token Setup for Wrangler Deployment

## Issue

Wrangler v4 deployment failing with authentication error (code: 10001, 6111)

**Root Cause**: `.env` file uses deprecated Global API Key method. Wrangler v4 requires scoped API tokens.

## Solution: Create Cloudflare API Token

### Step 1: Access Cloudflare Dashboard

1. Visit: https://dash.cloudflare.com/profile/api-tokens
2. Click **"Create Token"**

### Step 2: Select Template

Choose **"Edit Cloudflare Workers"** template (recommended)

OR create custom token with these permissions:

- **Account** → **Cloudflare Workers Scripts** → **Edit**
- **Account** → **Account Settings** → **Read** (optional, for `wrangler whoami`)
- **Zone** → **Workers Routes** → **Edit** (if using custom domains)

### Step 3: Configure Token

- **Account Resources**: Select your account (a8d9c67f586acdd15eebcc65ca3aa5bb)
- **Zone Resources**: Include specific zone (jclee.me) or all zones
- **Client IP Address Filtering**: Leave empty (optional: add 192.168.50.100 for security)
- **TTL**: Leave as default (no expiration) or set to 1 year

### Step 4: Copy Token

**CRITICAL**: Copy the token immediately - it will only be shown once!

Example format: `aBcDeF1234567890GhIjKlMnOpQrStUvWxYz_1234567890`

### Step 5: Update `.env` File

Add the new token to `/home/jclee/.env`:

```bash
# Cloudflare Authentication (API Token method - Wrangler v4)
CLOUDFLARE_API_TOKEN=<your_token_here>
CLOUDFLARE_ACCOUNT_ID=a8d9c67f586acdd15eebcc65ca3aa5bb

# Deprecated: Old Global API Key method (keep for backup)
# CLOUDFLARE_API_KEY=00ceb252a1a463c9c69a9f5a9f97e5d112bb9
# CLOUDFLARE_EMAIL=qws941@kakao.com
```

### Step 6: Test Authentication

```bash
# Reload environment
source ~/.env

# Test authentication
npx wrangler whoami
# Should show: You are logged in with an API Token, associated with the email 'qws941@kakao.com'
```

### Step 7: Deploy

```bash
cd /home/jclee/dev/resume
npm run deploy
```

## Verification

1. Check deployment timestamp:

```bash
curl -s https://resume.jclee.me/health | jq -r '.deployed_at'
```

2. Verify 14 projects visible:

```bash
curl -s https://resume.jclee.me | grep -o '"title":' | wc -l
# Should return: 14
```

## Alternative: Manual Deployment via Dashboard

If API token creation is not possible:

1. Log into https://dash.cloudflare.com/
2. Navigate to **Workers & Pages**
3. Select **"resume"** worker
4. Click **"Quick Edit"** or **"Upload"**
5. Replace content with `/home/jclee/dev/resume/typescript/portfolio-worker/worker.js` (155.96 KB)
6. Click **"Save and Deploy"**

## Security Notes

- API tokens are more secure than Global API Keys (scoped permissions)
- Never commit `.env` file to Git (already in `.gitignore`)
- Token can be revoked anytime from Cloudflare dashboard
- Use separate tokens for CI/CD (GitHub Actions) vs local development

## Troubleshooting

### Error: "Invalid request headers [code: 6003]"

- Token not set in environment
- Run: `source ~/.env && echo $CLOUDFLARE_API_TOKEN`

### Error: "Unauthorized [code: 10000]"

- Token lacks Workers edit permissions
- Recreate token with "Edit Cloudflare Workers" template

### Error: "Account ID mismatch"

- Verify `wrangler.toml` has correct `account_id = "a8d9c67f586acdd15eebcc65ca3aa5bb"`

---

**Created**: 2025-11-12
**Status**: Pending token creation
**Next Step**: Create API token at https://dash.cloudflare.com/profile/api-tokens
