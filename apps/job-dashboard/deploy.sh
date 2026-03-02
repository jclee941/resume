#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "=== Job Dashboard CF Native Deployment ==="

if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
  echo "Error: CLOUDFLARE_API_TOKEN not set"
  echo "Create a token with D1 + Workers permissions at:"
  echo "https://dash.cloudflare.com/profile/api-tokens"
  exit 1
fi

echo "1. Creating D1 database..."
D1_OUTPUT=$(npx wrangler d1 create job-dashboard-db 2>&1 || true)

if echo "$D1_OUTPUT" | grep -q "already exists"; then
  echo "   D1 database already exists"
  D1_ID=$(npx wrangler d1 list --json 2>/dev/null | jq -r '.[] | select(.name=="job-dashboard-db") | .uuid')
else
  D1_ID=$(echo "$D1_OUTPUT" | grep -oP 'database_id = "\K[^"]+' || true)
fi

if [ -z "$D1_ID" ]; then
  echo "   Getting D1 ID from list..."
  D1_ID=$(npx wrangler d1 list --json 2>/dev/null | jq -r '.[] | select(.name=="job-dashboard-db") | .uuid')
fi

echo "   D1 ID: $D1_ID"

echo "2. Updating wrangler.toml..."
sed -i "s/REPLACE_AFTER_CREATE/$D1_ID/" wrangler.toml

echo "3. Creating KV namespace..."
KV_OUTPUT=$(npx wrangler kv namespace create SESSIONS 2>&1 || true)
KV_ID=$(echo "$KV_OUTPUT" | grep -oP 'id = "\K[^"]+' || true)

if [ -z "$KV_ID" ]; then
  KV_ID=$(npx wrangler kv namespace list --json 2>/dev/null | jq -r '.[] | select(.title | contains("SESSIONS")) | .id')
fi

echo "   KV ID: $KV_ID"
sed -i "s/id = \"REPLACE_AFTER_CREATE\"/id = \"$KV_ID\"/" wrangler.toml

echo "4. Applying D1 schema..."
npx wrangler d1 execute job-dashboard-db --file=schema.sql

echo "5. Deploying worker..."
npx wrangler deploy --config wrangler.toml --env production

echo ""
echo "=== Deployment Complete ==="
echo "Dashboard: https://resume.jclee.me/job"
echo ""
echo "To set secrets:"
echo "  npx wrangler secret put SLACK_WEBHOOK_URL"
echo "  npx wrangler secret put ANTHROPIC_API_KEY"
