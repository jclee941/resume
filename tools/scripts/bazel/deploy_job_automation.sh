#!/bin/bash
# Deploy job automation workers
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

npx wrangler deploy --config "${PROJECT_ROOT}/typescript/job-automation/workers/wrangler.toml" --env production
