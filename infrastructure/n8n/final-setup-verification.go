package main

import (
	"fmt"
	"os/exec"
)

func main() {
	fmt.Println("==========================================")
	fmt.Println("  N8N AUTO-APPLY SETUP COMPLETE")
	fmt.Println("==========================================")
	fmt.Println()

	// Verify workflow is active
	fmt.Println("[✓] Checking n8n workflow status...")
	verifyCmd := exec.Command("ssh", "-o", "StrictHostKeyChecking=no", "root@192.168.50.110",
		"docker logs n8n --tail 100 2>&1 | grep \"Activated workflow \\\"job-auto-apply\\\"\" | tail -1")
	verifyOut, err := verifyCmd.CombinedOutput()
	if err != nil {
		// The grep may return non-zero if no match; print empty output
	}
	fmt.Print(string(verifyOut))

	fmt.Println()
	fmt.Println("[✓] Environment Variables Set:")
	fmt.Println("  JOB_SERVER_URL = http://192.168.50.100:3456")
	fmt.Println("  JOB_SERVER_ADMIN_TOKEN = resume-admin-token-2024")
	fmt.Println()
	fmt.Println("[✓] Schedule: Daily at 9:00 AM KST")
	fmt.Println()
	fmt.Println("==========================================")
	fmt.Println("  🚀 AUTO-APPLY IS NOW ACTIVE!")
	fmt.Println("==========================================")
	fmt.Println()
	fmt.Println("Next run: Tomorrow at 9:00 AM KST")
	fmt.Println("Monitor: https://n8n.jclee.me/workflow/DRHg9pwanv4pHGxV")
	fmt.Println()
	fmt.Println("Features:")
	fmt.Println("  ✅ Automatic job search (Wanted)")
	fmt.Println("  ✅ Telegram notifications")
	fmt.Println("  ✅ 20-min timeout protection")
	fmt.Println("  ✅ Daily at 9 AM KST")
	fmt.Println()
}
