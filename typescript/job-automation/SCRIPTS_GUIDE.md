# Job Automation Scripts Guide

This guide documents all 26 scripts (25 .js + 1 .sh) in the `scripts/` directory. Scripts are organized by category (Authentication, Session Management, Utility) with usage examples, security considerations, and recommended approaches.

**Last Updated**: 2026-02-11  
**Total Scripts**: 26 (25 .js + 1 .sh)

---

## Quick Reference

| Script                     | Category      | Status    | Recommended | Purpose                                            |
| -------------------------- | ------------- | --------- | ----------- | -------------------------------------------------- |
| `extract-cookies-cdp.js`   | Auth          | ✅ Active | **YES**     | Extract cookies via Chrome DevTools Protocol       |
| `auth-sync.js`             | Auth          | ✅ Active | **YES**     | Multi-platform auth sync (automated + manual)      |
| `auth-persistent.js`       | Auth          | ✅ Active | **YES**     | Persistent auth with browser UI                    |
| `profile-sync/`            | Sync          | ✅ Active | **YES**     | Sync resume_data.json to job platforms (8 modules) |
| `auto-all.js`              | Orchestration | ✅ Active | **YES**     | Run all automation tasks in sequence               |
| `skill-tag-map.js`         | Utility       | ✅ Active | YES         | Map SSOT skills to platform skill tags             |
| `metrics-exporter.js`      | Monitoring    | ✅ Active | YES         | Export application metrics to Prometheus           |
| `import-cookies-manual.js` | Session       | ⚠️ Manual | NO          | Manually import cookies from file                  |
| `get-cookies.js`           | Session       | ⚠️ Manual | NO          | Get cookies from Chrome user data dir              |

---

## Authentication Scripts

### 1. `extract-cookies-cdp.js` ⭐ RECOMMENDED

**Status**: Active | **Type**: Automated | **Recommended**: YES  
**Requires**: Chrome running with `--remote-debugging-port=9222`

Extracts cookies via Chrome DevTools Protocol (CDP) - the fastest and most reliable method. Avoids Puppeteer/Playwright overhead and WAF detection.

**Usage**:

```bash
# Start Chrome with DevTools enabled
google-chrome --remote-debugging-port=9222 &

# Extract cookies for all platforms
node scripts/extract-cookies-cdp.js

# Extract for specific platforms
node scripts/extract-cookies-cdp.js wanted jobkorea

# Manual WebSocket endpoint
node scripts/extract-cookies-cdp.js --ws-url ws://localhost:9222/...
```

**Environment Variables**:

- `CHROME_DEBUG_PORT` - Chrome DevTools port (default: 9222)

**Supported Platforms**: wanted, jobkorea, remember, saramin, linkedin

**Why Use This**:

- ✅ Fastest cookie extraction method
- ✅ No Puppeteer/Playwright overhead
- ✅ Bypasses WAF detection
- ✅ Works with existing Chrome instances
- ✅ Recommended for production use

**Security Notes**:

- Requires Chrome already running with debugging enabled
- Cookies stored at `~/.opencode/data/sessions.json`
- 24-hour TTL per platform
- No credentials logged to console

---

### 2. `auth-sync.js` ⭐ RECOMMENDED

**Status**: Active | **Type**: Hybrid (automated + manual) | **Recommended**: YES

Multi-platform authentication sync. Handles both automated login (Wanted) and manual Google OAuth (JobKorea/Saramin).

**Usage**:

```bash
# Sync all platforms (interactive - manual for JobKorea/Saramin)
node scripts/auth-sync.js

# Sync specific platform only
node scripts/auth-sync.js --platform wanted     # Automated
node scripts/auth-sync.js --platform jobkorea   # Opens browser

# Headless mode (Wanted only)
node scripts/auth-sync.js --headless

# Sync existing sessions without authentication
node scripts/auth-sync.js --sync-only

# Send to Worker for distribution
node scripts/auth-sync.js --sync-worker
```

**Environment Variables**:

- `WANTED_EMAIL` - Wanted account email (for automated login)
- `WANTED_PASSWORD` - Wanted account password
- `GOOGLE_EMAIL` - Google account email (for JobKorea/Saramin)
- `GOOGLE_PASSWORD` - Google account password
- `JOB_WORKER_URL` - Worker URL (default: https://resume.jclee.me/job)
- `AUTH_SYNC_SECRET` - Secret for sync endpoint

**Supported Platforms**: wanted (automated), jobkorea (manual), saramin (manual)

**Workflow**:

1. **Wanted** → Direct email/password login (automated)
2. **JobKorea** → Browser opens for manual Google OAuth (blocks automation)
3. **Saramin** → Browser opens for manual Google OAuth (blocks automation)
4. **Sync** → Send cookies to Worker via secure endpoint

**Why Use This**:

- ✅ All-in-one multi-platform auth
- ✅ Handles both automated and manual flows
- ✅ Syncs to Worker automatically
- ✅ Uses puppeteer-extra + stealth plugins
- ✅ Fallback to manual login if automation blocked

**Security Notes**:

- Credentials from environment variables only
- Never hard-coded in source
- Sessions stored locally before sync
- Worker endpoint requires AUTH_SYNC_SECRET
- Stealth plugins active to minimize detection

---

### 3. `auth-persistent.js` ⭐ RECOMMENDED

**Status**: Active | **Type**: Persistent UI | **Recommended**: YES

Long-running authentication script with persistent browser UI. Best for keeping sessions fresh over extended periods.

**Usage**:

```bash
# Start persistent auth
node scripts/auth-persistent.js

# Specific platform only
node scripts/auth-persistent.js --platform wanted

# Headless (worker in background)
node scripts/auth-persistent.js --headless

# Auto-refresh every N hours
node scripts/auth-persistent.js --refresh 24

# Sync to Worker after auth
node scripts/auth-persistent.js --sync-worker
```

**Environment Variables**: Same as `auth-sync.js`

**Features**:

- Long-running process with browser UI
- Automatic cookie refresh on interval
- Real-time session status display
- Graceful shutdown on Ctrl+C
- Works with Cloudflare Worker integration

**Why Use This**:

- ✅ Keep sessions fresh indefinitely
- ✅ Monitor auth status in real-time
- ✅ Ideal for background task
- ✅ Integrated with Worker sync
- ✅ Handles session expiration gracefully

**Security Notes**:

- Can run as background daemon
- Logs only non-sensitive info
- Credentials from environment only
- Sessions stored securely in ~/.opencode/data

---

### 4. `quick-login.js` ⚠️ LEGACY

**Status**: Legacy | **Type**: Puppeteer | **Recommended**: NO

Older Puppeteer-based login. Slower and more bot-detection vulnerable than CDP approach. Keep for backwards compatibility.

**Usage**:

```bash
# Start headless login
node scripts/quick-login.js
```

**Environment Variables**:

- `WANTED_EMAIL`
- `WANTED_PASSWORD`
- `.env` file (fallback)

**Issues**:

- ❌ Slower than CDP method
- ❌ Higher bot-detection risk
- ❌ Lacks stealth plugins
- ❌ Puppeteer overhead (150MB+)

**Migration Path**: Use `extract-cookies-cdp.js` instead.

---

## Session Management Scripts

### 5. `import-cookies-manual.js` ⚠️ LEGACY

**Status**: Manual | **Type**: File import | **Recommended**: NO

Manually import cookies from file. Useful for emergency recovery only.

**Usage**:

```bash
# Import from file
node scripts/import-cookies-manual.js --file cookies.json

# Import and sync to Worker
node scripts/import-cookies-manual.js --file cookies.json --sync-worker
```

**File Format**:

```json
{
  "wanted": [{ "name": "...", "value": "...", "domain": "wanted.co.kr", "path": "/" }]
}
```

---

### 6. `get-cookies.js` ⚠️ LEGACY

**Status**: Manual | **Type**: Browser extraction | **Recommended**: NO

Extract cookies from Chrome user data directory. Requires Chrome to be closed.

**Usage**:

```bash
# Extract from Chrome profile
node scripts/get-cookies.js

# Specific profile
node scripts/get-cookies.js --profile "Default"
```

**Requirements**:

- Chrome must be completely closed
- Read access to ~/.config/google-chrome (or equivalent)

---

## Monitoring Scripts

### 7. `metrics-exporter.js` ⭐ RECOMMENDED

**Status**: Active | **Type**: Prometheus exporter | **Recommended**: YES

Export application metrics to Prometheus. Runs as background daemon.

**Usage**:

```bash
# Start metrics exporter
node scripts/metrics-exporter.js

# Specific port
node scripts/metrics-exporter.js --port 9090

# Metrics endpoint
curl http://localhost:9090/metrics
```

**Exported Metrics**:

- `job_automation_applications_total` - Total applications submitted
- `job_automation_matches_score` - Average skill match score
- `job_automation_errors_total` - Error count by type
- `job_automation_sync_duration_seconds` - Profile sync duration
- `job_automation_auth_expiry_hours` - Time until session expiry
- `job_automation_uptime_seconds` - Uptime since startup

**Why Use This**:

- ✅ Real-time metrics visibility
- ✅ Prometheus-compatible format
- ✅ Slack alert integration
- ✅ Historical trend analysis
- ✅ SLA monitoring

---

## Recommended Workflow

### Initial Setup

```bash
# 1. Extract cookies (first time)
CHROME_DEBUG_PORT=9222 node scripts/extract-cookies-cdp.js

# 2. Sync auth to Worker
node scripts/auth-sync.js --sync-worker
```

### Daily Maintenance

```bash
# Run full automation pipeline
node scripts/auto-all.js --all
```

---

## Legacy Scripts

The following scripts are legacy attempts or experiments. **Do not use in production**.

- `extract-cookies.js` - Puppeteer extraction (slow, use CDP)
- `extract-cookies-from-profile.js` - Chrome profile extraction
- `extract-cookies-sqlite.js` - Chrome SQLite extraction
- `extract-cookies-playwright.js` - Playwright extraction
- `auto-login.js` - First login attempt
- `direct-login*.js` (v1-v4) - Login iterations
- `wanted-login-v5.js` - Wanted-specific variant
- `email-login.js` - Email-based flow
- `google-oauth-login.js` - Google OAuth (blocked)
- `cookie-inject.js` - Cookie context injection
- `debug-login.js` - Debug script
- `extract-token-debug.js` - Token debugging
- `extract-cookies-from-chrome.sh` - Shell script (deprecated)

---

## Security Considerations

### General Rules

1. **Never hard-code credentials** - Always use environment variables
2. **No credentials in logs** - Use ECS logging format (no plaintext passwords)
3. **Session storage** - Cookies stored at `~/.opencode/data/sessions.json` (24h TTL)
4. **Per-platform isolation** - Each platform has separate session store
5. **No cross-script imports** - Each script is independent

### Best Practices

✅ **DO**:

- Use environment variables for credentials
- Run scripts with least privilege
- Monitor Slack alerts for failures
- Keep scripts updated from main branch
- Test with dry-run before applying changes

❌ **DON'T**:

- Commit .env files to git
- Run untested scripts in production
- Use legacy scripts (v1-v4)
- Mix old and new auth methods
- Hardcode API keys

---

## Quick Command Reference

```bash
# Core Commands
extract-cookies         CHROME_DEBUG_PORT=9222 node scripts/extract-cookies-cdp.js
auth-sync              node scripts/auth-sync.js
auth-persistent        node scripts/auth-persistent.js
profile-sync-dry-run   node scripts/profile-sync/index.js
profile-sync-apply     node scripts/profile-sync/index.js --apply
auto-all-pipeline      node scripts/auto-all.js --all
metrics-export         node scripts/metrics-exporter.js
skill-mapping          node scripts/skill-tag-map.js
```
