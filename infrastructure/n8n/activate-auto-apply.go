package main

import (
	"fmt"
	"os"
	"os/exec"
	"strings"
)

func main() {
	// Colors
	RED := "\033[0;31m"
	GREEN := "\033[0;32m"
	YELLOW := "\033[1;33m"
	NC := "\033[0m"

	fmt.Println("=== n8n Auto-Apply Workflow Activation ===")
	fmt.Println()

	// Check environment
	apiKey := os.Getenv("N8N_API_KEY")
	if apiKey == "" {
		fmt.Printf("%s[ERROR] N8N_API_KEY not set%s\n", RED, NC)
		fmt.Println("Please set your n8n API key:")
		fmt.Println("  export N8N_API_KEY=your-api-key")
		fmt.Println()
		fmt.Println("Get your API key from: https://n8n.jclee.me/settings/api")
		os.Exit(1)
	}

	n8nURL := os.Getenv("N8N_URL")
	if n8nURL == "" {
		n8nURL = "https://n8n.jclee.me"
	}
	workflowFile := "infrastructure/n8n/job-auto-apply-workflow.json"

	fmt.Println("[INFO] n8n URL:", n8nURL)
	fmt.Println("[INFO] Workflow file:", workflowFile)
	fmt.Println()

	// Check if workflow file exists
	if _, err := os.Stat(workflowFile); os.IsNotExist(err) {
		fmt.Printf("%s[ERROR] Workflow file not found: %s%s\n", RED, workflowFile, NC)
		os.Exit(1)
	}

	// Check workflow ID
	workflowID := ""
	grepCmd := exec.Command("grep", "-o", `"id": "[^"]*"`, workflowFile)
	grepOut, err := grepCmd.CombinedOutput()
	if err == nil && len(grepOut) > 0 {
		line := string(grepOut)
		parts := strings.Split(line, `"`)
		if len(parts) >= 4 {
			workflowID = parts[3]
		}
	}
	fmt.Println("[INFO] Workflow ID from file:", workflowID)

	// Test n8n connection
	fmt.Println()
	fmt.Println("[INFO] Testing n8n connection...")

	curlPath, lookErr := exec.LookPath("curl")
	if lookErr != nil {
		fmt.Printf("%s[ERROR] curl is required but not installed%s\n", RED, NC)
		os.Exit(1)
	}

	authHeader := "X-N8N-API-KEY: " + apiKey

	// Check if workflow exists
	checkCmd := exec.Command(curlPath, "-s", "-o", "/dev/null", "-w", "%{http_code}",
		"-H", authHeader,
		n8nURL+"/api/v1/workflows/"+workflowID)
	checkOut, err := checkCmd.CombinedOutput()
	httpStatus := string(checkOut)
	if err != nil {
		httpStatus = "000"
	}
	httpStatus = strings.TrimSpace(httpStatus)

	exists := false
	if httpStatus == "200" {
		fmt.Printf("%s[OK] Workflow already exists in n8n%s\n", GREEN, NC)
		exists = true
	} else if httpStatus == "404" {
		fmt.Printf("%s[INFO] Workflow not found, needs to be created%s\n", YELLOW, NC)
		exists = false
	} else {
		fmt.Printf("%s[WARNING] Could not check workflow status (HTTP %s)%s\n", YELLOW, httpStatus, NC)
		fmt.Println("  This might be due to Cloudflare Access authentication.")
		fmt.Println("  Make sure CF_ACCESS_CLIENT_ID and CF_ACCESS_CLIENT_SECRET are set.")
		exists = false
	}

	// Deploy workflow
	fmt.Println()
	var method, url string
	if exists {
		fmt.Println("[INFO] Updating existing workflow...")
		method = "PUT"
		url = n8nURL + "/api/v1/workflows/" + workflowID
	} else {
		fmt.Println("[INFO] Creating new workflow...")
		method = "POST"
		url = n8nURL + "/api/v1/workflows"
	}

	curlOpts := []string{"-s", "-H", authHeader, "-H", "Content-Type: application/json"}
	cfID := os.Getenv("CF_ACCESS_CLIENT_ID")
	cfSecret := os.Getenv("CF_ACCESS_CLIENT_SECRET")
	if cfID != "" && cfSecret != "" {
		curlOpts = append(curlOpts, "-H", "CF-Access-Client-Id: "+cfID)
		curlOpts = append(curlOpts, "-H", "CF-Access-Client-Secret: "+cfSecret)
	}
	curlOpts = append(curlOpts, "-X", method, "-d", "@"+workflowFile, url)

	deployCmd := exec.Command(curlPath, curlOpts...)
	deployOut, err := deployCmd.CombinedOutput()
	response := string(deployOut)

	if err == nil && strings.Contains(response, `"id"`) {
		newID := ""
		idx := strings.Index(response, `"id": "`)
		if idx != -1 {
			start := idx + len(`"id": "`)
			end := strings.Index(response[start:], `"`)
			if end != -1 {
				newID = response[start : start+end]
			}
		}
		if newID == "" {
			idx = strings.Index(response, `"id":"`)
			if idx != -1 {
				start := idx + len(`"id":"`)
				end := strings.Index(response[start:], `"`)
				if end != -1 {
					newID = response[start : start+end]
				}
			}
		}
		fmt.Printf("%s[SUCCESS] Workflow deployed with ID: %s%s\n", GREEN, newID, NC)

		// Activate workflow
		fmt.Println()
		fmt.Println("[INFO] Activating workflow...")
		activateOpts := []string{"-s", "-H", authHeader, "-H", "Content-Type: application/json"}
		if cfID != "" && cfSecret != "" {
			activateOpts = append(activateOpts, "-H", "CF-Access-Client-Id: "+cfID)
			activateOpts = append(activateOpts, "-H", "CF-Access-Client-Secret: "+cfSecret)
		}
		activateOpts = append(activateOpts, "-X", "PATCH", "-d", `{"active": true}`, n8nURL+"/api/v1/workflows/"+newID)

		activateCmd := exec.Command(curlPath, activateOpts...)
		_, err := activateCmd.CombinedOutput()
		if err == nil {
			fmt.Printf("%s[SUCCESS] Workflow activated!%s\n", GREEN, NC)
			fmt.Println()
			fmt.Println("=== Summary ===")
			fmt.Println("Workflow ID:", newID)
			fmt.Println("Schedule: Daily at 9:00 AM KST")
			fmt.Println("URL:", n8nURL+"/workflow/"+newID)
			fmt.Println()
			fmt.Println("The auto-apply system will now:")
			fmt.Println("  1. Run daily at 9:00 AM KST")
			fmt.Println("  2. Search for jobs on Wanted/JobKorea/Saramin")
			fmt.Println("  3. Apply to matching positions (match score ≥75%)")
			fmt.Println("  4. Send Telegram notifications with results")
		} else {
			fmt.Printf("%s[WARNING] Could not activate automatically%s\n", YELLOW, NC)
			fmt.Println("Please activate manually at:", n8nURL+"/workflow/"+newID)
		}
	} else {
		fmt.Printf("%s[ERROR] Failed to deploy workflow%s\n", RED, NC)
		fmt.Println("Response:", response)
		os.Exit(1)
	}

	fmt.Println()
	fmt.Println("=== Next Steps ===")
	fmt.Println("1. Verify workflow is active:", n8nURL+"/workflow/"+workflowID)
	fmt.Println("2. Check Telegram bot is configured in n8n credentials")
	fmt.Println("3. Set JOB_SERVER_URL and JOB_SERVER_ADMIN_TOKEN in n8n environment")
	fmt.Println("4. Test with manual trigger or wait for next scheduled run (9:00 AM KST)")
	fmt.Println()
	fmt.Println("To check workflow status:")
	fmt.Printf("  curl -H 'X-N8N-API-KEY: $N8N_API_KEY' %s/api/v1/workflows/%s | jq\n", n8nURL, workflowID)
}
