#!/bin/bash
#
# Auto-Apply Workflow Activation Script
# Deploys and activates the job-auto-apply n8n workflow
#

set -e

echo "=== n8n Auto-Apply Workflow Activation ==="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check environment
if [ -z "$N8N_API_KEY" ]; then
  echo -e "${RED}[ERROR] N8N_API_KEY not set${NC}"
  echo "Please set your n8n API key:"
  echo "  export N8N_API_KEY=your-api-key"
  echo ""
  echo "Get your API key from: https://n8n.jclee.me/settings/api"
  exit 1
fi

N8N_URL="${N8N_URL:-https://n8n.jclee.me}"
WORKFLOW_FILE="infrastructure/n8n/job-auto-apply-workflow.json"

echo "[INFO] n8n URL: $N8N_URL"
echo "[INFO] Workflow file: $WORKFLOW_FILE"
echo ""

# Check if workflow file exists
if [ ! -f "$WORKFLOW_FILE" ]; then
  echo -e "${RED}[ERROR] Workflow file not found: $WORKFLOW_FILE${NC}"
  exit 1
fi

# Check workflow ID
WORKFLOW_ID=$(grep -o '"id": "[^"]*"' "$WORKFLOW_FILE" | head -1 | cut -d'"' -f4)
echo "[INFO] Workflow ID from file: $WORKFLOW_ID"

# Test n8n connection
echo ""
echo "[INFO] Testing n8n connection..."

if command -v curl &>/dev/null; then
  # Use curl
  AUTH_HEADER="X-N8N-API-KEY: $N8N_API_KEY"

  # Check if workflow exists
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "$AUTH_HEADER" \
    "${N8N_URL}/api/v1/workflows/${WORKFLOW_ID}" 2>/dev/null || echo "000")

  if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}[OK] Workflow already exists in n8n${NC}"
    EXISTS=true
  elif [ "$HTTP_STATUS" = "404" ]; then
    echo -e "${YELLOW}[INFO] Workflow not found, needs to be created${NC}"
    EXISTS=false
  else
    echo -e "${YELLOW}[WARNING] Could not check workflow status (HTTP $HTTP_STATUS)${NC}"
    echo "  This might be due to Cloudflare Access authentication."
    echo "  Make sure CF_ACCESS_CLIENT_ID and CF_ACCESS_CLIENT_SECRET are set."
    EXISTS=false
  fi

  # Deploy workflow
  echo ""
  if [ "$EXISTS" = true ]; then
    echo "[INFO] Updating existing workflow..."
    METHOD="PUT"
    URL="${N8N_URL}/api/v1/workflows/${WORKFLOW_ID}"
  else
    echo "[INFO] Creating new workflow..."
    METHOD="POST"
    URL="${N8N_URL}/api/v1/workflows"
  fi

  # Prepare curl command with optional CF credentials
  CURL_OPTS=(-s -H "$AUTH_HEADER" -H "Content-Type: application/json")
  if [ -n "$CF_ACCESS_CLIENT_ID" ] && [ -n "$CF_ACCESS_CLIENT_SECRET" ]; then
    CURL_OPTS+=(-H "CF-Access-Client-Id: $CF_ACCESS_CLIENT_ID")
    CURL_OPTS+=(-H "CF-Access-Client-Secret: $CF_ACCESS_CLIENT_SECRET")
  fi

  RESPONSE=$(curl "${CURL_OPTS[@]}" -X "$METHOD" -d "@$WORKFLOW_FILE" "$URL" 2>&1)

  if [ $? -eq 0 ] && echo "$RESPONSE" | grep -q '"id"'; then
    NEW_ID=$(echo "$RESPONSE" | grep -o '"id": "[^"]*"' | head -1 | cut -d'"' -f4)
    echo -e "${GREEN}[SUCCESS] Workflow deployed with ID: $NEW_ID${NC}"

    # Activate workflow
    echo ""
    echo "[INFO] Activating workflow..."
    ACTIVATE_RESPONSE=$(curl "${CURL_OPTS[@]}" -X PATCH -d '{"active": true}' \
      "${N8N_URL}/api/v1/workflows/${NEW_ID}" 2>&1)

    if [ $? -eq 0 ]; then
      echo -e "${GREEN}[SUCCESS] Workflow activated!${NC}"
      echo ""
      echo "=== Summary ==="
      echo "Workflow ID: $NEW_ID"
      echo "Schedule: Daily at 9:00 AM KST"
      echo "URL: ${N8N_URL}/workflow/${NEW_ID}"
      echo ""
      echo "The auto-apply system will now:"
      echo "  1. Run daily at 9:00 AM KST"
      echo "  2. Search for jobs on Wanted/JobKorea/Saramin"
      echo "  3. Apply to matching positions (match score ≥75%)"
      echo "  4. Send Telegram notifications with results"
    else
      echo -e "${YELLOW}[WARNING] Could not activate automatically${NC}"
      echo "Please activate manually at: ${N8N_URL}/workflow/${NEW_ID}"
    fi
  else
    echo -e "${RED}[ERROR] Failed to deploy workflow${NC}"
    echo "Response: $RESPONSE"
    exit 1
  fi
else
  echo -e "${RED}[ERROR] curl is required but not installed${NC}"
  exit 1
fi

echo ""
echo "=== Next Steps ==="
echo "1. Verify workflow is active: ${N8N_URL}/workflow/${WORKFLOW_ID}"
echo "2. Check Telegram bot is configured in n8n credentials"
echo "3. Set JOB_SERVER_URL and JOB_SERVER_ADMIN_TOKEN in n8n environment"
echo "4. Test with manual trigger or wait for next scheduled run (9:00 AM KST)"
echo ""
echo "To check workflow status:"
echo "  curl -H 'X-N8N-API-KEY: $N8N_API_KEY' ${N8N_URL}/api/v1/workflows/${WORKFLOW_ID} | jq"
