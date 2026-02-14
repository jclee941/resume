#!/bin/bash
# Validate resume data (SSoT)
set -euo pipefail
cd "$(dirname "$0")/../../.."

DATA_FILE="typescript/data/resumes/master/resume_data.json"

# Validate JSON syntax
if ! node -e "JSON.parse(require('fs').readFileSync('$DATA_FILE', 'utf8'))" 2>/dev/null; then
  echo "ERROR: Invalid JSON in $DATA_FILE"
  exit 1
fi

echo "OK: $DATA_FILE is valid JSON"
