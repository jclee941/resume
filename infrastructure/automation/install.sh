#!/bin/bash
# Install systemd timers for resume sync and daily job automation

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
USER=$(whoami)

# Copy service files
sudo cp "$SCRIPT_DIR/resume-sync.service" /etc/systemd/system/resume-sync@.service
sudo cp "$SCRIPT_DIR/resume-sync.timer" /etc/systemd/system/resume-sync@.timer

# Enable and start timer
sudo systemctl daemon-reload
sudo systemctl enable "resume-sync@${USER}.timer"
sudo systemctl start "resume-sync@${USER}.timer"

# Install job daily-run timer
sudo cp "$SCRIPT_DIR/job-daily-run.service" /etc/systemd/system/job-daily-run@.service
sudo cp "$SCRIPT_DIR/job-daily-run.timer" /etc/systemd/system/job-daily-run@.timer
sudo systemctl daemon-reload
sudo systemctl enable "job-daily-run@${USER}.timer"
sudo systemctl start "job-daily-run@${USER}.timer"

echo "✓ Installed resume-sync timer (09:00 KST daily)"
echo "✓ Installed job-daily-run timer (10:00 KST daily)"
echo "  Check: systemctl list-timers --all | grep -E 'resume-sync|job-daily'"
echo "  Logs:  journalctl -u resume-sync@${USER}.service"
echo "  Logs:  journalctl -u job-daily-run@${USER}.service"
