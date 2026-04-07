#!/bin/bash
# Auto-apply runner script - runs directly on resume host
# This is a backup that bypasses n8n entirely

set -e

LOG_FILE="/home/jclee/.claude/logs/auto-apply.log"
LOCK_FILE="/tmp/auto-apply.lock"
RESUME_DIR="/home/jclee/dev/resume"

echo "=== Auto-Apply Direct Runner ==="
echo "Started at: $(date)"

# Create log directory
mkdir -p "$(dirname "$LOG_FILE")"

# Check lock
if [ -f "$LOCK_FILE" ]; then
  PID=$(cat "$LOCK_FILE")
  if ps -p "$PID" >/dev/null 2>&1; then
    echo "Another instance is running (PID: $PID)"
    exit 1
  fi
fi

# Create lock
echo $$ >"$LOCK_FILE"

# Cleanup on exit
trap 'rm -f "$LOCK_FILE"' EXIT

# Run auto-apply
cd "$RESUME_DIR/apps/job-server"
echo "Running: node src/auto-apply/cli.js apply --max=5"
node src/auto-apply/cli.js apply --max=5 2>&1 | tee -a "$LOG_FILE"

EXIT_CODE=${PIPESTATUS[0]}

if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ Auto-apply completed successfully at $(date)"
else
  echo "❌ Auto-apply failed with exit code $EXIT_CODE at $(date)"
fi

exit $EXIT_CODE
