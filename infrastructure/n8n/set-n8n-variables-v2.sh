#!/bin/bash
# set-n8n-variables-v2.sh

set -e

echo "=== Setting n8n Variables ==="

ssh -o StrictHostKeyChecking=no root@192.168.50.110 <<'REMOTESSH'
# Delete existing entries
docker exec n8n-postgres psql -U n8n -d n8n -c "
DELETE FROM variables WHERE key IN ('JOB_SERVER_URL', 'JOB_SERVER_ADMIN_TOKEN');
"

# Insert new entries
docker exec n8n-postgres psql -U n8n -d n8n -c "
INSERT INTO variables (id, key, type, value) VALUES 
  (gen_random_uuid(), 'JOB_SERVER_URL', 'string', 'http://192.168.50.100:3456'),
  (gen_random_uuid(), 'JOB_SERVER_ADMIN_TOKEN', 'string', 'resume-admin-token-2024');
"
REMOTESSH

echo "✅ Variables set successfully"
