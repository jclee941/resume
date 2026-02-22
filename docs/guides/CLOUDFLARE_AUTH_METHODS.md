# Cloudflare Authentication Methods - Complete Guide

**Created**: 2025-11-12
**Purpose**: Explain authentication methods for Resume Portfolio deployment

---

## 🔑 Two Authentication Methods

Cloudflare supports **two different authentication methods** for Wrangler CLI:

### 1. API Token (⭐ Recommended)

**What it is**: Scoped permission token with limited access

**Advantages**:

- ✅ **Secure**: Only has permissions you explicitly grant
- ✅ **Best practice**: Recommended by Cloudflare
- ✅ **Granular**: Can limit to specific zones/accounts
- ✅ **Revocable**: Easy to rotate without affecting other services

**Where to find**: https://dash.cloudflare.com/profile/api-tokens

**Required environment variable**:

```bash
CLOUDFLARE_API_TOKEN=your_40_character_token_here
```

**Format**: 40+ character string (e.g., `aBcD1234efGh5678ijKl9012mnOp3456qrSt7890`)

---

### 2. Global API Key (Legacy)

**What it is**: Master key with **full account access**

**Advantages**:

- ✅ **Simple**: No permission configuration needed
- ✅ **Universal**: Works for all Cloudflare API operations

**Disadvantages**:

- ⚠️ **Security risk**: Full account access (DNS, SSL, Workers, everything)
- ⚠️ **Legacy**: Cloudflare recommends using API Tokens instead
- ⚠️ **No scoping**: Cannot limit permissions

**Where to find**: https://dash.cloudflare.com/profile

**Required environment variables** (need BOTH):

```bash
CLOUDFLARE_API_KEY=your_global_api_key_here
CLOUDFLARE_EMAIL=your_cloudflare_email@example.com
```

**Format**: 37 character hex string (e.g., `00ceb252a1a463c9c69a9f5a9f97e5d112bb9`)

---

## 🆚 Quick Comparison

| Feature         | API Token              | Global API Key          |
| --------------- | ---------------------- | ----------------------- |
| **Security**    | ✅ Scoped permissions  | ⚠️ Full account access  |
| **Setup**       | 1 environment variable | 2 environment variables |
| **Recommended** | ✅ Yes (by Cloudflare) | ❌ No (legacy)          |
| **Expires**     | Optional expiration    | Never expires           |
| **Revocable**   | ✅ Easy                | ⚠️ Affects all services |
| **Format**      | 40+ chars              | 37 chars (hex)          |

---

## 📋 Setup Instructions

### Option 1: API Token (Recommended)

#### Step 1: Generate Token

1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Click **"Create Token"**
3. Use template: **"Edit Cloudflare Workers"**
4. Or create custom token with permissions:
   - Account - Workers Scripts - **Edit**
   - Account - Workers KV Storage - **Edit**
   - Zone - Workers Routes - **Edit**
5. Click **"Continue to summary"** → **"Create Token"**
6. **Copy token immediately** (shown only once!)

#### Step 2: Configure Environment

```bash
# Edit .env file
vim ~/.env

# Add this line (replace with your actual token):
CLOUDFLARE_API_TOKEN=aBcD1234efGh5678ijKl9012mnOp3456qrSt7890

# Save and load
source ~/.env
```

#### Step 3: Verify

```bash
cd /home/jclee/dev/resume/typescript/portfolio-worker
npx wrangler whoami

# Expected output:
# 👋 You are logged in with an API Token, associated with the email 'your@email.com'!
```

---

### Option 2: Global API Key

#### Step 1: Get Global API Key

1. Go to https://dash.cloudflare.com/profile
2. Scroll to **"API Keys"** section
3. Find **"Global API Key"** → Click **"View"**
4. Enter password to reveal key
5. **Copy the key**

#### Step 2: Configure Environment

```bash
# Edit .env file
vim ~/.env

# Add BOTH lines (replace with your actual values):
CLOUDFLARE_API_KEY=00ceb252a1a463c9c69a9f5a9f97e5d112bb9
CLOUDFLARE_EMAIL=your_cloudflare_email@example.com

# Save and load
source ~/.env
```

#### Step 3: Verify

```bash
cd /home/jclee/dev/resume/typescript/portfolio-worker
npx wrangler whoami

# Expected output:
# 👋 You are logged in with an API Key, associated with the email 'your@email.com'!
```

---

### Option 3: Interactive Login (Easiest)

**No manual token/key needed** - uses OAuth browser authentication

```bash
cd /home/jclee/dev/resume/typescript/portfolio-worker
npx wrangler login

# Browser opens automatically
# Click "Allow" to grant access
# Done!
```

**Advantages**:

- ✅ No manual token management
- ✅ Most secure (OAuth-based)
- ✅ Works immediately

**Disadvantage**:

- ❌ Not suitable for CI/CD automation

---

## 🔧 Deployment Usage

### With API Token (Current Setup)

```bash
# Set environment variable
export CLOUDFLARE_API_TOKEN=your_token_here

# Or load from .env
source ~/.env

# Deploy
cd /home/jclee/dev/resume
./scripts/deployment/quick-deploy.sh
```

### With Global API Key

```bash
# Set environment variables (need BOTH)
export CLOUDFLARE_API_KEY=your_key_here
export CLOUDFLARE_EMAIL=your@email.com

# Or load from .env
source ~/.env

# Deploy (scripts now support both methods)
cd /home/jclee/dev/resume
./scripts/deployment/quick-deploy.sh
```

### With Interactive Login

```bash
# Login once (persists across sessions)
cd /home/jclee/dev/resume/typescript/portfolio-worker
npx wrangler login

# Then deploy (no environment variables needed)
cd /home/jclee/dev/resume
./scripts/deployment/quick-deploy.sh
```

---

## 🚨 Current Issue: Invalid Token in .env

**Problem detected**:

```bash
$ cat ~/.env
CLOUDFLARE_API_TOKEN=00ceb252a1a463c9c69a9f5a9f97e5d112bb9
```

**Issues**:

1. **Token length**: 37 characters (invalid - should be 40+)
2. **Format looks like Global API Key** (37-char hex) but stored as `CLOUDFLARE_API_TOKEN`
3. **Error**: "Invalid format for Authorization header [code: 6111]"

**Root cause**: This appears to be a **Global API Key stored with wrong variable name**

---

## 🔨 Fix Options

### Fix Option 1: Generate New API Token (Best)

```bash
# 1. Generate new API Token (see instructions above)
# 2. Update .env:
vim ~/.env
# Change to: CLOUDFLARE_API_TOKEN=your_new_40_char_token

# 3. Test
source ~/.env
cd /home/jclee/dev/resume/typescript/portfolio-worker
npx wrangler whoami
```

---

### Fix Option 2: Use Existing Value as Global API Key

**If the current 37-char value IS your Global API Key**:

```bash
# 1. Get your Cloudflare email
# 2. Update .env:
vim ~/.env

# Change from:
# CLOUDFLARE_API_TOKEN=00ceb252a1a463c9c69a9f5a9f97e5d112bb9

# To:
CLOUDFLARE_API_KEY=00ceb252a1a463c9c69a9f5a9f97e5d112bb9
CLOUDFLARE_EMAIL=your_cloudflare_email@example.com

# 3. Test
source ~/.env
cd /home/jclee/dev/resume/typescript/portfolio-worker
npx wrangler whoami
```

---

### Fix Option 3: Interactive Login (Quickest)

```bash
# Bypass .env entirely
cd /home/jclee/dev/resume/typescript/portfolio-worker
npx wrangler login

# Browser opens, click Allow, done!
# Then deploy normally
```

---

## 🧪 Verification

### Test Authentication

```bash
# Load credentials
source ~/.env

# Test with wrangler
cd /home/jclee/dev/resume/typescript/portfolio-worker
npx wrangler whoami
```

**Success output (API Token)**:

```
👋 You are logged in with an API Token, associated with the email 'your@email.com'!
Account Name: Your Account Name
Account ID: 1234567890abcdef1234567890abcdef
```

**Success output (Global API Key)**:

```
👋 You are logged in with an API Key, associated with the email 'your@email.com'!
Account Name: Your Account Name
Account ID: 1234567890abcdef1234567890abcdef
```

**Failure output**:

```
✘ [ERROR] A request to the Cloudflare API (/user/tokens/verify) failed.
Invalid format for Authorization header [code: 6111]
```

---

## 📚 References

| Resource                     | URL                                                             |
| ---------------------------- | --------------------------------------------------------------- |
| **API Token Creation**       | https://dash.cloudflare.com/profile/api-tokens                  |
| **Global API Key**           | https://dash.cloudflare.com/profile (scroll to "API Keys")      |
| **Wrangler Docs**            | https://developers.cloudflare.com/workers/wrangler/commands/    |
| **Authentication Guide**     | https://developers.cloudflare.com/fundamentals/api/get-started/ |
| **Project Deployment Guide** | docs/MANUAL_DEPLOYMENT_GUIDE.md                                 |

---

## 💡 Recommendation

**For this project**: Use **API Token** (Option 1)

**Why**:

1. ✅ More secure (scoped permissions)
2. ✅ Best practice (recommended by Cloudflare)
3. ✅ Easier to rotate (doesn't affect other services)
4. ✅ Works with deployment automation scripts

**Current action needed**:

1. Generate new API Token at https://dash.cloudflare.com/profile/api-tokens
2. Use "Edit Cloudflare Workers" template
3. Update `~/.env` with new token
4. Run `./scripts/deployment/quick-deploy.sh`

---

**Last Updated**: 2025-11-12T00:15:00Z
**Maintainer**: OpenCode AI Assistant
**Version**: 1.0.0
