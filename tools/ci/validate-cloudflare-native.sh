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

naming_drift_matches="$(rg -n "\\bJOB_DASHBOARD\\b|\\bJOB_AUTOMATION_DB\\b|\\bJOB_CACHE\\b|\\bJOB_RATE_LIMIT\\b" \
  "${ROOT_DIR}/README.md" \
  "${ROOT_DIR}/docs/deployment-guide.md" \
  "${ROOT_DIR}/typescript/job-automation/AGENTS.md" \
  "${ROOT_DIR}/typescript/job-automation/workers/AGENTS.md" \
  "${ROOT_DIR}/typescript/job-automation/workers/README.md" 2>/dev/null || true)"

if [[ -n "${naming_drift_matches}" ]]; then
  echo "ERROR: non-canonical Cloudflare naming aliases found"
  echo "Use canonical names (e.g., job-dashboard-db, SESSIONS, RATE_LIMIT_KV)."
  echo "${naming_drift_matches}"
  exit 1
fi

jsonc_doc_matches="$(rg -n "job-automation/workers/wrangler\\.jsonc" \
  "${ROOT_DIR}/README.md" \
  "${ROOT_DIR}/docs/deployment-guide.md" \
  "${ROOT_DIR}/docs/guides" \
  "${ROOT_DIR}/typescript/job-automation/workers/README.md" 2>/dev/null || true)"

if [[ -n "${jsonc_doc_matches}" ]]; then
  echo "ERROR: documentation drift found for job worker config path"
  echo "Expected active config path: typescript/job-automation/workers/wrangler.toml"
  echo "${jsonc_doc_matches}"
  exit 1
fi

echo "OK: Cloudflare native structure validated"
