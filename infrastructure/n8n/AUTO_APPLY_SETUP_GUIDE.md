# Auto-Apply n8n + Telegram Setup Guide

**Purpose**: Enable automatic job applications via n8n workflow with Telegram notifications

**Status**: Ready to deploy  
**Last Updated**: 2026-04-06

---

## Overview

This setup automates the resume job application process using:

- **n8n Workflow**: Schedules and orchestrates auto-apply runs
- **Job Server API**: Executes the actual applications
- **Telegram Bot**: Sends notifications for success/failure

### Architecture

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   n8n        │───▶│  Job Server  │───▶│  Job Sites   │───▶│  Telegram    │
│  Scheduler   │    │  Auto-Apply  │    │ (Wanted, etc)│    │  Notifications│
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
   Daily 9am           POST /api/           Apply to          Send results
   KST                 auto-apply/run       matching jobs
```

---

## Prerequisites

### 1. n8n API Key

Get your n8n API key:

1. Open https://n8n.jclee.me
2. Go to **Settings** → **API**
3. Create new API key
4. Copy the key (shown only once)

### 2. Cloudflare Access Credentials (if using public URL)

If accessing `https://n8n.jclee.me`:

```bash
export CF_ACCESS_CLIENT_ID="your-client-id@your-account.cloudflareaccess.com"
export CF_ACCESS_CLIENT_SECRET="your-client-secret"
```

**Alternative**: Use SSH tunnel to bypass Cloudflare Access:

```bash
ssh -f -N -L 15678:192.168.50.100:5678 root@192.168.50.100
export N8N_URL="http://localhost:15678"
```

### 3. Job Server Credentials

The workflow uses these environment variables in n8n:

- `JOB_SERVER_URL`: Base URL of job automation server (e.g., `http://localhost:3456`)
- `JOB_SERVER_ADMIN_TOKEN`: Bearer token for API authentication

Set these in n8n: **Settings** → **Variables**

### 4. Telegram Bot (Already Configured)

The `telegram-notifier` workflow (`PV5yLgHNzNSlCmRT`) handles notifications:

- Bot token stored in n8n credentials (1Password `homelab` vault)
- Sends formatted notifications automatically

---

## Deployment Steps

### Step 1: Set Environment Variables

```bash
export N8N_API_KEY="your-n8n-api-key"
export N8N_URL="https://n8n.jclee.me"  # Or http://localhost:15678 if using SSH tunnel

# Optional: Cloudflare Access
export CF_ACCESS_CLIENT_ID="..."
export CF_ACCESS_CLIENT_SECRET="..."
```

### Step 2: Deploy Workflow

**Option A: Using the activation script (Recommended)**

```bash
cd /home/jclee/dev/resume
./infrastructure/n8n/activate-auto-apply.sh
```

**Option B: Using Go deployment tool**

```bash
cd /home/jclee/dev/resume
go run infrastructure/n8n/deploy-auto-apply.go
```

**Option C: Using curl directly**

```bash
cd /home/jclee/dev/resume

# Deploy workflow
curl -X POST "${N8N_URL}/api/v1/workflows" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
  -H "Content-Type: application/json" \
  -d @infrastructure/n8n/job-auto-apply-workflow.json

# Activate workflow
curl -X PATCH "${N8N_URL}/api/v1/workflows/DRHg9pwanv4pHGxV" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"active": true}'
```

### Step 3: Verify Deployment

Check workflow status:

```bash
curl -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
  "${N8N_URL}/api/v1/workflows/DRHg9pwanv4pHGxV" | jq
```

Expected output:

```json
{
  "id": "DRHg9pwanv4pHGxV",
  "name": "job-auto-apply",
  "active": true,
  ...
}
```

### Step 4: Configure n8n Environment Variables

In n8n web UI:

1. Go to **Settings** → **Variables**
2. Add:
   - `JOB_SERVER_URL`: `http://localhost:3456` (or your job-server URL)
   - `JOB_SERVER_ADMIN_TOKEN`: Your admin bearer token
3. Save

---

## Workflow Details

### Schedule

- **Frequency**: Daily at 9:00 AM KST (Asia/Seoul timezone)
- **Cron Expression**: `0 9 * * *`
- **Next Run**: Check n8n UI for exact time

### Process Flow

```
1. Daily Schedule Trigger (9:00 AM KST)
         ↓
2. POST /api/auto-apply/run
   Body: {
     dryRun: false,
     maxApplications: 10,
     platforms: ['wanted', 'jobkorea', 'saramin'],
     keywords: ['시니어 엔지니어', '클라우드 엔지니어', 'SRE', 'DevOps']
   }
         ↓
3. Wait 30 seconds
         ↓
4. Poll Status (GET /api/auto-apply/status)
   ├─ If completed → Format result → Telegram notification
   ├─ If failed → Format error → Telegram notification
   └─ If running → Wait 30s → Poll again (max 40 times = ~20 min)
         ↓
5. Telegram Notification via telegram-notifier workflow
```

### Timeout Protection

- **Max Polls**: 40 attempts
- **Poll Interval**: 30 seconds
- **Max Duration**: ~20 minutes
- **Timeout Action**: Send timeout notification to Telegram

---

## Testing

### Test 1: Dry Run (Safe)

Modify the workflow temporarily for testing:

1. Open workflow in n8n UI
2. Edit "Trigger Auto-Apply" node
3. Change `jsonBody` to: `{"dryRun": true, "maxApplications": 3}`
4. Execute workflow manually
5. Check Telegram for "dry-run" notification

### Test 2: Manual Trigger

Execute workflow manually in n8n:

1. Open https://n8n.jclee.me/workflow/DRHg9pwanv4pHGxV
2. Click "Execute Workflow"
3. Monitor execution in real-time
4. Check Telegram notification

### Test 3: Check Recent Executions

```bash
# List recent executions
curl -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
  "${N8N_URL}/api/v1/executions?workflowId=DRHg9pwanv4pHGxV" | jq
```

---

## Monitoring

### Check Workflow Status

```bash
# Get workflow details
curl -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
  "${N8N_URL}/api/v1/workflows/DRHg9pwanv4pHGxV" | jq '{id, name, active, tags}'
```

### View Execution History

**Via API**:

```bash
curl -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
  "${N8N_URL}/api/v1/executions?workflowId=DRHg9pwanv4pHGxV&limit=10" | jq '.data[] | {id, status, startedAt}'
```

**Via UI**:

- Open: https://n8n.jclee.me/executions
- Filter by workflow: "job-auto-apply"

### Check Telegram Notifications

The bot sends notifications for:

- ✅ **Success**: Applied to X jobs, found Y jobs, etc.
- ❌ **Failure**: Error message and details
- ⏱️ **Timeout**: If job takes longer than 20 minutes

Notification format:

```
✅ Auto-Apply Completed

Found: 21 jobs
Matched: 21
Applied: 3
Failed: 0
Skipped: 18

Duration: 2m 30s
```

---

## Troubleshooting

### Workflow Not Running

**Check 1: Is workflow active?**

```bash
curl -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
  "${N8N_URL}/api/v1/workflows/DRHg9pwanv4pHGxV" | jq '.active'
```

Should return: `true`

**Check 2: Are environment variables set?**
In n8n UI: Settings → Variables

- Must have: `JOB_SERVER_URL`, `JOB_SERVER_ADMIN_TOKEN`

**Check 3: Is job-server running?**

```bash
curl http://localhost:3456/health
```

### Telegram Notifications Not Received

**Check 1: Is telegram-notifier workflow active?**

```bash
curl -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
  "${N8N_URL}/api/v1/workflows/PV5yLgHNzNSlCmRT" | jq '.active'
```

**Check 2: Test Telegram manually**

```bash
export TELEGRAM_BOT_TOKEN="your-bot-token"
export TELEGRAM_CHAT_ID="your-chat-id"

curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
  -H "Content-Type: application/json" \
  -d "{\"chat_id\": \"${TELEGRAM_CHAT_ID}\", \"text\": \"Test from CLI\"}"
```

### API Authentication Errors

**Problem**: 401/403 errors
**Solution**: Ensure Cloudflare Access credentials are set:

```bash
export CF_ACCESS_CLIENT_ID="..."
export CF_ACCESS_CLIENT_SECRET="..."
```

Or use SSH tunnel:

```bash
ssh -f -N -L 15678:192.168.50.100:5678 root@192.168.50.100
export N8N_URL="http://localhost:15678"
```

---

## Configuration Reference

### Workflow File

- **Path**: `infrastructure/n8n/job-auto-apply-workflow.json`
- **ID**: `DRHg9pwanv4pHGxV`
- **Name**: `job-auto-apply`

### Key Settings

| Setting          | Value                                           | Description             |
| ---------------- | ----------------------------------------------- | ----------------------- |
| Schedule         | `0 9 * * *`                                     | Daily at 9:00 AM KST    |
| Timezone         | `Asia/Seoul`                                    | Korean Standard Time    |
| Max Applications | 10                                              | Per run limit           |
| Platforms        | wanted, jobkorea, saramin                       | Job platforms to search |
| Keywords         | 시니어 엔지니어, 클라우드 엔지니어, SRE, DevOps | Search terms            |
| Poll Interval    | 30 seconds                                      | Status check frequency  |
| Max Polls        | 40                                              | ~20 minute timeout      |

### Environment Variables (in n8n)

| Variable                 | Required | Description                     |
| ------------------------ | -------- | ------------------------------- |
| `JOB_SERVER_URL`         | Yes      | Base URL of job-server API      |
| `JOB_SERVER_ADMIN_TOKEN` | Yes      | Bearer token for authentication |
| `N8N_WEBHOOK_URL`        | No       | Fallback webhook URL            |

---

## Related Files

| File                                                 | Purpose                   |
| ---------------------------------------------------- | ------------------------- |
| `infrastructure/n8n/job-auto-apply-workflow.json`    | Main workflow definition  |
| `infrastructure/n8n/activate-auto-apply.sh`          | Deployment script         |
| `infrastructure/n8n/deploy-auto-apply.go`            | Go deployment tool        |
| `apps/job-server/src/auto-apply/`                    | Auto-apply implementation |
| `apps/job-server/src/shared/services/notifications/` | Telegram adapter          |

---

## Support

**n8n UI**: https://n8n.jclee.me/workflow/DRHg9pwanv4pHGxV  
**Documentation**: `infrastructure/n8n/README.md`  
**API Reference**: `infrastructure/n8n/N8N_API_REFERENCE.md`  
**Issues**: https://github.com/qws941/resume/issues

---

**Last Updated**: 2026-04-06  
**Version**: 1.0.0  
**Status**: Production Ready ✅
