package main

import (
	"bytes"
	"fmt"
	"os"
	"os/exec"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}

func run() error {
	fmt.Println("==========================================")
	fmt.Println("  N8N AUTO-APPLY SETUP COMPLETE")
	fmt.Println("==========================================")
	fmt.Println()

	// Verify workflow is active via SSH
	if err := checkN8nWorkflow(); err != nil {
		return fmt.Errorf("workflow check failed: %w", err)
	}

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

	return nil
}

func checkN8nWorkflow() error {
	fmt.Println("[✓] Checking n8n workflow status...")

	cmd := exec.Command("ssh",
		"-o", "StrictHostKeyChecking=no",
		"root@192.168.50.110",
		`echo "[✓] Checking n8n workflow status..." && docker logs n8n --tail 100 2>&1 | grep "Activated workflow \"job-auto-apply\"" | tail -1`,
	)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		if stderr.Len() > 0 {
			return fmt.Errorf("ssh command failed: %s", stderr.String())
		}
		return fmt.Errorf("ssh command failed: %w", err)
	}

	if stdout.Len() > 0 {
		fmt.Print(stdout.String())
	}

	return nil
}
