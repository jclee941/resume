#!/usr/bin/env bash

set -euo pipefail

WRANGLER_BIN="${WRANGLER_BIN:-wrangler}"
WORKER_NAME="${WORKER_NAME:-resume-portfolio}"
NEW_VERSION="${NEW_VERSION:-}"
STABLE_VERSION="${STABLE_VERSION:-}"

if [[ -z "$NEW_VERSION" || -z "$STABLE_VERSION" ]]; then
  echo "Usage: NEW_VERSION=<id> STABLE_VERSION=<id> $0" >&2
  exit 1
fi

echo "Starting blue-green deploy for $WORKER_NAME"
echo "Blue (stable): $STABLE_VERSION"
echo "Green (candidate): $NEW_VERSION"

"$WRANGLER_BIN" versions deploy "$NEW_VERSION@100" "$STABLE_VERSION@0"

"$(dirname "$0")/health-gate.sh"

echo "Blue-green deployment completed"
