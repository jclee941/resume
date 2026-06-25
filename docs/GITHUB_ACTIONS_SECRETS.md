# GitHub Actions Secrets Configuration Guide

## Overview

This guide helps you configure all required secrets for GitHub Actions
workflows.

**Location**: GitHub Repository → Settings → Secrets and variables → Actions

---

## Required Secrets (MUST CONFIGURE BEFORE FIRST DEPLOYMENT)

### 1. CLOUDFLARE_API_TOKEN ⚠️ CRITICAL

**Purpose**: Authenticate with Cloudflare API for deploying Workers and managing
DNS

**How to get it**:

1. Go to <https://dash.cloudflare.com/profile/api-tokens>
2. Click "Create Token"
3. Choose template: **"Edit Cloudflare Workers"**
4. Configure:
   - **Account Resources**: Include → All accounts
   - **Zone Resources**: Include → All zones
   - **Permissions**:
     - `Workers Scripts:Edit`
     - `Cloudflare Workers:Edit`
     - `DNS:Edit` (for terraform)
5. Click "Continue to summary"
6. Review and click "Create Token"
7. Copy token immediately

**Where used**:

- `ci.yml`: deploy-portfolio, deploy-job-dashboard jobs
- `maintenance.yml`: drift-detection job
- `terraform.yml`: plan, apply, destroy jobs

**Format**: Alphanumeric string (usually 40+ characters)

**Validation**:

```bash
curl -X GET https://api.cloudflare.com/client/v4/user/tokens/verify \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

---

### 2. CLOUDFLARE_ACCOUNT_ID ⚠️ CRITICAL

**Purpose**: Identify which Cloudflare account to deploy to

**How to get it**:

1. Go to <https://dash.cloudflare.com/>
2. On overview page, find **"Account ID"** (usually bottom right)
3. Copy the 32-character hex string

**Where used**:

- `ci.yml`: deploy-portfolio, deploy-job-dashboard jobs
- `maintenance.yml`: drift-detection job
- `terraform.yml`: plan, apply, destroy jobs

**Format**: 32-character hex string (example:
`a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4`)

**To verify you have it**:

```bash
# Format check
echo "CLOUDFLARE_ACCOUNT_ID" | grep -E '^[a-f0-9]{32}$' && echo "✅ Valid" || echo "❌ Invalid"
```

---

## Optional Secrets (RECOMMENDED)

### 3. AUTH_SYNC_SECRET (Optional but Recommended)

**Purpose**: Secure endpoint authentication for profile synchronization

**How to generate it**:

```bash
# Generate a secure random string
openssl rand -base64 32
# Or
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

**Where used**:

- `maintenance.yml`: auth-refresh job

**Format**: Base64-encoded random string (32+ characters)

**Default behavior if not set**: Job will fail with "missing AUTH_SYNC_SECRET"

---

### 4. ENCRYPTION_KEY (Optional but Recommended)

**Purpose**: Encrypt session tokens and sensitive data in transit

**How to generate it**:

```bash
# Generate a 32-byte encryption key
openssl rand -hex 32
# Or (base64)
openssl rand -base64 32
```

**Where used**:

- `maintenance.yml`: auth-refresh job (session encryption)

**Format**: Hex string (64 characters for 32 bytes) or base64 string

**Default behavior if not set**: Auth tokens won't be encrypted

---

### 5. AUTOMATION_WEBHOOK_URL (Optional - For Notifications)

**Purpose**: Send deployment notifications to automation

**How to get it**:

1. In your automation instance, create a webhook trigger
2. Copy the webhook URL
3. Add authentication token if required (add to URL: `?token=YOUR_TOKEN`)

**Where used**:

- `ci.yml`: notify job (notifications only, non-blocking)
- `maintenance.yml`: on-completion notification

**Format**: HTTPS URL with optional query parameters

**Default behavior if not set**: Notifications are skipped (non-critical)

**Example**:

```text
https://automation.example.com/webhook/my-workflow?token=abc123
```

---

## Infrastructure Secrets (TERRAFORM)

These are needed only if using `terraform.yml` for infrastructure management.

### 6. TF_STATE_URL

**Purpose**: URL to Terraform remote state storage (HTTP backend)

**Example values**:

- Terraform Cloud:
  `https://app.terraform.io/api/v2/organizations/YOUR_ORG/state-versions`
- Terraform Enterprise: `https://terraform.example.com/api/v2/state-versions`
- HTTP backend: `http://terraform-state.example.com`

**Where used**: `terraform.yml` (all jobs)

---

### 7. TF_STATE_USERNAME

**Purpose**: Username for Terraform state backend HTTP authentication

**Where used**: `terraform.yml` (all jobs)

---

### 8. TF_STATE_PASSWORD

**Purpose**: Password for Terraform state backend HTTP authentication

**Where used**: `terraform.yml` (all jobs)

---

## GITHUB_TOKEN (Automatic)

**Note**: This secret is automatically provided by GitHub Actions. You don't
need to configure it.

**Where used**:

- `ci.yml`: security-secrets job (scanning)
- `terraform.yml`: branch protection checks

---

## ADMIN_TOKEN (Optional - For Advanced Features)

**Purpose**: Administrative authentication for sensitive operations

**Where used**:

- `maintenance.yml`: drift-detection job (if implemented)

---

## Configuration Checklist

### Step 1: Navigate to Secrets

```text
GitHub Repository → Settings → Secrets and variables → Actions
```

### Step 2: Create Each Secret

For each required secret:

1. Click "New repository secret"
2. Enter **Name** (exactly as shown above)
3. Paste **Value**
4. Click "Add secret"

**Example for CLOUDFLARE_API_TOKEN**:

```text
Name: CLOUDFLARE_API_TOKEN
Value: [paste your token from Cloudflare]
```

### Step 3: Verify Configuration

After adding secrets, verify by running a test workflow:

```bash
# Go to GitHub Actions tab
# Click "CI/CD Pipeline"
# Click "Run workflow"
# Select branch: main/master
# Click "Run workflow"
```

Monitor the deployment:

- ✅ If deploy jobs start → secrets are configured
- ❌ If deploy jobs fail with auth error → secret is missing/invalid

---

## Troubleshooting

### "Failed to authenticate with Cloudflare"

**Cause**: `CLOUDFLARE_API_TOKEN` is missing or invalid
**Solution**:

1. Verify token exists in GitHub Secrets
2. Verify token permissions include "Workers:Edit"
3. Regenerate token if expired (> 1 year old)
4. Test with curl command above

### "Undefined variable: accountId"

**Cause**: `CLOUDFLARE_ACCOUNT_ID` is missing
**Solution**:

1. Get Account ID from <https://dash.cloudflare.com/>
2. Verify format: 32-character hex string
3. Add to GitHub Secrets

### "Job skipped: Missing AUTOMATION_WEBHOOK_URL"

**Cause**: AUTOMATION_WEBHOOK_URL is optional and not configured
**Solution**: This is normal - notifications are skipped. Only configure if you
want notifications.

### "Invalid base64 encoding"

**Cause**: SECRET value has incorrect format
**Solution**:

- For `AUTH_SYNC_SECRET`: Use output from `openssl rand -base64 32`
- For `ENCRYPTION_KEY`: Use output from `openssl rand -hex 32`

---

## Security Best Practices

1. **Never commit secrets** to version control
2. **Rotate tokens** annually
3. **Use strong permissions** - Cloudflare token should have minimal required
   permissions
4. **Monitor usage** - Check Cloudflare API logs for suspicious activity
5. **Store backups securely** - Keep copies of tokens in a secure password
   manager
6. **Use separate tokens** - Consider separate tokens for dev/staging/prod
7. **Review logs** - GitHub Actions logs show when secrets are used

---

## Testing Secret Configuration

### Test 1: Validate Cloudflare Token

```bash
curl -X GET https://api.cloudflare.com/client/v4/user/tokens/verify \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json"

# Expected response:
# {
#   "success": true,
#   "errors": [],
#   "messages": [],
#   "result": {
#     "id": "...",
#     "status": "active"
#   }
# }
```

### Test 2: Validate Account ID

```bash
curl -X GET https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json"

# Expected response: Account details (200 OK)
```

### Test 3: Test Deployment Locally

```bash
# Set environment variables
export CLOUDFLARE_API_TOKEN="your_token"
export CLOUDFLARE_ACCOUNT_ID="your_account_id"

# Try to list Workers
wrangler deployments list --name resume-portfolio

# Should show deployment history or "No deployments found"
```

---

## Reference: Which Workflows Use Which Secrets

| Secret                | ci.yml | maintenance.yml | terraform.yml | verify.yml |
| --------------------- | ------ | --------------- | ------------- | ---------- |
| CLOUDFLARE_API_TOKEN  | ✅     | ✅              | ✅            |            |
| CLOUDFLARE_ACCOUNT_ID | ✅     | ✅              | ✅            |            |
| GITHUB_TOKEN          | ✅     |                 | ✅            |            |
| AUTOMATION_WEBHOOK_URL       | ✅     | ✅              |               |            |
| AUTH_SYNC_SECRET      |        | ✅              |               |            |
| ENCRYPTION_KEY        |        | ✅              |               |            |
| TF_STATE_URL          |        | ✅              | ✅            |            |
| TF_STATE_USERNAME     |        | ✅              | ✅            |            |
| TF_STATE_PASSWORD     |        | ✅              | ✅            |            |
| ADMIN_TOKEN           |        | ✅              |               |            |

---

## Quick Copy-Paste Template

Use this template when configuring secrets in GitHub UI:

```text
Name: CLOUDFLARE_API_TOKEN
Value: [your token from Cloudflare]

Name: CLOUDFLARE_ACCOUNT_ID
Value: [32-char hex from Cloudflare]

Name: AUTH_SYNC_SECRET
Value: [output from: openssl rand -base64 32]

Name: ENCRYPTION_KEY
Value: [output from: openssl rand -hex 32]

Name: AUTOMATION_WEBHOOK_URL
Value: [your automation webhook URL]
```

---

## Next Steps

1. ✅ Obtain CLOUDFLARE_API_TOKEN (5-10 min)
2. ✅ Obtain CLOUDFLARE_ACCOUNT_ID (2 min)
3. ✅ Configure secrets in GitHub UI (5 min)
4. ✅ Test with manual workflow dispatch (10 min)
5. ⏭️ Proceed to: Testing workflows locally with `act`

---

**Last Updated**: GitHub Actions Migration Session 5
**Status**: Secrets guide ready for configuration
**Time to Configure**: 20-30 minutes
