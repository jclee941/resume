package main

import (
	"fmt"
	"os"
	"os/exec"
	"strings"
)

func main() {
	n8nInternal := "http://192.168.50.110:5678"
	workflowFile := "/home/jclee/dev/resume/infrastructure/n8n/job-auto-apply-workflow.json"

	fmt.Println("=== Auto-Apply Direct Activation ===")
	fmt.Println()

	// Check if n8n is reachable
	fmt.Println("[1/4] Checking n8n availability...")
	checkCmd := exec.Command("curl", "-s", "--connect-timeout", "5", n8nInternal)
	checkOut, err := checkCmd.CombinedOutput()
	_ = checkOut
	if err != nil {
		fmt.Println("❌ Cannot reach n8n at", n8nInternal)
		fmt.Println("   Please ensure you're on the internal network (192.168.50.x)")
		os.Exit(1)
	}
	fmt.Println("✅ n8n is reachable")
	fmt.Println()

	// Check workflow file
	fmt.Println("[2/4] Checking workflow file...")
	if _, err := os.Stat(workflowFile); os.IsNotExist(err) {
		fmt.Println("❌ Workflow file not found:", workflowFile)
		os.Exit(1)
	}
	fmt.Println("✅ Workflow file found")
	fmt.Println()

	// Try to import workflow
	fmt.Println("[3/4] Importing workflow...")
	importCmd := exec.Command("curl", "-s", "-X", "POST", n8nInternal+"/api/v1/workflows",
		"-H", "Content-Type: application/json",
		"-d", "@"+workflowFile)
	importOut, err := importCmd.CombinedOutput()
	response := string(importOut)
	if err != nil {
		// curl may fail but we still want to check response
	}

	workflowID := "DRHg9pwanv4pHGxV"
	if strings.Contains(response, "\"id\"") {
		// Extract ID: "id":"..."
		idx := strings.Index(response, "\"id\":\"")
		if idx != -1 {
			start := idx + len("\"id\":\"")
			end := strings.Index(response[start:], "\"")
			if end != -1 {
				workflowID = response[start : start+end]
			}
		}
		fmt.Println("✅ Workflow imported:", workflowID)
	} else {
		fmt.Println("⚠️  Import may have failed or already exists")
		truncated := response
		if len(truncated) > 100 {
			truncated = truncated[:100]
		}
		fmt.Println("   Response:", truncated)
		workflowID = "DRHg9pwanv4pHGxV"
	}
	fmt.Println()

	// Try to activate
	fmt.Println("[4/4] Activating workflow...")
	activateCmd := exec.Command("curl", "-s", "-X", "PATCH", n8nInternal+"/api/v1/workflows/"+workflowID,
		"-H", "Content-Type: application/json",
		"-d", `{"active":true}`)
	activateOut, err := activateCmd.CombinedOutput()
	activateResponse := string(activateOut)
	if err != nil {
		// curl may fail
	}

	if strings.Contains(activateResponse, "\"active\":true") {
		fmt.Println("✅ Workflow activated!")
		fmt.Println()
		fmt.Println("=== COMPLETE ===")
		fmt.Println("Workflow ID:", workflowID)
		fmt.Println("Schedule: Daily at 9:00 AM KST")
		fmt.Println("URL:", n8nInternal+"/workflow/"+workflowID)
		fmt.Println()
		fmt.Println("Next run: Tomorrow at 9:00 AM KST")
		fmt.Println("Telegram notifications: Enabled")
	} else {
		fmt.Println("⚠️  Could not activate automatically")
		fmt.Println("   Please activate manually at:")
		fmt.Println("  ", n8nInternal+"/workflow/"+workflowID)
	}

	fmt.Println()
	fmt.Println("To verify:")
	fmt.Printf("  curl %s/api/v1/workflows/%s | jq '.active'\n", n8nInternal, workflowID)
}
