# Secrets & CI/CD Configuration

## GitHub Actions Variables

Set these in GitHub → Settings → Secrets and variables → Actions:

| Variable                | Type     | Protected | Masked | Description                        |
| ----------------------- | -------- | --------- | ------ | ---------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | Variable | Yes       | Yes    | Wrangler deploy token              |
| `CLOUDFLARE_ACCOUNT_ID` | Variable | Yes       | No     | `a8d9c67f586acdd15eebcc65ca3aa5bb` |

---

# Worker Secrets Configuration for resume.jclee.me/job Worker

## Required Secrets

Set these via `wrangler secret put <NAME>` or Cloudflare Dashboard.

### ADMIN_TOKEN

**Purpose**: Authenticate admin dashboard access  
**Format**: Secure random string (32+ chars)  
**Generate**:

```bash
openssl rand -base64 32
```

### WEBHOOK_SECRET

**Purpose**: Validate incoming webhooks from n8n/external sources  
**Format**: Shared secret with webhook sender  
**Generate**:

```bash
openssl rand -hex 32
```

### ENCRYPTION_KEY

**Purpose**: AES-256-GCM encryption for session cookies  
**Format**: Base64-encoded 32-byte key  
**Generate**:

```bash
openssl rand -base64 32
```

## Setting Secrets

### Via Wrangler CLI

```bash
cd job-automation-mcp/workers

# Set each secret (interactive prompt)
npx wrangler secret put ADMIN_TOKEN
npx wrangler secret put WEBHOOK_SECRET
npx wrangler secret put ENCRYPTION_KEY

# For production environment
npx wrangler secret put ADMIN_TOKEN --env production
npx wrangler secret put WEBHOOK_SECRET --env production
npx wrangler secret put ENCRYPTION_KEY --env production
```

### Via Cloudflare Dashboard

1. Go to Workers & Pages > job-dashboard > Settings > Variables
2. Add each secret under "Encrypt" section
3. Save changes

## KV Namespaces (Already Configured)

| Binding       | ID                                 | Purpose                    |
| ------------- | ---------------------------------- | -------------------------- |
| RATE_LIMIT_KV | `fe51b0f1c2c44841b4895e8747cb408a` | Token bucket rate limiting |
| NONCE_KV      | `3e282b1b906c474aadcc947a06f0c1ad` | Webhook replay protection  |

## Security Notes

- Never commit secrets to git
- Rotate ENCRYPTION_KEY periodically (invalidates all sessions)
- WEBHOOK_SECRET must match n8n workflow configuration
- ADMIN_TOKEN should be unique per environment
