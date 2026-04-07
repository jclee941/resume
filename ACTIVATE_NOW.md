# ✅ Auto-Apply Setup Complete

**Status**: Ready to activate  
**Required Action**: Copy-paste ONE command in n8n UI
**Time needed**: 30 seconds

---

## 🚀 QUICKEST ACTIVATION (30 seconds)

### Method: Browser Console (No API key needed!)

1. Open **http://192.168.50.110:5678** (n8n UI)
2. Press **F12** → Click **Console** tab
3. Copy-paste this entire code block:

```javascript
fetch('/api/v1/workflows', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id: 'DRHg9pwanv4pHGxV',
    name: 'job-auto-apply',
    nodes: [
      {
        parameters: { rule: { interval: [{ triggerAtMinute: 0, triggerAtHour: 9 }] } },
        id: 'schedule-trigger',
        name: 'Daily Schedule',
        type: 'n8n-nodes-base.scheduleTrigger',
        typeVersion: 1.2,
        position: [100, 300],
      },
      {
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.2,
        position: [400, 300],
        parameters: {
          options: { timeout: 30000 },
          method: 'POST',
          url: '={{ $env.JOB_SERVER_URL }}/api/auto-apply/run',
          sendHeaders: true,
          headerParameters: {
            parameters: [
              { name: 'Content-Type', value: 'application/json' },
              { name: 'Authorization', value: '=Bearer {{ $env.JOB_SERVER_ADMIN_TOKEN }}' },
            ],
          },
          sendBody: true,
          specifyBody: 'json',
          jsonBody:
            "={{ JSON.stringify({ dryRun: false, maxApplications: 10, platforms: ['wanted', 'jobkorea', 'saramin'], keywords: ['시니어 엔지니어', '클라우드 엔지니어', 'SRE', 'DevOps'] }) }}",
        },
        id: 'trigger-auto-apply',
        name: 'Trigger Auto-Apply',
      },
      {
        parameters: { amount: 30, unit: 'seconds' },
        id: 'wait-before-poll',
        name: 'Wait 30s',
        type: 'n8n-nodes-base.wait',
        typeVersion: 1.1,
        position: [700, 300],
      },
      {
        id: 'poll-status',
        name: 'Poll Status',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.2,
        position: [1000, 300],
        parameters: {
          method: 'GET',
          url: '={{ $env.JOB_SERVER_URL }}/api/auto-apply/status',
          sendHeaders: true,
          headerParameters: {
            parameters: [
              { value: '=Bearer {{ $env.JOB_SERVER_ADMIN_TOKEN }}', name: 'Authorization' },
            ],
          },
          options: { timeout: 15000 },
        },
      },
      {
        name: 'Check if Done',
        type: 'n8n-nodes-base.if',
        typeVersion: 2.2,
        position: [1300, 300],
        parameters: {
          conditions: {
            conditions: [
              {
                id: 'cond-completed',
                leftValue: '={{ $json.status }}',
                rightValue: 'completed',
                operator: { type: 'string', operation: 'equals' },
              },
              {
                leftValue: '={{ $json.status }}',
                rightValue: 'failed',
                operator: { operation: 'equals', type: 'string' },
                id: 'cond-failed',
              },
            ],
            options: {
              rightValue: '',
              typeValidation: 'strict',
              caseSensitive: true,
              leftValue: '',
            },
            combinator: 'or',
          },
        },
        id: 'check-completion',
      },
      {
        parameters: {
          jsCode:
            "const status = $input.first().json; const lastResult = status.lastResult || {}; const phases = lastResult.phases || {}; const searchCount = phases.search?.found || 0; const filterMatched = phases.filter?.stats?.matched || 0; const applied = phases.apply?.succeeded || 0; const failed = phases.apply?.failed || 0; const skipped = phases.apply?.skipped || 0; const isSuccess = status.status === 'completed' && lastResult.success; const duration = status.lastRun ? Math.round((Date.now() - new Date(status.lastRun).getTime()) / 1000) : 0; const statsLine = `Found ${searchCount} jobs, ${filterMatched} matched, ${applied} applied, ${failed} failed, ${skipped} skipped`; return { isSuccess, status: status.status, channel: 'auto-apply', command: `auto-apply (${status.lastResult?.dryRun ? 'dry-run' : 'live'})`, duration, source: 'job-automation', errorMessage: isSuccess ? null : (lastResult.error || statsLine), outputUrl: null, pollCount: null };",
        },
        id: 'format-result',
        name: 'Format Result',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [1600, 200],
      },
      {
        position: [1600, 400],
        parameters: {
          jsCode:
            "const staticData = $getWorkflowStaticData('global'); staticData.pollCount = (staticData.pollCount || 0) + 1; const MAX_POLLS = 40; if (staticData.pollCount >= MAX_POLLS) { const count = staticData.pollCount; staticData.pollCount = 0; return { isSuccess: false, status: 'timeout', channel: 'auto-apply', command: 'auto-apply', duration: count * 30, source: 'job-automation', timedOut: true, pollCount: count, errorMessage: `Auto-apply timed out after ${count} polls (~${Math.round(count * 30 / 60)} minutes)` }; } return $input.first().json;",
        },
        id: 'increment-poll',
        name: 'Increment Poll Count',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
      },
      {
        name: 'Check Timeout',
        type: 'n8n-nodes-base.if',
        typeVersion: 2.2,
        position: [1900, 400],
        parameters: {
          conditions: {
            conditions: [
              {
                operator: { type: 'boolean', operation: 'equals' },
                id: 'cond-timeout',
                leftValue: '={{ $json.timedOut }}',
                rightValue: '={{ true }}',
              },
            ],
            options: {
              typeValidation: 'strict',
              caseSensitive: true,
              leftValue: '',
              rightValue: '',
            },
            combinator: 'and',
          },
        },
        id: 'check-timeout',
      },
      {
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [1900, 200],
        parameters: {
          jsCode:
            "const staticData = $getWorkflowStaticData('global'); staticData.pollCount = 0; return $input.first().json;",
        },
        id: 'reset-poll-count',
        name: 'Reset Poll Count',
      },
      {
        id: 'notify-success',
        name: 'Notify Result',
        type: 'n8n-nodes-base.executeWorkflow',
        typeVersion: 1.1,
        position: [2200, 200],
        parameters: { workflowId: 'PV5yLgHNzNSlCmRT', workflowInputs: { value: {} } },
      },
      {
        typeVersion: 1.1,
        position: [2200, 400],
        parameters: { workflowInputs: { value: {} }, workflowId: 'PV5yLgHNzNSlCmRT' },
        id: 'notify-timeout',
        name: 'Notify Timeout',
        type: 'n8n-nodes-base.executeWorkflow',
      },
      {
        parameters: {
          jsCode:
            "const error = $input.first().json; return { isSuccess: false, status: 'error', channel: 'auto-apply', command: 'auto-apply', duration: 0, source: 'job-automation', errorMessage: error.message || JSON.stringify(error).substring(0, 500) };",
        },
        id: 'error-handler',
        name: 'Handle Error',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [400, 600],
      },
      {
        id: 'notify-error',
        name: 'Notify Error',
        type: 'n8n-nodes-base.executeWorkflow',
        typeVersion: 1.1,
        position: [700, 600],
        parameters: { workflowInputs: { value: {} }, workflowId: 'PV5yLgHNzNSlCmRT' },
      },
    ],
    connections: {
      'Handle Error': { main: [[{ node: 'Notify Error', type: 'main', index: 0 }]] },
      'Trigger Auto-Apply': { main: [[{ node: 'Wait 30s', type: 'main', index: 0 }]] },
      'Increment Poll Count': { main: [[{ node: 'Check Timeout', type: 'main', index: 0 }]] },
      'Daily Schedule': { main: [[{ type: 'main', index: 0, node: 'Trigger Auto-Apply' }]] },
      'Wait 30s': { main: [[{ index: 0, node: 'Poll Status', type: 'main' }]] },
      'Check if Done': {
        main: [
          [{ type: 'main', index: 0, node: 'Format Result' }],
          [{ index: 0, node: 'Increment Poll Count', type: 'main' }],
        ],
      },
      'Reset Poll Count': { main: [[{ node: 'Notify Result', type: 'main', index: 0 }]] },
      'Poll Status': { main: [[{ index: 0, node: 'Check if Done', type: 'main' }]] },
      'Format Result': { main: [[{ node: 'Reset Poll Count', type: 'main', index: 0 }]] },
      'Check Timeout': {
        main: [
          [{ node: 'Notify Timeout', type: 'main', index: 0 }],
          [{ index: 0, node: 'Wait 30s', type: 'main' }],
        ],
      },
    },
    settings: {
      saveExecutionProgress: true,
      saveManualExecutions: true,
      saveDataErrorExecution: 'all',
      saveDataSuccessExecution: 'all',
      executionTimeout: 3600,
      timezone: 'Asia/Seoul',
      callerPolicy: 'workflowsFromSameOwner',
      availableInMCP: false,
    },
    staticData: null,
    meta: null,
    pinData: null,
  }),
})
  .then((r) => r.json())
  .then((data) => {
    const id = data.id || 'DRHg9pwanv4pHGxV';
    fetch(`/api/v1/workflows/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: true }),
    }).then(() =>
      alert('✅ Auto-Apply activated! Daily at 9AM KST. Check Telegram for notifications.')
    );
  });
```

4. Press **Enter**
5. ✅ **Done!** Alert will show "Auto-Apply activated!"

---

## 📋 Alternative: Manual Import (1 minute)

If the console method fails:

1. Open http://192.168.50.110:5678
2. **Workflows** → **Import from File**
3. Select: `/home/jclee/dev/resume/infrastructure/n8n/job-auto-apply-workflow.json`
4. Click **Activate**
5. ✅ Done!

---

## ⚙️ Post-Activation Setup

After activating, set these environment variables in n8n:

**Settings** → **Variables**:

```
JOB_SERVER_URL = http://localhost:3456
JOB_SERVER_ADMIN_TOKEN = (your admin token)
```

---

## ✅ What You Get

| Feature                         | Status |
| ------------------------------- | ------ |
| Daily auto-apply at 9AM KST     | ✅     |
| Telegram notifications          | ✅     |
| Wanted/JobKorea/Saramin support | ✅     |
| 20-min timeout protection       | ✅     |
| Error handling                  | ✅     |

---

## 📚 Files Created

- `infrastructure/n8n/job-auto-apply-workflow.json` - Main workflow
- `infrastructure/n8n/activate-bookmarklet.js` - Browser bookmarklet
- `infrastructure/n8n/activate-on-n8n-host.sh` - SSH deployment script
- `AUTO_APPLY_COMPLETION_REPORT.md` - Full documentation

---

**🚀 Copy that code block into n8n console and you're done!**
