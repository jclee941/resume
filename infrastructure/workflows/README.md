# n8n Workflows for resume.jclee.me Monitoring

## 📦 Available Workflows

### 1. Site Health Monitor (`01-site-health-monitor.json`)

**Purpose**: Monitor resume.jclee.me every 5 minutes and alert on failures

**Features**:

- ✅ Automated health checks via `/health` endpoint
- ✅ Telegram alerts on downtime via Telegram Bot API
- ✅ Google Sheets logging (separate sheets for downtime/healthy status)
- ✅ Configurable retry logic (3 attempts, 10s timeout)

**Nodes**:

1. Schedule Trigger (Every 5 minutes)
2. HTTP Request → `GET https://resume.jclee.me/health`
3. IF → Check if status !== "healthy"
4. Telegram Bot API → Send Telegram alert (downtime branch)
5. Google Sheets → Log downtime event
6. Google Sheets → Log healthy status

**Expected Metrics** (1 month):

- Health checks: ~8,640 (288/day × 30)
- Average uptime: >99.9%
- Alerts: <5 (if well-maintained)

---

### 2. GitHub Deployment Webhook (`02-github-deployment-webhook.json`)

**Purpose**: Receive GitHub Actions deployment notifications

**Features**:

- ✅ Webhook endpoint: `POST /webhook/resume-deploy`
- ✅ Telegram deployment notifications via Telegram Bot API
- ✅ Loki logging for centralized observability
- ✅ Google Sheets deployment history

**Nodes**:

1. Webhook Trigger → `/resume-deploy`
2. Set → Extract deployment data
3. Telegram Bot API → Send Telegram notification
4. HTTP Request → Log to Loki
5. Google Sheets → Deployment history

**GitHub Actions Integration**:
See updated `.github/workflows/deploy.yml/deploy.yml` (lines 149-180)

**Webhook Payload**:

```json
{
  "commit_sha": "7ae6deb",
  "commit_message": "fix(csp): add style hash",
  "author": "jclee",
  "deployed_at": "2025-11-18T23:30:00Z",
  "status": "success",
  "workflow_run_id": "12345678",
  "repository": "qws941/resume",
  "branch": "master"
}
```

---

## 🚀 Quick Start

### Prerequisites

Before importing workflows, you must configure them with your actual values.

**Option 1: Automated Configuration** (Recommended)

```bash
# 1. Create config.json from example
cp n8n-workflows/config.example.json n8n-workflows/config.json

# 2. Edit config.json with your values
vim n8n-workflows/config.json
# Required values:
# - telegram.bot_token (e.g., 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11)
# - telegram.chat_id (e.g., 123456789)
# - telegram.bot_token (from 1Password homelab vault)
# - google_sheets.spreadsheet_id (44 characters)

# 3. Generate configured workflows
node scripts/setup/configure-n8n-workflows.js

# 4. Configured workflows will be in: n8n-workflows/configured/
```

**Option 2: Manual Configuration**

1. Copy `config.example.json` to `config.json`
2. Manually edit workflow JSON files with your channel IDs and spreadsheet ID
3. Import directly to n8n

---

### Step 1: Import Workflows to n8n

1. **Access n8n**: https://n8n.jclee.me
2. **Import configured workflows**:
   - Go to Workflows → Import from File
   - Upload `n8n-workflows/configured/01-site-health-monitor.json`
   - Upload `n8n-workflows/configured/02-github-deployment-webhook.json`

**Note**: If using manual configuration, upload from `n8n-workflows/` instead of `configured/`

### Step 2: Configure Credentials

**Required Credentials**:

| Service       | Credential Type | Usage                  |
| ------------- | --------------- | ---------------------- |
| Telegram Bot API | Header API Key  | Alerts & notifications |
| Google Sheets | OAuth2          | Data logging           |

**Setup Instructions**:

1. **Telegram Bot API**:
   - Go to n8n → Credentials → New → Header Auth
   - Name: apikey, Value: YOUR_API_KEY
   - Test connection: Send test Telegram message

2. **Google Sheets OAuth2**:
   - Go to n8n → Credentials → New → Google Sheets OAuth2 API
   - Click "Connect my account" → Authorize
   - Create spreadsheet: "Resume Monitoring"
   - Create sheets: "Downtime Log", "Health Log", "Deployment Log"

### Step 3: Update Workflow Parameters

**01-site-health-monitor.json**:

```javascript
// Node: Send Telegram Alert (Telegram Bot API)
chat_id: '123456789'; // Replace with your Telegram chat ID

// Node: Log Downtime Event
documentId: 'GOOGLE_SHEET_ID'; // Replace with your spreadsheet ID
sheetName: 'Downtime Log'; // Sheet gid=0

// Node: Log Healthy Status
documentId: 'GOOGLE_SHEET_ID'; // Same spreadsheet
sheetName: 'Health Log'; // Sheet gid=1
```

**02-github-deployment-webhook.json**:

```javascript
// Node: Send Telegram Notification (Telegram Bot API)
chat_id: '123456789'; // Replace with your Telegram chat ID

// Node: Log Deployment
documentId: 'GOOGLE_SHEET_ID'; // Same spreadsheet
sheetName: 'Deployment Log'; // Sheet gid=2
```

### Step 4: Configure GitHub Secret

1. **Get n8n webhook URL**:
   - Open `02-github-deployment-webhook.json` in n8n
   - Copy webhook URL: `https://n8n.jclee.me/webhook/resume-deploy`

2. **Add GitHub secret**:

   ```bash
   # GitHub Repository → Settings → Secrets and variables → Actions
   # New repository secret:
   Name: N8N_WEBHOOK_URL
   Value: https://n8n.jclee.me/webhook/resume-deploy
   ```

3. **Verify integration**:
   ```bash
   # Test webhook manually
   curl -X POST https://n8n.jclee.me/webhook/resume-deploy \
     -H "Content-Type: application/json" \
     -d '{
       "commit_sha": "test123",
       "commit_message": "Test webhook",
       "author": "OpenCode",
       "deployed_at": "2025-11-18T23:30:00Z",
       "status": "success",
       "workflow_run_id": "12345",
       "repository": "qws941/resume",
       "branch": "master"
     }'
   ```

### Step 5: Activate Workflows

1. **Site Health Monitor**:
   - Open workflow in n8n
   - Click "Active" toggle (top-right)
   - Verify: Check Telegram for test message within 5 minutes

2. **GitHub Deployment Webhook**:
   - Open workflow in n8n
   - Click "Active" toggle
   - Verify: Push a commit to master → Check Telegram

---

## 📊 Google Sheets Schema

### Sheet 1: Downtime Log (gid=0)

| Column         | Type     | Example                  |
| -------------- | -------- | ------------------------ |
| Timestamp      | ISO 8601 | 2025-11-18T23:30:00.000Z |
| Status         | String   | DOWN / unhealthy         |
| Uptime         | Number   | 0 (seconds)              |
| Requests Total | Number   | 0                        |
| Errors         | Number   | 0                        |
| Alert Sent     | String   | Yes                      |

### Sheet 2: Health Log (gid=1)

| Column         | Type     | Example                  |
| -------------- | -------- | ------------------------ |
| Timestamp      | ISO 8601 | 2025-11-18T23:30:00.000Z |
| Status         | String   | healthy                  |
| Uptime         | Number   | 53071 (seconds)          |
| Requests Total | Number   | 1                        |
| Success        | Number   | 0                        |
| Errors         | Number   | 0                        |
| Alert Sent     | String   | No                       |

### Sheet 3: Deployment Log (gid=2)

| Column       | Type     | Example                  |
| ------------ | -------- | ------------------------ |
| Timestamp    | ISO 8601 | 2025-11-18T23:30:00.000Z |
| Commit SHA   | String   | 7ae6deb                  |
| Message      | String   | fix(csp): add style hash |
| Author       | String   | jclee                    |
| Status       | String   | success                  |
| Workflow Run | String   | 12345678                 |

---

## 🧪 Testing

### Test Workflow 1 (Health Monitor)

```bash
# Simulate downtime (modify worker.js temporarily)
cd ~/apps/resume/apps/portfolio
# Edit worker.js: Change status "healthy" → "down"
npm run deploy

# Wait 5 minutes
# Expected: Telegram alert via Telegram Bot API + Google Sheets log

# Restore
git checkout apps/portfolio/worker.js
npm run deploy
```

### Test Workflow 2 (Deployment Webhook)

```bash
# Manual webhook test
curl -X POST https://n8n.jclee.me/webhook/resume-deploy \
  -H "Content-Type: application/json" \
  -d '{
    "commit_sha": "test123",
    "commit_message": "Test deployment notification",
    "author": "Test User",
    "deployed_at": "2025-11-18T23:30:00Z",
    "status": "success",
    "workflow_run_id": "99999",
    "repository": "qws941/resume",
    "branch": "master"
  }'

# Expected:
# Expected:
# - Telegram message via Telegram Bot API
# - Loki log entry (check Grafana)

# Automatic test via GitHub Actions
git commit --allow-empty -m "test: n8n webhook integration"
git push origin master

# Expected:
# - GitHub Actions runs successfully
# - n8n webhook triggered
# - All 3 outputs logged
```

---

## 🔧 Troubleshooting

### Issue: Workflow not executing

**Check**:

1. Workflow is activated (toggle is ON)
2. Schedule Trigger is configured correctly
3. Check n8n executions log: Workflows → [Workflow Name] → Executions

**Solution**:

```bash
# Manually trigger workflow
# In n8n: Open workflow → Click "Test workflow"
```

### Issue: Telegram notifications not sending

**Check**:

1. Telegram Bot API credential is connected
2. Telegram chat_id is correct
3. Bot token is valid

**Solution**:

```bash
# Get channel ID
# Check TELEGRAM_CHAT_ID in n8n environment

# Test credential
# n8n → Credentials → Telegram API Header Auth → Test
```

### Issue: Google Sheets not logging

**Check**:

1. Google Sheets OAuth2 credential is connected
2. Spreadsheet ID is correct
3. Sheet names match exactly (case-sensitive)

**Solution**:

```bash
# Get spreadsheet ID from URL
# https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
#                                       ^^^^^^^^^^^^^^^^

# Verify sheet names
# Google Sheets → Bottom tabs → Right-click → "gid=0" is first sheet
```

### Issue: GitHub webhook not triggering

**Check**:

1. `N8N_WEBHOOK_URL` secret is set in GitHub
2. Webhook URL is accessible (public endpoint)
3. GitHub Actions step runs successfully

**Solution**:

```bash
# Test webhook manually first
curl -X POST https://n8n.jclee.me/webhook/resume-deploy \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Check n8n executions
# n8n → Workflows → GitHub Deployment Webhook → Executions

# Check GitHub Actions logs
# GitHub → Actions → Latest workflow run → "Notify n8n Webhook" step
```

---

## 📈 Monitoring Dashboard (Grafana)

**Planned Dashboard**: https://grafana.jclee.me/d/resume

**Panels**:

1. **Uptime %** (from Google Sheets Health Log)
2. **Response Time Trend** (from /metrics endpoint)
3. **Deployment Frequency** (from Deployment Log)
4. **Error Rate** (from requests_error metric)
5. **Web Vitals** (LCP/FID/CLS - future workflow)

**Data Sources**:

- Google Sheets (via Grafana Google Sheets plugin)
- Loki (deployment logs)
- Prometheus (metrics endpoint)

---

## 🔗 Resources

- **n8n Documentation**: https://docs.n8n.io
- **n8n Server**: https://n8n.jclee.me
- **Grafana Dashboard**: https://grafana.jclee.me
- **Loki Logs**: https://loki.jclee.me
- **Resume Site**: https://resume.jclee.me

**Related Documentation**:

- `docs/N8N-MONITORING-WORKFLOWS.md` - Detailed workflow guide
- `.github/workflows/deploy.yml/deploy.yml` - GitHub Actions integration
- `apps/portfolio/generate-worker.js` - Worker build script

---

**Last Updated**: 2025-11-18 23:30 KST
**Version**: 1.0.0
**Author**: jclee (via OpenCode automation)
