#!/bin/bash
#
# Resume Automation Setup Script
# Run this once to set up automated resume sync and apply
#
# Usage: sudo ./setup-automation.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
USER_HOME="$HOME"

echo "=================================="
echo "Resume Automation Setup"
echo "=================================="
echo ""

# Check if running as root for systemd setup
if [ "$EUID" -eq 0 ]; then
  echo "⚠️  Warning: Running as root. Service will be created for root user."
  SERVICE_USER="root"
else
  SERVICE_USER="$USER"
fi

# Create log directory
echo "📁 Creating log directory..."
mkdir -p "$USER_HOME/.opencode/data/automation-logs"

# Create environment file
echo ""
echo "🔐 Creating environment configuration..."
ENV_FILE="$PROJECT_ROOT/.env.automation"

if [ -f "$ENV_FILE" ]; then
  echo "⚠️  Environment file already exists: $ENV_FILE"
  read -p "Overwrite? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Skipping environment setup."
  fi
else
  cat >"$ENV_FILE" <<'EOF'
# Resume Automation Environment Variables
# Source this file before running automation: source .env.automation

# JobKorea Credentials
export RESUME_JOBKOREA_USER=qws941
export RESUME_JOBKOREA_PASS=bingogo1l7

# Wanted Credentials
export RESUME_WANTED_EMAIL=qws941@kakao.com
export RESUME_WANTED_PASS=bingogo1l7

# Automation Settings
export RESUME_MAX_APPLY=5
export RESUME_DRY_RUN=false

# Optional: Notification settings
# export RESUME_NOTIFY_EMAIL=your-email@example.com
# export RESUME_NOTIFY_WEBHOOK=https://hooks.slack.com/...
EOF
  echo "✅ Created: $ENV_FILE"
  echo "⚠️  Please review and update credentials in $ENV_FILE"
fi

# Create systemd service (optional)
echo ""
echo "🔧 Creating systemd service..."

SYSTEMD_SERVICE="/etc/systemd/system/resume-automation.service"
SYSTEMD_TIMER="/etc/systemd/system/resume-automation.timer"

if [ "$EUID" -eq 0 ]; then
  cat >"$SYSTEMD_SERVICE" <<EOF
[Unit]
Description=Resume Auto-Apply and Sync Automation
After=network.target

[Service]
Type=oneshot
User=$SERVICE_USER
WorkingDirectory=$PROJECT_ROOT
Environment=NODE_ENV=production
EnvironmentFile=$PROJECT_ROOT/.env.automation
ExecStart=/usr/bin/node $PROJECT_ROOT/tools/automation/resume-automation.js
StandardOutput=append:/var/log/resume-automation.log
StandardError=append:/var/log/resume-automation.log

[Install]
WantedBy=multi-user.target
EOF

  cat >"$SYSTEMD_TIMER" <<EOF
[Unit]
Description=Run Resume Automation daily at 9 AM

[Timer]
OnCalendar=*-*-* 09:00:00
Persistent=true

[Install]
WantedBy=timers.target
EOF

  echo "✅ Created systemd service and timer"
  echo ""
  echo "To enable and start:"
  echo "  sudo systemctl daemon-reload"
  echo "  sudo systemctl enable resume-automation.timer"
  echo "  sudo systemctl start resume-automation.timer"
  echo ""
  echo "To check status:"
  echo "  sudo systemctl status resume-automation.timer"
  echo "  sudo journalctl -u resume-automation -f"
else
  echo "⏭️  Skipping systemd setup (requires root). Use crontab instead."
fi

# Create crontab entry
echo ""
echo "📅 Setting up crontab..."
CRON_LINE="0 9 * * * cd $PROJECT_ROOT && source $PROJECT_ROOT/.env.automation && /usr/bin/node $PROJECT_ROOT/tools/automation/resume-automation.js >> $USER_HOME/.opencode/data/automation-logs/cron.log 2>&1"

# Check if crontab already has this entry
if crontab -l 2>/dev/null | grep -q "resume-automation.js"; then
  echo "⚠️  Crontab entry already exists"
else
  (
    crontab -l 2>/dev/null
    echo "$CRON_LINE"
  ) | crontab -
  echo "✅ Added crontab entry (runs daily at 9 AM)"
fi

# Test run
echo ""
echo "🧪 Testing automation (dry-run mode)..."
cd "$PROJECT_ROOT"
source "$ENV_FILE"
export RESUME_DRY_RUN=true

/usr/bin/node "$PROJECT_ROOT/tools/automation/resume-automation.js" || {
  echo "⚠️  Test run had issues, but setup is complete."
  echo "   Check logs at: $USER_HOME/.opencode/data/automation-logs/"
}

echo ""
echo "=================================="
echo "Setup Complete!"
echo "=================================="
echo ""
echo "📋 Next Steps:"
echo "1. Review/edit credentials: $ENV_FILE"
echo "2. Run manually: source .env.automation && node tools/automation/resume-automation.js"
echo "3. Check logs: tail -f $USER_HOME/.opencode/data/automation-logs/automation-$(date +%Y-%m-%d).log"
echo ""
echo "⏰ Scheduled Runs:"
echo "   - Daily at 9:00 AM (crontab)"
if [ "$EUID" -eq 0 ]; then
  echo "   - Daily at 9:00 AM (systemd timer - enable with: sudo systemctl enable resume-automation.timer)"
fi
echo ""
echo "🔧 Useful Commands:"
echo "   Manual run:        node tools/automation/resume-automation.js"
echo "   Check sessions:    node apps/job-server/scripts/auth-persistent.js --status"
echo "   View logs:         ls -la ~/.opencode/data/automation-logs/"
echo "   Test sync:         cd apps/job-server && node scripts/profile-sync.js jobkorea --diff"
echo ""
