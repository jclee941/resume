#!/bin/bash
#
# activate-on-n8n-host.sh - Run this ON the n8n host (192.168.50.110)
#
# Copy to n8n host and run:
#   scp infrastructure/n8n/activate-on-n8n-host.sh root@192.168.50.110:/tmp/
#   ssh root@192.168.50.110 'bash /tmp/activate-on-n8n-host.sh'
#

set -e

echo "=== n8n Auto-Apply Activation (On-Host) ==="
echo ""

WORKFLOW_URL="https://raw.githubusercontent.com/qws941/resume/master/infrastructure/n8n/job-auto-apply-workflow.json"
WORKFLOW_FILE="/tmp/job-auto-apply-workflow.json"

echo "[1/3] Downloading workflow..."
curl -sL "$WORKFLOW_URL" -o "$WORKFLOW_FILE" || {
  echo "❌ Failed to download workflow"
  exit 1
}
echo "✅ Workflow downloaded"
echo ""

echo "[2/3] Importing to n8n..."
# Try without API key first (might work on localhost)
RESPONSE=$(curl -s -X POST "http://localhost:5678/api/v1/workflows" \
  -H "Content-Type: application/json" \
  -d @"$WORKFLOW_FILE" 2>&1)

if echo "$RESPONSE" | grep -q '"id"'; then
  WORKFLOW_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "✅ Workflow imported: $WORKFLOW_ID"
elif echo "$RESPONSE" | grep -q "already exists"; then
  WORKFLOW_ID="DRHg9pwanv4pHGxV"
  echo "⚠️  Workflow already exists: $WORKFLOW_ID"
else
  echo "❌ Import failed:"
  echo "$RESPONSE"
  exit 1
fi
echo ""

echo "[3/3] Activating workflow..."
ACTIVATE=$(curl -s -X PATCH "http://localhost:5678/api/v1/workflows/$WORKFLOW_ID" \
  -H "Content-Type: application/json" \
  -d '{"active":true}' 2>&1)

if echo "$ACTIVATE" | grep -q '"active":true'; then
  echo "✅ Workflow activated!"
  echo ""
  echo "=== SUCCESS ==="
  echo "Workflow ID: $WORKFLOW_ID"
  echo "Status: Active ✅"
  echo "Schedule: Daily at 9:00 AM KST"
  echo ""
  echo "The auto-apply system is now running!"
  echo "Next run: Tomorrow at 9:00 AM KST"
  echo ""
  echo "Monitor at: http://192.168.50.110:5678/workflow/$WORKFLOW_ID"
else
  echo "❌ Activation failed:"
  echo "$ACTIVATE"
  exit 1
fi

# Cleanup
rm -f "$WORKFLOW_FILE"
