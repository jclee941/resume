#!/usr/bin/env bash

set -euo pipefail

TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-10}"
ENDPOINTS=(
  "https://resume.jclee.me/healthz|portfolio"
  "https://resume.jclee.me/job/api/health|dashboard"
)

failures=0

for item in "${ENDPOINTS[@]}"; do
  url="${item%%|*}"
  name="${item##*|}"

  http_code="$(curl -sS -m "$TIMEOUT_SECONDS" -o /dev/null -w "%{http_code}" "$url" || true)"

  if [[ "$http_code" == "200" ]]; then
    printf '[OK] %s (%s)\n' "$name" "$url"
  else
    printf '[FAIL] %s (%s) status=%s\n' "$name" "$url" "${http_code:-curl-error}"
    failures=$((failures + 1))
  fi
done

if [[ "$failures" -gt 0 ]]; then
  printf 'Health check failed (%s endpoint(s))\n' "$failures" >&2
  exit 1
fi

printf 'All health checks passed\n'
