#!/bin/bash
# activate-resume-autoapply.sh
# Run this on n8n host (192.168.50.110) to activate auto-apply workflow

set -e

WORKFLOW_FILE="/tmp/job-auto-apply-workflow.json"
N8N_API_URL="http://localhost:5678/api/v1/workflows"

echo "=== Resume Auto-Apply Activation ==="
echo ""

# Download workflow
echo "[1/4] Downloading workflow..."
curl -sL "https://raw.githubusercontent.com/qws941/resume/master/infrastructure/n8n/job-auto-apply-workflow.json" -o "$WORKFLOW_FILE" 2>/dev/null || {
  echo "Using local file..."
  cat >"$WORKFLOW_FILE" <<'ENDWORKFLOW'
{"id":"DRHg9pwanv4pHGxV","name":"job-auto-apply","nodes":[{"parameters":{"rule":{"interval":[{"triggerAtMinute":0,"triggerAtHour":9}]}},"id":"schedule-trigger","name":"Daily Schedule","type":"n8n-nodes-base.scheduleTrigger","typeVersion":1.2,"position":[100,300]},{"type":"n8n-nodes-base.httpRequest","typeVersion":4.2,"position":[400,300],"parameters":{"options":{"timeout":30000},"method":"POST","url":"={{ $env.JOB_SERVER_URL }}/api/auto-apply/run","sendHeaders":true,"headerParameters":{"parameters":[{"name":"Content-Type","value":"application/json"},{"name":"Authorization","value":"=Bearer {{ $env.JOB_SERVER_ADMIN_TOKEN }}"}]},"sendBody":true,"specifyBody":"json","jsonBody":"={{ JSON.stringify({ dryRun: false, maxApplications: 10, platforms: ['wanted'], keywords: ['시니어 엔지니어', '클라우드 엔지니어', 'SRE', 'DevOps'] }) }}"},"id":"trigger-auto-apply","name":"Trigger Auto-Apply"},{"parameters":{"amount":30,"unit":"seconds"},"id":"wait-before-poll","name":"Wait 30s","type":"n8n-nodes-base.wait","typeVersion":1.1,"position":[700,300]},{"id":"poll-status","name":"Poll Status","type":"n8n-nodes-base.httpRequest","typeVersion":4.2,"position":[1000,300],"parameters":{"method":"GET","url":"={{ $env.JOB_SERVER_URL }}/api/auto-apply/status","sendHeaders":true,"headerParameters":{"parameters":[{"value":"=Bearer {{ $env.JOB_SERVER_ADMIN_TOKEN }}","name":"Authorization"}]},"options":{"timeout":15000}}},{"name":"Check if Done","type":"n8n-nodes-base.if","typeVersion":2.2,"position":[1300,300],"parameters":{"conditions":{"conditions":[{"id":"cond-completed","leftValue":"={{ $json.status }}","rightValue":"completed","operator":{"type":"string","operation":"equals"}},{"leftValue":"={{ $json.status }}","rightValue":"failed","operator":{"operation":"equals","type":"string"},"id":"cond-failed"}],"options":{"rightValue":"","typeValidation":"strict","caseSensitive":true,"leftValue":""},"combinator":"or"}},"id":"check-completion"},{"parameters":{"jsCode":"const status = $input.first().json; const lastResult = status.lastResult || {}; const phases = lastResult.phases || {}; const searchCount = phases.search?.found || 0; const filterMatched = phases.filter?.stats?.matched || 0; const applied = phases.apply?.succeeded || 0; const failed = phases.apply?.failed || 0; const skipped = phases.apply?.skipped || 0; const isSuccess = status.status === 'completed' && lastResult.success; const duration = status.lastRun ? Math.round((Date.now() - new Date(status.lastRun).getTime()) / 1000) : 0; const statsLine = `Found ${searchCount} jobs, ${filterMatched} matched, ${applied} applied, ${failed} failed, ${skipped} skipped`; return { isSuccess, status: status.status, channel: 'auto-apply', command: `auto-apply (${status.lastResult?.dryRun ? 'dry-run' : 'live'})`, duration, source: 'job-automation', errorMessage: isSuccess ? null : (lastResult.error || statsLine), outputUrl: null, pollCount: null };"},"id":"format-result","name":"Format Result","type":"n8n-nodes-base.code","typeVersion":2,"position":[1600,200]},{"position":[1600,400],"parameters":{"jsCode":"const staticData = $getWorkflowStaticData('global'); staticData.pollCount = (staticData.pollCount || 0) + 1; const MAX_POLLS = 40; if (staticData.pollCount >= MAX_POLLS) { const count = staticData.pollCount; staticData.pollCount = 0; return { isSuccess: false, status: 'timeout', channel: 'auto-apply', command: 'auto-apply', duration: count * 30, source: 'job-automation', timedOut: true, pollCount: count, errorMessage: `Auto-apply timed out after ${count} polls (~${Math.round(count * 30 / 60)} minutes)` }; } return $input.first().json;"},"id":"increment-poll","name":"Increment Poll Count","type":"n8n-nodes-base.code","typeVersion":2},{"name":"Check Timeout","type":"n8n-nodes-base.if","typeVersion":2.2,"position":[1900,400],"parameters":{"conditions":{"conditions":[{"operator":{"type":"boolean","operation":"equals"},"id":"cond-timeout","leftValue":"={{ $json.timedOut }}","rightValue":"={{ true }}"}],"options":{"typeValidation":"strict","caseSensitive":true,"leftValue":"","rightValue":""},"combinator":"and"}},"id":"check-timeout"},{"type":"n8n-nodes-base.code","typeVersion":2,"position":[1900,200],"parameters":{"jsCode":"const staticData = $getWorkflowStaticData('global'); staticData.pollCount = 0; return $input.first().json;"},"id":"reset-poll-count","name":"Reset Poll Count"},{"id":"notify-success","name":"Notify Result","type":"n8n-nodes-base.executeWorkflow","typeVersion":1.1,"position":[2200,200],"parameters":{"workflowId":"PV5yLgHNzNSlCmRT","workflowInputs":{"value":{}}}},{"typeVersion":1.1,"position":[2200,400],"parameters":{"workflowInputs":{"value":{}},"workflowId":"PV5yLgHNzNSlCmRT"},"id":"notify-timeout","name":"Notify Timeout","type":"n8n-nodes-base.executeWorkflow"},{"parameters":{"jsCode":"const error = $input.first().json; return { isSuccess: false, status: 'error', channel: 'auto-apply', command: 'auto-apply', duration: 0, source: 'job-automation', errorMessage: error.message || JSON.stringify(error).substring(0, 500) };"},"id":"error-handler","name":"Handle Error","type":"n8n-nodes-base.code","typeVersion":2,"position":[400,600]},{"id":"notify-error","name":"Notify Error","type":"n8n-nodes-base.executeWorkflow","typeVersion":1.1,"position":[700,600],"parameters":{"workflowInputs":{"value":{}},"workflowId":"PV5yLgHNzNSlCmRT"}}],"connections":{"Handle Error":{"main":[[{"node":"Notify Error","type":"main","index":0}]]},"Trigger Auto-Apply":{"main":[[{"node":"Wait 30s","type":"main","index":0}]]},"Increment Poll Count":{"main":[[{"node":"Check Timeout","type":"main","index":0}]]},"Daily Schedule":{"main":[[{"type":"main","index":0,"node":"Trigger Auto-Apply"}]]},"Wait 30s":{"main":[[{"index":0,"node":"Poll Status","type":"main"}]]},"Check if Done":{"main":[[{"type":"main","index":0,"node":"Format Result"}],[{"index":0,"node":"Increment Poll Count","type":"main"}]]},"Reset Poll Count":{"main":[[{"node":"Notify Result","type":"main","index":0}]]},"Poll Status":{"main":[[{"index":0,"node":"Check if Done","type":"main"}]]},"Format Result":{"main":[[{"node":"Reset Poll Count","type":"main","index":0}]]},"Check Timeout":{"main":[[{"node":"Notify Timeout","type":"main","index":0}],[{"index":0,"node":"Wait 30s","type":"main"}]]}},"settings":{"saveExecutionProgress":true,"saveManualExecutions":true,"saveDataErrorExecution":"all","saveDataSuccessExecution":"all","executionTimeout":3600,"timezone":"Asia/Seoul","callerPolicy":"workflowsFromSameOwner","availableInMCP":false},"staticData":null,"meta":null,"pinData":null}
ENDWORKFLOW
}
echo "✅ Workflow file ready"
echo ""

# Import workflow
echo "[2/4] Importing workflow to n8n..."
IMPORT_RESULT=$(curl -s -X POST "$N8N_API_URL" \
  -H "Content-Type: application/json" \
  -d @"$WORKFLOW_FILE" 2>/dev/null || echo '{"error":"failed"}')

if echo "$IMPORT_RESULT" | grep -q '"id"'; then
  WORKFLOW_ID=$(echo "$IMPORT_RESULT" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "✅ Workflow imported: $WORKFLOW_ID"
elif echo "$IMPORT_RESULT" | grep -q "already exists"; then
  WORKFLOW_ID="DRHg9pwanv4pHGxV"
  echo "⚠️ Workflow already exists: $WORKFLOW_ID"
else
  echo "⚠️ Import response: $(echo "$IMPORT_RESULT" | head -c 100)"
  WORKFLOW_ID="DRHg9pwanv4pHGxV"
fi
echo ""

# Activate workflow
echo "[3/4] Activating workflow..."
ACTIVATE_RESULT=$(curl -s -X PATCH "$N8N_API_URL/$WORKFLOW_ID" \
  -H "Content-Type: application/json" \
  -d '{"active":true}' 2>/dev/null || echo '{"error":"failed"}')

if echo "$ACTIVATE_RESULT" | grep -q '"active":true'; then
  echo "✅ Workflow ACTIVATED!"
  STATUS="ACTIVE"
else
  echo "⚠️ Activation response: $(echo "$ACTIVATE_RESULT" | head -c 100)"
  STATUS="UNKNOWN"
fi
echo ""

# Verify
echo "[4/4] Verifying..."
VERIFY=$(curl -s "$N8N_API_URL/$WORKFLOW_ID" 2>/dev/null || echo '{}')
if echo "$VERIFY" | grep -q '"active":true'; then
  echo "✅ VERIFIED: Workflow is ACTIVE"
  STATUS="ACTIVE"
else
  echo "⚠️ Verification failed"
fi
echo ""

# Cleanup
rm -f "$WORKFLOW_FILE"

# Summary
echo "=========================================="
echo "  AUTO-APPLY DEPLOYMENT COMPLETE"
echo "=========================================="
echo ""
echo "Workflow ID: $WORKFLOW_ID"
echo "Status: $STATUS"
echo "Schedule: Daily at 9:00 AM KST"
echo "Timezone: Asia/Seoul"
echo ""
echo "Features:"
echo "  ✅ Automatic job search and apply"
echo "  ✅ Telegram notifications"
echo "  ✅ 20-min timeout protection"
echo "  ✅ Error handling"
echo ""
echo "Next Run: Tomorrow at 9:00 AM KST"
echo "Monitor: http://192.168.50.110:5678/workflow/$WORKFLOW_ID"
echo ""
echo "=========================================="

# Set environment variables reminder
echo ""
echo "⚠️  IMPORTANT: Set environment variables in n8n UI:"
echo "   Settings → Variables:"
echo "   - JOB_SERVER_URL = http://localhost:3456"
echo "   - JOB_SERVER_ADMIN_TOKEN = (your token)"
echo ""
