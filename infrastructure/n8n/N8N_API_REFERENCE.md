# n8n Job Automation API Reference

**Base URL**: `https://resume.jclee.me/job` (job-dashboard worker)

**Authentication**: Bearer token required (`Authorization: Bearer <ADMIN_TOKEN>`)

---

## Resume Sync (Wanted)

Trigger resume data sync from SSoT to Wanted platform.

**Endpoint**: `POST /api/automation/resume`

**Headers**:

```
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Request Body**:

```json
{
  "dryRun": false,
  "platforms": ["wanted"],
  "ssotData": {}
}
```

**Response**:

```json
{
  "success": true,
  "syncId": "sync-uuid",
  "platforms": ["wanted"],
  "status": "pending"
}
```

---

## Auto-Apply Run

Trigger automatic job application for matching positions.

**Endpoint**: `POST /api/auto-apply/run`

**Headers**:

```
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Request Body**:

```json
{
  "platforms": ["wanted"],
  "keywords": ["시니어 엔지니어", "클우드 엔지니어"],
  "maxApplications": 10
}
```

**Response**:

```json
{
  "success": true,
  "runId": "run-uuid",
  "status": "running",
  "platforms": ["wanted"]
}
```

---

## Profile Sync

Sync profile data across platforms.

**Endpoint**: `POST /api/automation/profile-sync`

**Headers**:

```
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Request Body**:

```json
{
  "platforms": ["wanted", "jobkorea"],
  "ssotData": {}
}
```

**Response**:

```json
{
  "success": true,
  "syncId": "sync-uuid",
  "platforms": ["wanted", "jobkorea"]
}
```

---

## Check Status

Get status of a sync/apply operation.

**Endpoint**: `GET /api/automation/profile-sync/:syncId`

**Headers**:

```
Authorization: Bearer <admin-token>
```

---

## n8n Workflow Configuration

### Schedule Triggers

1. **Weekly Resume Sync** (Sunday 03:00 UTC)
   - Cron: `0 3 * * 0`
   - Action: POST `/api/automation/resume`

2. **Daily Auto-Apply** (09:00 KST)
   - Cron: `0 0 * * *` (Asia/Seoul)
   - Action: POST `/api/auto-apply/run`

### Webhook Triggers

- Manual trigger via n8n webhook
- Accepts `?dryRun=true` for testing

### Notification

All operations should call telegram-notifier sub-workflow (`PV5yLgHNzNSlCmRT`) with results.

---

## CI/CD Separation

**CI/CD Pipeline** (`gitlab-ci.yml`):

- Code validation (lint, test, build)
- NEVER runs job automation

**n8n Orchestration**:

- Job automation (resume sync, auto-apply)
- Scheduled via n8n triggers
- Calls APIs to job-dashboard worker
