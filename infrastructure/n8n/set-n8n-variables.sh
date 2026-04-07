#!/bin/bash
# set-n8n-variables.sh

set -e

echo "=== Setting n8n Variables ==="

ssh -o StrictHostKeyChecking=no root@192.168.50.110 <<'REMOTESSH'
docker exec n8n-postgres psql -U n8n -d n8n -c "
INSERT INTO variables (id, key, type, value) VALUES 
  (gen_random_uuid(), 'JOB_SERVER_URL', 'string', 'http://192.168.50.100:3456'),
  (gen_random_uuid(), 'JOB_SERVER_ADMIN_TOKEN', 'string', 'resume-admin-token-2024')
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value;
"
REMOTESSH

echo "✅ Variables set successfully"
