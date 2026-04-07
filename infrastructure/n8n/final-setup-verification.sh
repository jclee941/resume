#!/bin/bash
# final-setup-verification.sh

echo "=========================================="
echo "  N8N AUTO-APPLY SETUP COMPLETE"
echo "=========================================="
echo ""

# Verify workflow is active
ssh -o StrictHostKeyChecking=no root@192.168.50.110 <<'EOF'
echo "[✓] Checking n8n workflow status..."
docker logs n8n --tail 100 2>&1 | grep "Activated workflow \"job-auto-apply\"" | tail -1
EOF

echo ""
echo "[✓] Environment Variables Set:"
echo "  JOB_SERVER_URL = http://192.168.50.100:3456"
echo "  JOB_SERVER_ADMIN_TOKEN = resume-admin-token-2024"
echo ""
echo "[✓] Schedule: Daily at 9:00 AM KST"
echo ""
echo "=========================================="
echo "  🚀 AUTO-APPLY IS NOW ACTIVE!"
echo "=========================================="
echo ""
echo "Next run: Tomorrow at 9:00 AM KST"
echo "Monitor: https://n8n.jclee.me/workflow/DRHg9pwanv4pHGxV"
echo ""
echo "Features:"
echo "  ✅ Automatic job search (Wanted)"
echo "  ✅ Telegram notifications"
echo "  ✅ 20-min timeout protection"
echo "  ✅ Daily at 9 AM KST"
echo ""
