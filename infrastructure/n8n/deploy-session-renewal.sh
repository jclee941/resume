#!/bin/bash
#
# Deploy session renewal workflow to n8n
#

set -e

echo "=== Deploying Session Renewal Workflow ==="
echo ""

WORKFLOW_FILE="/home/jclee/dev/resume/infrastructure/n8n/session-renewal-workflow.json"

echo "[1/3] Importing session renewal workflow..."
cat "$WORKFLOW_FILE" | ssh -o StrictHostKeyChecking=no root@192.168.50.110 'docker exec -i n8n sh -c "cat > /tmp/session-renewal.json && n8n import:workflow --input=/tmp/session-renewal.json"'

echo "✅ Workflow imported"
echo ""

echo "[2/3] Publishing workflow..."
ssh -o StrictHostKeyChecking=no root@192.168.50.110 'docker exec n8n n8n publish:workflow --id=session-renewal-wanted'

echo "✅ Workflow published"
echo ""

echo "[3/3] Restarting n8n..."
ssh -o StrictHostKeyChecking=no root@192.168.50.110 'docker restart n8n'

echo "✅ n8n restarted"
echo ""

echo "=========================================="
echo "  Session Renewal Workflow Deployed!"
echo "=========================================="
echo ""
echo "Schedule: Daily at 8:00 AM KST"
echo "Purpose: Renew Wanted session before auto-apply"
echo ""
echo "Timeline:"
echo "  8:00 AM - Session Renewal"
echo "  9:00 AM - Auto-Apply (if session valid)"
echo ""
