# Deployment Guide

Complete step-by-step instructions for deploying the job-automation dashboard worker to Cloudflare Workers.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Environment Configuration](#environment-configuration)
4. [Secrets Management](#secrets-management)
5. [D1 Database Setup](#d1-database-setup)
6. [KV Namespace Creation](#kv-namespace-creation)
7. [R2 Bucket Setup](#r2-bucket-setup)
8. [Additional Bindings](#additional-bindings)
9. [Workflows & Cron Configuration](#workflows--cron-configuration)
10. [Deployment Steps](#deployment-steps)
11. [Post-Deployment Verification](#post-deployment-verification)
12. [Monitoring & Logging](#monitoring--logging)
13. [Rollback Procedures](#rollback-procedures)
14. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting deployment, ensure you have:

### Required Software
- **Node.js** 18.0.0 or higher (LTS recommended)
  ```bash
  node --version  # v18.0.0 or higher
  ```
- **npm** 8.0.0 or higher
  ```bash
  npm --version   # 8.0.0 or higher
  ```
- **Wrangler CLI** 3.0.0 or higher
  ```bash
  npm install -g wrangler
  wrangler --version
  ```

### Cloudflare Account Requirements
- Active Cloudflare account with Workers plan (Paid recommended for production)
- Domain `jclee.me` added to Cloudflare (with nameservers configured)
- Cloudflare API token with appropriate permissions:
  - Workers Scripts (read, write)
  - D1 (read, write)
  - KV (read, write)
  - R2 (read, write)
  - Workflows (read, write)
  - Analytics (read)

### Account Information
- **Account ID**: Available from Cloudflare dashboard → Account
- **Zone ID**: Available from Cloudflare dashboard → Domain Overview
- **API Token**: Create at https://dash.cloudflare.com/profile/api-tokens

### Project Files
- Clean checkout of this repository
- All dependencies installed (`npm install`)
- `wrangler.toml` configured with valid account ID

---

## Initial Setup

### Step 1: Cloudflare Account Verification

```bash
# Verify you have Wrangler authenticated
wrangler whoami

# Output should show your Cloudflare email and account name
```

If not authenticated, login with:
```bash
wrangler login
```

### Step 2: Verify Account ID

```bash
# Update wrangler.toml with your account ID
# Or set CLOUDFLARE_ACCOUNT_ID environment variable
export CLOUDFLARE_ACCOUNT_ID="your-account-id-here"

# Verify it's set correctly
echo $CLOUDFLARE_ACCOUNT_ID
```

### Step 3: Domain Configuration

Ensure domain `jclee.me` is:
1. Added to Cloudflare dashboard
2. Nameservers configured at domain registrar
3. Status shows "Active" in Cloudflare

Verify with:
```bash
# DNS should resolve through Cloudflare
dig jclee.me

# Should show Cloudflare nameservers:
# ns1.cloudflare.com
# ns2.cloudflare.com
# etc.
```

---

## Environment Configuration

Create environment-specific configuration files:

### Development Environment (`wrangler.toml`)

```toml
name = "job-dashboard"
account_id = "your-account-id"
workers_dev = true
compatibility_date = "2024-12-01"
env = "development"

[env.development]
routes = [
  { pattern = "resume.jclee.me/job/*", zone_id = "your-zone-id" }
]
```

### Production Environment

Edit `wrangler.toml` for production:

```toml
[env.production]
name = "job-dashboard-prod"
routes = [
  { pattern = "resume.jclee.me/job/*", zone_id = "your-zone-id" }
]

[env.production.env]
LOG_LEVEL = "warn"
NODE_ENV = "production"
```

### Staging Environment (Optional)

```toml
[env.staging]
name = "job-dashboard-staging"
routes = [
  { pattern = "staging.jclee.me/job/*", zone_id = "your-zone-id" }
]
```

---

## Secrets Management

Cloudflare Workers secrets are stored securely and unavailable to attackers. Manage them via Wrangler CLI:

### Required Secrets

#### 1. Slack Webhook URL

```bash
# Set the secret
wrangler secret put SLACK_WEBHOOK_URL --env production

# Paste your Slack webhook URL when prompted
# https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Verify it was set (shows name only, not value)
wrangler secret list --env production
```

#### 2. JWT Secret

```bash
# Generate a strong random secret
openssl rand -hex 32

# Set it
wrangler secret put JWT_SECRET --env production

# Paste the generated secret when prompted
```

#### 3. Webhook Secret

```bash
# Generate a random secret for webhook validation
openssl rand -hex 32

# Set it
wrangler secret put WEBHOOK_SECRET --env production
```

#### 4. Cloudflare API Token

```bash
# Set your Cloudflare API token
wrangler secret put CLOUDFLARE_API_TOKEN --env production

# Paste your API token when prompted
# (Used by MCP server to access Cloudflare APIs)
```

### Secrets for Development

For local development with `npx wrangler dev`, create a `.dev.vars` file:

```bash
# Create .dev.vars (DO NOT COMMIT)
cat > typescript/job-automation/workers/.dev.vars << 'SECRETEOF'
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
JWT_SECRET=your-dev-jwt-secret-here
WEBHOOK_SECRET=your-dev-webhook-secret-here
CLOUDFLARE_API_TOKEN=your-dev-api-token-here
LOG_LEVEL=debug
SECRETEOF

# Add to .gitignore
echo ".dev.vars" >> .gitignore
```

### Verify Secrets Are Set

```bash
# List all secrets (names only, not values)
wrangler secret list --env production

# Should output:
# CLOUDFLARE_API_TOKEN
# JWT_SECRET
# SLACK_WEBHOOK_URL
# WEBHOOK_SECRET
```

---

## D1 Database Setup

D1 is Cloudflare's SQL database. The worker requires one D1 database for persistent storage.

### Step 1: Create D1 Database

```bash
# Create database
wrangler d1 create job-dashboard-db

# Output will show:
# Database ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
# Binding name: DB (or customize)
```

**Save the Database ID** - you'll need it for configuration.

### Step 2: Update Configuration

Add D1 binding to `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "job-dashboard-db"
database_id = "c858dda6-b752-4e12-b60c-2886e9483cc7"  # Use your database ID
```

### Step 3: Initialize Database Schema

The database requires 3 tables. Create migrations:

```bash
# Create migrations directory
mkdir -p typescript/job-automation/workers/migrations

# Create initial schema migration
cat > typescript/job-automation/workers/migrations/0001_init.sql << 'SQLEOF'
-- Applications table
CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL,
  job_id TEXT NOT NULL,
  job_title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  applied_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  url TEXT,
  notes TEXT,
  UNIQUE(platform, job_id)
);

-- Job cache table (for deduplication)
CREATE TABLE IF NOT EXISTS job_cache (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL,
  job_id TEXT NOT NULL,
  job_title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  cached_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  UNIQUE(platform, job_id)
);

-- Sync logs table (for audit)
CREATE TABLE IF NOT EXISTS sync_logs (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL,
  sync_type TEXT NOT NULL,
  status TEXT,
  message TEXT,
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  rows_processed INTEGER DEFAULT 0
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_applications_platform ON applications(platform);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_applied_at ON applications(applied_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_cache_expires ON job_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_sync_logs_platform ON sync_logs(platform);
SQLEOF
```

### Step 4: Apply Migrations to Production

```bash
# For production database
wrangler d1 execute job-dashboard-db \
  --file typescript/job-automation/workers/migrations/0001_init.sql \
  --env production

# Output should confirm tables created
```

### Step 5: Verify Schema

```bash
# List all tables
wrangler d1 execute job-dashboard-db \
  --command "SELECT name FROM sqlite_master WHERE type='table';" \
  --env production

# Output should show:
# applications
# job_cache
# sync_logs
```

### Step 6: Test Database Connectivity

```bash
# Insert test row
wrangler d1 execute job-dashboard-db \
  --command "INSERT INTO applications (id, platform, job_id, job_title, company_name, applied_at, updated_at) VALUES ('test-1', 'wanted', 'job-123', 'Engineer', 'Company', 1000000, 1000000);" \
  --env production

# Query to verify
wrangler d1 execute job-dashboard-db \
  --command "SELECT COUNT(*) as count FROM applications;" \
  --env production

# Should return 1
```

---

## KV Namespace Creation

Cloudflare KV provides fast, replicated storage for sessions, rate limits, and tokens. The worker requires 3 KV namespaces.

### Step 1: Create SESSIONS Namespace

```bash
# Create namespace
wrangler kv:namespace create "SESSIONS" --preview false

# Output will show:
# 🌀 Creating namespace with title "job-dashboard-SESSIONS"
# ✨ Add the following binding to your wrangler.toml:
# [[kv_namespaces]]
# binding = "SESSIONS"
# id = "2b81b9b02dc34f518d2ca9552804bfef"

# Save the ID for wrangler.toml
```

### Step 2: Create RATE_LIMIT_KV Namespace

```bash
wrangler kv:namespace create "RATE_LIMIT_KV" --preview false

# Save ID: fe51b0f1c2c44841b4895e8747cb408a (or your generated ID)
```

### Step 3: Create NONCE_KV Namespace

```bash
wrangler kv:namespace create "NONCE_KV" --preview false

# Save ID: 3e282b1b906c474aadcc947a06f0c1ad (or your generated ID)
```

### Step 4: Update `wrangler.toml`

Add all KV bindings:

```toml
[[kv_namespaces]]
binding = "SESSIONS"
id = "2b81b9b02dc34f518d2ca9552804bfef"
preview_id = "SESSIONS-preview"

[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "fe51b0f1c2c44841b4895e8747cb408a"
preview_id = "RATE_LIMIT_KV-preview"

[[kv_namespaces]]
binding = "NONCE_KV"
id = "3e282b1b906c474aadcc947a06f0c1ad"
preview_id = "NONCE_KV-preview"
```

### Step 5: Test KV Access Locally

```bash
# Start local dev server
cd typescript/job-automation/workers
npx wrangler dev

# In another terminal, test KV
curl -X POST http://localhost:8787/api/test/kv-put \
  -H "Content-Type: application/json" \
  -d '{"key": "test", "value": "hello"}'

# Should return success
curl http://localhost:8787/api/test/kv-get?key=test
# Should return: {"value": "hello"}
```

---

## R2 Bucket Setup

R2 is Cloudflare's object storage. The worker stores screenshots and archives here.

### Step 1: Create R2 Bucket

```bash
# Create bucket
wrangler r2 bucket create job-screenshots --preview false

# Output will show bucket created
```

### Step 2: Update `wrangler.toml`

Add R2 bucket binding:

```toml
[[r2_buckets]]
binding = "SCREENSHOT_BUCKET"
bucket_name = "job-screenshots"
preview_bucket_name = "job-screenshots-preview"
```

### Step 3: Configure Bucket Policies

```bash
# List bucket contents
wrangler r2 bucket list job-screenshots

# Upload a test file
echo "test content" > test.txt
wrangler r2 object put job-screenshots/test.txt --file test.txt

# Verify upload
wrangler r2 object list job-screenshots

# Delete test file
wrangler r2 object delete job-screenshots/test.txt
```

### Step 4: Test R2 Access in Worker

Local testing with `npx wrangler dev` - R2 is available in miniflare.

---

## Additional Bindings

### Durable Objects Binding

For stateful browser automation, configure Durable Objects:

```toml
[[durable_objects.bindings]]
name = "BROWSER"
class_name = "BrowserDurableObject"
script_name = "job-dashboard"

[durable_objects]
migration_tag = "v1"
migrations = [{ tag = "v1", new_classes = ["BrowserDurableObject"] }]
```

### Service Bindings

For inter-worker communication (if using multiple workers):

```toml
[[services]]
binding = "MCP_SERVICE"
service = "job-mcp-server"
environment = "production"
```

---

## Workflows & Cron Configuration

Cloudflare Workflows enable scheduled and event-driven jobs. Update `wrangler.toml` with workflow definitions:

### Workflow Definitions

```toml
# Job crawling workflow (On-demand + scheduled)
[[workflows]]
name = "job-crawling-workflow"
main = "src/workflows/job-crawling.js"
binding = "JOB_CRAWLING"

# Application submission workflow
[[workflows]]
name = "application-workflow"
main = "src/workflows/application.js"
binding = "APPLICATION_WORKFLOW"

# Resume sync workflow
[[workflows]]
name = "resume-sync-workflow"
main = "src/workflows/resume-sync.js"
binding = "RESUME_SYNC_WORKFLOW"

# Daily report workflow
[[workflows]]
name = "daily-report-workflow"
main = "src/workflows/daily-report.js"
binding = "DAILY_REPORT_WORKFLOW"

# Health check workflow
[[workflows]]
name = "health-check-workflow"
main = "src/workflows/health-check.js"
binding = "HEALTH_CHECK_WORKFLOW"

# Backup workflow
[[workflows]]
name = "backup-workflow"
main = "src/workflows/backup.js"
binding = "BACKUP_WORKFLOW"

# Cleanup workflow
[[workflows]]
name = "cleanup-workflow"
main = "src/workflows/cleanup.js"
binding = "CLEANUP_WORKFLOW"
```

### Cron Triggers

Configure cron schedules in `wrangler.toml`:

```toml
[triggers]
crons = [
  "*/5 * * * *",      # Health check: every 5 minutes
  "0 0 * * 1-5",      # Job crawling: midnight Mon-Fri (UTC)
  "0 1 * * *",        # Resume sync: 01:00 UTC daily
  "0 3 * * *",        # Backup: 03:00 UTC daily
  "0 4 * * 0"         # Cleanup: 04:00 UTC Sunday
]
```

### Cron Schedule Reference

Convert UTC times to your timezone (e.g., KST = UTC+9):

| Cron Schedule | Frequency | UTC Time | KST Time (UTC+9) |
|---|---|---|---|
| `*/5 * * * *` | Every 5 min | 00:00, 00:05, ... | 09:00, 09:05, ... |
| `0 0 * * 1-5` | Mon-Fri | 00:00 | 09:00 |
| `0 1 * * *` | Daily | 01:00 | 10:00 |
| `0 3 * * *` | Daily | 03:00 | 12:00 |
| `0 4 * * 0` | Sunday | 04:00 | 13:00 |

---

## Deployment Steps

### Step 1: Pre-Deployment Checks

```bash
# Install all dependencies
npm install

# Navigate to worker directory
cd typescript/job-automation/workers

# Run TypeScript compilation check
npx tsc --noEmit

# Expected output: No errors
```

### Step 2: Local Testing

```bash
# Start local development server
npx wrangler dev

# Test health endpoint
curl http://localhost:8787/health

# Expected response:
# {"status": "ok", "timestamp": 1234567890}

# Test API endpoint
curl http://localhost:8787/api/stats

# Stop with Ctrl+C
```

### Step 3: Build for Deployment

```bash
# Build worker
npm run build

# Expected output:
# ✨ Build complete!
# Assets: ...
# Binding: ...
```

### Step 4: Deploy to Staging (Optional)

```bash
# Deploy to staging environment
wrangler deploy --config typescript/job-automation/workers/wrangler.toml --env staging

# Output will show:
# ✨ Uploaded job-dashboard-staging
# 🔗 https://job-dashboard-staging.jclee.me/job/*
```

### Step 5: Test Staging Deployment

```bash
# Test staging health
curl https://staging.jclee.me/job/health

# Test staging API
curl https://staging.jclee.me/job/api/stats

# Verify database connectivity
curl https://staging.jclee.me/job/api/test/db-connection
```

### Step 6: Deploy to Production

```bash
# Deploy to production
wrangler deploy --config typescript/job-automation/workers/wrangler.toml --env production

# Output will show:
# ✨ Uploaded job-dashboard
# 🔗 https://resume.jclee.me/job/*
```

### Step 7: Verify Production Deployment

```bash
# Test production health
curl https://resume.jclee.me/job/health

# Expected response:
# {"status": "ok", "timestamp": 1234567890}

# Test production API
curl https://resume.jclee.me/job/api/stats
```

---

## Post-Deployment Verification

Run these checks immediately after deployment:

### Step 1: Health Check

```bash
# Check worker is responding
curl https://resume.jclee.me/job/health

# Expected response:
# {
#   "status": "ok",
#   "timestamp": 1708000000,
#   "version": "1.0.0",
#   "uptime_seconds": 123
# }
```

### Step 2: Database Connectivity

```bash
# Test D1 connection
curl https://resume.jclee.me/job/api/test/db-connection

# Expected response:
# {"database": "connected", "tables": 3}
```

### Step 3: KV Connectivity

```bash
# Test KV access
curl -X POST https://resume.jclee.me/job/api/test/kv \
  -H "Content-Type: application/json" \
  -d '{"key": "test", "value": "deployment"}'

# Expected response:
# {"success": true, "key": "test"}
```

### Step 4: API Endpoints

```bash
# Test statistics endpoint
curl https://resume.jclee.me/job/api/stats

# Expected response:
# {
#   "total_applications": 42,
#   "pending": 15,
#   "applied": 25,
#   "rejected": 2,
#   "last_updated": 1708000000
# }

# Test applications list
curl https://resume.jclee.me/job/api/applications

# Expected response:
# {
#   "applications": [...],
#   "total": 42,
#   "page": 1
# }
```

### Step 5: Workflow Triggering

```bash
# Trigger health check workflow
curl -X POST https://resume.jclee.me/job/api/workflows/health-check-workflow/run \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Expected response:
# {"workflow_id": "workflow-123", "status": "started"}
```

### Step 6: Log Tailing

```bash
# View real-time logs
wrangler tail --env production

# Expected output:
# [2024-01-20 10:00:00] GET /health 200 12ms
# [2024-01-20 10:00:05] POST /api/stats 200 45ms
# [2024-01-20 10:00:10] GET /api/applications 200 78ms
```

---

## Monitoring & Logging

### Enable Analytics Engine

Analytics Engine captures custom metrics:

```bash
# Verify Analytics Engine is enabled
wrangler analytics-engine

# Should show: ✨ Analytics Engine connected
```

### Log Format (ECS - Elastic Common Schema)

All logs use ECS format for compatibility with Elasticsearch/Grafana:

```json
{
  "@timestamp": "2024-01-20T10:00:00Z",
  "http.request.method": "GET",
  "url.path": "/health",
  "http.response.status_code": 200,
  "http.response.body.bytes": 52,
  "event.duration": 12000000,
  "log.level": "info"
}
```

### View Logs in Dashboard

1. Navigate to Cloudflare dashboard
2. Go to Workers → your worker → Logs tab
3. Filter by date/time range
4. Search for error patterns

### Prometheus Metrics

Metrics endpoint: `/api/metrics`

```bash
curl https://resume.jclee.me/job/api/metrics

# Output (Prometheus format):
# http_requests_total{method="GET",status="200"} 1234
# http_request_duration_seconds_bucket{le="0.1"} 890
# database_operations_total{operation="select"} 456
```

### Set Up Grafana Dashboards

Create dashboards in Grafana to visualize:
- Request rate (requests/min)
- Error rate (errors/min)
- Response times (p50, p95, p99)
- Database query count
- KV operations
- Workflow execution time

---

## Rollback Procedures

If deployment causes issues, rollback quickly:

### Step 1: View Deployment History

```bash
# List recent deployments
wrangler deployments list

# Output:
# ID                    Created    Modified   Status
# abc123def456         2024-01-20 2024-01-20 active
# xyz789uvw012         2024-01-19 2024-01-20 deactivated
# qrs345tuv678         2024-01-18 2024-01-18 deactivated
```

### Step 2: Identify Previous Version

```bash
# Get details of previous deployment
wrangler deployments describe xyz789uvw012

# Shows: Date, version, Git commit, etc.
```

### Step 3: Rollback to Previous Version

```bash
# Rollback to previous deployment
wrangler rollback --deployment-id xyz789uvw012 --env production

# Output:
# ✨ Rolled back to deployment xyz789uvw012
# 🔗 https://resume.jclee.me/job/*
```

### Step 4: Verify Rollback Success

```bash
# Test health after rollback
curl https://resume.jclee.me/job/health

# Check logs
wrangler tail --env production

# Verify no errors in responses
```

### Step 5: Investigate Root Cause

After rollback, investigate the issue:

1. Check recent code changes
2. Review error logs from failed deployment
3. Test locally with same code
4. Fix the issue
5. Re-deploy with fix

---

## Troubleshooting

### Issue: "Database not found"

**Symptom**: `Error: Database job-dashboard-db not found`

**Solutions**:
1. Verify database ID in `wrangler.toml`:
   ```bash
   wrangler d1 list
   # Find correct ID and update wrangler.toml
   ```

2. Ensure database is created:
   ```bash
   wrangler d1 create job-dashboard-db
   ```

3. Run schema initialization:
   ```bash
   wrangler d1 execute job-dashboard-db \
     --file migrations/0001_init.sql
   ```

### Issue: "Port 8787 already in use"

**Symptom**: `Error: listen EADDRINUSE: address already in use :::8787`

**Solutions**:
```bash
# Find process using port 8787
lsof -i :8787

# Kill the process
kill -9 <PID>

# Or use different port
wrangler dev --port 8788
```

### Issue: "KV namespace not found"

**Symptom**: `Error: Namespace SESSIONS not found`

**Solutions**:
1. Verify KV binding in `wrangler.toml`:
   ```toml
   [[kv_namespaces]]
   binding = "SESSIONS"
   id = "2b81b9b02dc34f518d2ca9552804bfef"
   ```

2. Create missing namespace:
   ```bash
   wrangler kv:namespace create "SESSIONS"
   ```

3. Verify namespace exists:
   ```bash
   wrangler kv:namespace list
   ```

### Issue: "Unauthorized - Invalid token"

**Symptom**: `Error: Unauthorized - Authentication failed`

**Solutions**:
1. Verify JWT secret is set:
   ```bash
   wrangler secret list --env production
   # Should show JWT_SECRET
   ```

2. Regenerate JWT token:
   ```bash
   # Use login endpoint to get new token
   curl -X POST https://resume.jclee.me/job/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username": "admin", "password": "..."}'
   ```

3. Check token expiration:
   ```bash
   # Tokens expire after 24 hours
   # Get new token or refresh existing one
   ```

### Issue: "CORS error: origin not allowed"

**Symptom**: `Error: CORS policy: response has invalid Access-Control-Allow-Origin`

**Solutions**:
1. Verify CORS configuration:
   ```javascript
   // In worker code
   const allowedOrigins = ['resume.jclee.me', '*.jclee.me'];
   ```

2. Update CORS headers:
   ```javascript
   response.headers.set('Access-Control-Allow-Origin', '*');
   response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
   ```

3. Test CORS:
   ```bash
   curl -H "Origin: https://resume.jclee.me" \
     https://resume.jclee.me/job/api/stats -v
   # Check response headers for Access-Control-Allow-Origin
   ```

### Issue: "Workflow not triggering on schedule"

**Symptom**: Cron jobs not executing at scheduled times

**Solutions**:
1. Verify cron schedule in `wrangler.toml`:
   ```toml
   [triggers]
   crons = ["0 0 * * *"]  # Midnight UTC
   ```

2. Check cron syntax (5 fields: minute, hour, day, month, day-of-week)

3. Convert UTC to your timezone:
   ```
   UTC: 0 0 * * * (midnight UTC)
   KST: 0 9 * * * (9 AM KST = midnight UTC + 9 hours)
   ```

4. View workflow execution logs:
   ```bash
   wrangler tail --env production
   # Filter for workflow execution logs
   ```

### Issue: "Rate limit exceeded: 429 Too Many Requests"

**Symptom**: `Error: 429 Too Many Requests - Rate limit exceeded`

**Solutions**:
1. Check rate limit configuration:
   - Default: 60 requests per minute per IP
   - Stored in RATE_LIMIT_KV with 60-second TTL

2. Adjust rate limit (in code):
   ```javascript
   const RATE_LIMIT = 100; // Change to 100 req/min
   ```

3. Wait for rate limit reset:
   - Automatic reset after 60 seconds
   - Or clear manually:
   ```bash
   wrangler kv:key delete RATE_LIMIT_KV:ip-address
   ```

### Issue: "Unable to read secrets"

**Symptom**: `Error: Secrets not available in worker context`

**Solutions**:
1. Ensure secrets are set:
   ```bash
   wrangler secret list --env production
   ```

2. Use correct secret name in code:
   ```javascript
   const secret = env.JWT_SECRET;  // Correct
   const secret = env.jwt_secret;  // Wrong - case sensitive
   ```

3. For local development, create `.dev.vars`:
   ```bash
   cat > .dev.vars << 'EOF'
   JWT_SECRET=your-test-secret
   EOF
   ```

### Issue: "Worker exceeds memory limit"

**Symptom**: `Error: Worker exceeded memory limit (128 MB)`

**Solutions**:
1. Reduce data processing in single request
2. Use streaming for large files:
   ```javascript
   return new Response(stream, { headers: { 'Content-Length': size } });
   ```

3. Optimize KV operations:
   - Batch multiple operations
   - Reduce payload size

4. Profile memory usage:
   ```bash
   wrangler dev --inspect
   # Use Chrome DevTools to profile
   ```

---

## Deployment Checklist

Before deploying to production:

- [ ] All secrets set (`wrangler secret list`)
- [ ] D1 database created and schema applied
- [ ] KV namespaces created and tested
- [ ] R2 bucket created
- [ ] Workflows defined in `wrangler.toml`
- [ ] Cron schedules configured (with UTC times)
- [ ] Local tests passing (`npm test`)
- [ ] TypeScript compilation clean (`tsc --noEmit`)
- [ ] Code reviewed and approved
- [ ] Staging deployment successful
- [ ] Staging endpoints tested
- [ ] Rollback plan documented
- [ ] Team notified of deployment window
- [ ] Database backups created
- [ ] Monitoring dashboards ready

---

## Support & Troubleshooting

### Get Help

1. Check [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
2. Review [AGENTS.md](./AGENTS.md) for architecture details
3. Check [API_REFERENCE.md](./API_REFERENCE.md) for endpoint details
4. Review worker logs: `wrangler tail --env production`

### Report Issues

If you encounter issues:
1. Check this troubleshooting section
2. Review Cloudflare dashboard for service status
3. Check worker logs for errors
4. Create detailed issue with logs and steps to reproduce

### Additional Resources

- [README.md](./README.md) - Quick start guide
- [API_REFERENCE.md](./API_REFERENCE.md) - Complete API documentation
- [DIAGRAMS.md](./DIAGRAMS.md) - Architecture diagrams
- [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) - Local development setup
