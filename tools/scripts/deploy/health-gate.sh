#!/usr/bin/env bash

set -euo pipefail

TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-10}"
RETRIES="${RETRIES:-3}"
SLEEP_SECONDS="${SLEEP_SECONDS:-5}"

ENDPOINTS=(
  "https://resume.jclee.me/healthz"
  "https://resume.jclee.me/job/api/health"
)

check_endpoint() {
  local url="$1"
  local attempt=1

  while [[ "$attempt" -le "$RETRIES" ]]; do
    local status
    status="$(curl -sS -m "$TIMEOUT_SECONDS" -o /dev/null -w "%{http_code}" "$url" || true)"
    if [[ "$status" == "200" ]]; then
      printf '[OK] %s (attempt %s/%s)\n' "$url" "$attempt" "$RETRIES"
      return 0
    fi
    printf '[WARN] %s status=%s (attempt %s/%s)\n' "$url" "${status:-curl-error}" "$attempt" "$RETRIES"
    attempt=$((attempt + 1))
    sleep "$SLEEP_SECONDS"
  done

  printf '[FAIL] %s did not become healthy\n' "$url" >&2
  return 1
}

for url in "${ENDPOINTS[@]}"; do
  check_endpoint "$url"
done

printf 'Health gate passed\n'
