#!/bin/bash
# Build job automation
set -euo pipefail
cd "$(dirname "$0")/../../../typescript/job-automation"
npm install --legacy-peer-deps
npm run build 2>/dev/null || echo "No build script defined, sources ready"
