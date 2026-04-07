#!/bin/bash
# set-n8n-env.sh - Set environment variables in n8n

set -e

echo "=== Setting n8n Environment Variables ==="
echo ""

# Variables to set
JOB_SERVER_URL="http://192.168.50.100:3456"
JOB_SERVER_ADMIN_TOKEN="resume-admin-token-2024"

echo "Setting:"
echo "  JOB_SERVER_URL=$JOB_SERVER_URL"
echo "  JOB_SERVER_ADMIN_TOKEN=$JOB_SERVER_ADMIN_TOKEN"
echo ""

# Insert into n8n database (postgres)
ssh -o StrictHostKeyChecking=no root@192.168.50.110 <<EOF
docker exec n8n-postgres psql -U n8n -d n8n -c "
INSERT INTO credentials_entity (name, type, nodesAccess, data, updatedAt, createdAt)
VALUES 
  ('JOB_SERVER_URL', 'variables', '[]', '{\"value\": \"$JOB_SERVER_URL\"}', NOW(), NOW()),
  ('JOB_SERVER_ADMIN_TOKEN', 'variables', '[]', '{\"value\": \"$JOB_SERVER_ADMIN_TOKEN\"}', NOW(), NOW())
ON CONFLICT (name) DO UPDATE SET 
  data = EXCLUDED.data,
  updatedAt = NOW();
"
EOF

echo "✅ Environment variables set in n8n database"
echo ""
echo "Note: You may need to restart n8n for changes to take effect:"
echo "  docker restart n8n"
