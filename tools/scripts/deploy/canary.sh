#!/usr/bin/env bash

set -euo pipefail

WRANGLER_BIN="${WRANGLER_BIN:-wrangler}"
NEW_VERSION="${NEW_VERSION:-}"
STABLE_VERSION="${STABLE_VERSION:-}"

if [[ -z "$NEW_VERSION" || -z "$STABLE_VERSION" ]]; then
  echo "Usage: NEW_VERSION=<id> STABLE_VERSION=<id> $0" >&2
  exit 1
fi

run_step() {
  local new_pct="$1"
  local stable_pct="$2"
  local label="$3"

  echo "Canary step: $label ($new_pct/$stable_pct)"
  "$WRANGLER_BIN" versions deploy "$NEW_VERSION@$new_pct" "$STABLE_VERSION@$stable_pct"
  "$(dirname "$0")/health-gate.sh"
}

run_step 10 90 "10%"
run_step 50 50 "50%"
run_step 100 0 "100%"

echo "Canary rollout completed"
