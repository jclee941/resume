#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"

echo "== Cloudflare native structure validation =="

if [[ ! -f "${ROOT_DIR}/wrangler.jsonc" ]]; then
  echo "ERROR: missing root wrangler.jsonc"
  exit 1
fi

if [[ ! -f "${ROOT_DIR}/typescript/portfolio-worker/wrangler.toml" ]]; then
  echo "ERROR: missing portfolio wrangler.toml"
  exit 1
fi

legacy_matches="$(rg -n "/home/jclee/applications/resume|cd web\\b|web/wrangler\\.toml|web/worker\\.js" \
  "${ROOT_DIR}/.github/workflows" \
  "${ROOT_DIR}/tools/scripts" \
  "${ROOT_DIR}/README.md" \
  "${ROOT_DIR}/docs/deployment-guide.md" \
  "${ROOT_DIR}/docs/guides" 2>/dev/null || true)"

if [[ -n "${legacy_matches}" ]]; then
  echo "ERROR: legacy Cloudflare patterns found"
  echo "${legacy_matches}"
  exit 1
fi

echo "OK: Cloudflare native structure validated"
