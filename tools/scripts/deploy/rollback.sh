#!/usr/bin/env bash

set -euo pipefail

WRANGLER_BIN="${WRANGLER_BIN:-wrangler}"
PREVIOUS_VERSION="${PREVIOUS_VERSION:-}"
CURRENT_VERSION="${CURRENT_VERSION:-}"

if [[ -z "$PREVIOUS_VERSION" || -z "$CURRENT_VERSION" ]]; then
  echo "Usage: PREVIOUS_VERSION=<id> CURRENT_VERSION=<id> $0" >&2
  exit 1
fi

echo "Rolling back traffic to previous stable version"
"$WRANGLER_BIN" versions deploy "$PREVIOUS_VERSION@100" "$CURRENT_VERSION@0"

"$(dirname "$0")/health-gate.sh"

echo "Rollback completed"
