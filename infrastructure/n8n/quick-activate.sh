#!/bin/bash
#
# Simple Auto-Apply Activation - No API Key Required
# Uses direct HTTP POST to n8n internal endpoint
#

set -e

N8N_INTERNAL="http://192.168.50.110:5678"
WORKFLOW_FILE="/home/jclee/dev/resume/infrastructure/n8n/job-auto-apply-workflow.json"

echo "=== Auto-Apply Direct Activation ==="
echo ""

# Check if n8n is reachable
echo "[1/4] Checking n8n availability..."
if ! curl -s --connect-timeout 5 "$N8N_INTERNAL" >/dev/null 2>&1; then
  echo "❌ Cannot reach n8n at $N8N_INTERNAL"
  echo "   Please ensure you're on the internal network (192.168.50.x)"
  exit 1
fi
echo "✅ n8n is reachable"
echo ""

# Check workflow file
echo "[2/4] Checking workflow file..."
if [ ! -f "$WORKFLOW_FILE" ]; then
  echo "❌ Workflow file not found: $WORKFLOW_FILE"
  exit 1
fi
echo "✅ Workflow file found"
echo ""

# Try to import workflow
echo "[3/4] Importing workflow..."
RESPONSE=$(curl -s -X POST "$N8N_INTERNAL/api/v1/workflows" \
  -H "Content-Type: application/json" \
  -d @"$WORKFLOW_FILE" 2>&1)

if echo "$RESPONSE" | grep -q '"id"'; then
  WORKFLOW_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "✅ Workflow imported: $WORKFLOW_ID"
else
  echo "⚠️  Import may have failed or already exists"
  echo "   Response: $(echo "$RESPONSE" | head -c 100)"
  WORKFLOW_ID="DRHg9pwanv4pHGxV"
fi
echo ""

# Try to activate
echo "[4/4] Activating workflow..."
ACTIVATE=$(curl -s -X PATCH "$N8N_INTERNAL/api/v1/workflows/$WORKFLOW_ID" \
  -H "Content-Type: application/json" \
  -d '{"active":true}' 2>&1)

if echo "$ACTIVATE" | grep -q '"active":true'; then
  echo "✅ Workflow activated!"
  echo ""
  echo "=== COMPLETE ==="
  echo "Workflow ID: $WORKFLOW_ID"
  echo "Schedule: Daily at 9:00 AM KST"
  echo "URL: http://192.168.50.110:5678/workflow/$WORKFLOW_ID"
  echo ""
  echo "Next run: Tomorrow at 9:00 AM KST"
  echo "Telegram notifications: Enabled"
else
  echo "⚠️  Could not activate automatically"
  echo "   Please activate manually at:"
  echo "   http://192.168.50.110:5678/workflow/$WORKFLOW_ID"
fi

echo ""
echo "To verify:"
echo "  curl http://192.168.50.110:5678/api/v1/workflows/$WORKFLOW_ID | jq '.active'"
