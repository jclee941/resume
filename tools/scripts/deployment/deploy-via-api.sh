#!/bin/bash
# DEPRECATED: Use 'resume-cli deploy' instead
# This script is kept for backwards compatibility only
# Deploy Cloudflare Worker via REST API
# Handles ES modules format with proper multipart upload

echo "⚠️  Warning: This script is deprecated. Use 'resume-cli deploy' instead."
echo ""

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_DIR="${SCRIPT_DIR}/../../web"
WORKER_FILE="${WEB_DIR}/worker.js"

# Load environment variables
if [ -f ~/.env ]; then
    source ~/.env
else
    echo "❌ Error: ~/.env file not found"
    exit 1
fi

# Check required variables
if [ -z "$CLOUDFLARE_API_KEY" ] || [ -z "$CLOUDFLARE_EMAIL" ]; then
    echo "❌ Error: CLOUDFLARE_API_KEY or CLOUDFLARE_EMAIL not set in ~/.env"
    exit 1
fi

if [ ! -f "$WORKER_FILE" ]; then
    echo "❌ Error: worker.js not found at $WORKER_FILE"
    echo "Run 'npm run build' first to generate worker.js"
    exit 1
fi

# Account ID from environment (required)
if [ -z "$CLOUDFLARE_ACCOUNT_ID" ]; then
    echo "❌ Error: CLOUDFLARE_ACCOUNT_ID not set in ~/.env"
    exit 1
fi
ACCOUNT_ID="$CLOUDFLARE_ACCOUNT_ID"
WORKER_NAME="resume"

echo "🚀 Deploying Cloudflare Worker via REST API..."
echo "   Account: $ACCOUNT_ID"
echo "   Worker: $WORKER_NAME"
echo "   File: $WORKER_FILE ($(du -h "$WORKER_FILE" | cut -f1))"

# Create metadata file for modules format
cat > /tmp/metadata.json <<EOF
{
  "main_module": "worker.js",
  "compatibility_date": "2024-10-03"
}
EOF

# Upload using modules format (multipart/form-data)
RESPONSE=$(curl -s -X PUT \
  "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/workers/scripts/${WORKER_NAME}" \
  -H "X-Auth-Email: ${CLOUDFLARE_EMAIL}" \
  -H "X-Auth-Key: ${CLOUDFLARE_API_KEY}" \
  -F "metadata=@/tmp/metadata.json;type=application/json" \
  -F "worker.js=@${WORKER_FILE};type=application/javascript+module")

# Clean up temp file
rm -f /tmp/metadata.json

# Check response
if echo "$RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
    echo "✅ Deployment successful!"
    echo ""
    echo "📊 Response:"
    echo "$RESPONSE" | jq '.'
    echo ""
    echo "🔍 Verification:"
    echo "   Health: curl -s https://resume.jclee.me/health | jq -r '.deployed_at'"
    echo "   Site: https://resume.jclee.me"
else
    echo "❌ Deployment failed!"
    echo ""
    echo "Error details:"
    echo "$RESPONSE" | jq -r '.errors[] | "  Code \(.code): \(.message)"'
    echo ""
    echo "Full response:"
    echo "$RESPONSE" | jq '.'
    exit 1
fi
