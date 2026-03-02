#!/bin/bash
# Build portfolio worker
set -e
cd "$(dirname "$0")/../../../apps/portfolio"
npm install --legacy-peer-deps
node generate-worker.js
