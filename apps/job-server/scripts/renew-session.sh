#!/bin/bash
#
# Session Renewal Automation for Wanted
# Runs before auto-apply to ensure valid session
#

set -e

LOG_FILE="/home/jclee/.claude/logs/session-renewal.log"
RESUME_DIR="/home/jclee/dev/resume"

# Create log directory
mkdir -p "$(dirname "$LOG_FILE")"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=== Session Renewal Started ==="

# Check current session
cd "$RESUME_DIR/apps/job-server"
node -e "
const { SessionManager } = require('./src/shared/services/session');
const status = SessionManager.checkHealth('wanted', 4 * 60 * 60 * 1000);
console.log(JSON.stringify(status, null, 2));
process.exit(status.valid ? 0 : 1);
" 2>&1 | tee -a "$LOG_FILE"

if [ $? -eq 0 ]; then
  log "✅ Session is valid, no renewal needed"
  exit 0
fi

log "⚠️  Session expired or expiring soon, attempting CDP renewal..."

# Check if Chrome is running with remote debugging
if ! curl -s http://127.0.0.1:9222/json/version >/dev/null 2>&1; then
  log "❌ Chrome DevTools not available"
  log "   Please start Chrome with: google-chrome --remote-debugging-port=9222"
  log "   Or login manually and run: node scripts/extract-cookies-cdp.js wanted"

  # Send Telegram notification
  if [ -n "$N8N_WEBHOOK_URL" ]; then
    curl -s -X POST "$N8N_WEBHOOK_URL" \
      -H "Content-Type: application/json" \
      -d '{
        "event": "session_renewal_failed",
        "platform": "wanted",
        "reason": "chrome_devtools_not_available",
        "timestamp": "'$(date -Iseconds)'",
        "message": "⚠️ Wanted session renewal failed. Please login manually."
      }' >/dev/null 2>&1 || true
  fi

  exit 1
fi

# Extract cookies via CDP
log "🔐 Extracting cookies via CDP..."
node "$RESUME_DIR/apps/job-server/scripts/extract-cookies-cdp.js" wanted 2>&1 | tee -a "$LOG_FILE"

# Verify new session
node -e "
const { SessionManager } = require('./src/shared/services/session');
const status = SessionManager.checkHealth('wanted', 24 * 60 * 60 * 1000);
console.log(JSON.stringify(status, null, 2));
process.exit(status.valid ? 0 : 1);
" 2>&1 | tee -a "$LOG_FILE"

if [ $? -eq 0 ]; then
  log "✅ Session renewed successfully"

  # Send success notification
  if [ -n "$N8N_WEBHOOK_URL" ]; then
    curl -s -X POST "$N8N_WEBHOOK_URL" \
      -H "Content-Type: application/json" \
      -d '{
        "event": "session_renewal_success",
        "platform": "wanted",
        "timestamp": "'$(date -Iseconds)'",
        "message": "✅ Wanted session renewed successfully"
      }' >/dev/null 2>&1 || true
  fi

  exit 0
else
  log "❌ Session renewal failed"
  exit 1
fi
