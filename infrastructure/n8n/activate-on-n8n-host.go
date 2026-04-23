package main

import (
	"fmt"
	"os"
	"os/exec"
	"strings"
)

func main() {
	workflowURL := "https://raw.githubusercontent.com/qws941/resume/master/infrastructure/n8n/job-auto-apply-workflow.json"
	workflowFile := "/tmp/job-auto-apply-workflow.json"

	fmt.Println("=== n8n Auto-Apply Activation (On-Host) ===")
	fmt.Println()

	fmt.Println("[1/3] Downloading workflow...")
	downloadCmd := exec.Command("curl", "-sL", workflowURL, "-o", workflowFile)
	downloadOut, err := downloadCmd.CombinedOutput()
	if err != nil {
		fmt.Println("❌ Failed to download workflow")
		fmt.Fprintf(os.Stderr, "%s\n", string(downloadOut))
		os.Exit(1)
	}
	fmt.Println("✅ Workflow downloaded")
	fmt.Println()

	fmt.Println("[2/3] Importing to n8n...")
	importCmd := exec.Command("curl", "-s", "-X", "POST", "http://localhost:5678/api/v1/workflows",
		"-H", "Content-Type: application/json",
		"-d", "@"+workflowFile)
	importOut, err := importCmd.CombinedOutput()
	if err != nil {
		// curl error; still check output
	}
	response := string(importOut)

	workflowID := ""
	if strings.Contains(response, "\"id\"") {
		idx := strings.Index(response, "\"id\":\"")
		if idx == -1 {
			idx = strings.Index(response, "\"id\": \"")
		}
		if idx != -1 {
			start := idx
			for start < len(response) && response[start] != '"' {
				start++
			}
			start++ // skip first quote
			end := start
			for end < len(response) && response[end] != '"' {
				end++
			}
			if end > start {
				workflowID = response[start:end]
			}
		}
		fmt.Println("✅ Workflow imported:", workflowID)
	} else if strings.Contains(response, "already exists") {
		workflowID = "DRHg9pwanv4pHGxV"
		fmt.Println("⚠️  Workflow already exists:", workflowID)
	} else {
		fmt.Println("❌ Import failed:")
		fmt.Println(response)
		os.Exit(1)
	}
	fmt.Println()

	fmt.Println("[3/3] Activating workflow...")
	activateCmd := exec.Command("curl", "-s", "-X", "PATCH", "http://localhost:5678/api/v1/workflows/"+workflowID,
		"-H", "Content-Type: application/json",
		"-d", `{"active":true}`)
	activateOut, err := activateCmd.CombinedOutput()
	if err != nil {
		// curl error
	}
	activateResponse := string(activateOut)

	if strings.Contains(activateResponse, "\"active\":true") {
		fmt.Println("✅ Workflow activated!")
		fmt.Println()
		fmt.Println("=== SUCCESS ===")
		fmt.Println("Workflow ID:", workflowID)
		fmt.Println("Status: Active ✅")
		fmt.Println("Schedule: Daily at 9:00 AM KST")
		fmt.Println()
		fmt.Println("The auto-apply system is now running!")
		fmt.Println("Next run: Tomorrow at 9:00 AM KST")
		fmt.Println()
		fmt.Println("Monitor at: http://192.168.50.110:5678/workflow/" + workflowID)
	} else {
		fmt.Println("❌ Activation failed:")
		fmt.Println(activateResponse)
		os.Exit(1)
	}

	// Cleanup
	os.Remove(workflowFile)
}
