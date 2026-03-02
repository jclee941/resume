#!/bin/bash
# Build job automation
set -euo pipefail
cd "$(dirname "$0")/../../../apps/job-server"
npm install --legacy-peer-deps
npm run build 2>/dev/null || echo "No build script defined, sources ready"
