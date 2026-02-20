#!/bin/bash
# Deploy portfolio worker
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

npx wrangler deploy --config "${PROJECT_ROOT}/typescript/portfolio-worker/wrangler.toml" --env production
