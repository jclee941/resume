// activate-auto-apply.go deploys and activates the job-auto-apply n8n workflow.
package main

import (
	"flag"
	"fmt"
	"os"
	"os/exec"
	"regexp"
	"strings"
)

const (
	red    = "\033[0;31m"
	green  = "\033[0;32m"
	yellow = "\033[1;33m"
	nc     = "\033[0m"
)

func main() {
	// CLI flags
	url := flag.String("url", "https://n8n.jclee.me", "n8n instance URL")
	workflowFile := flag.String("file", "infrastructure/n8n/job-auto-apply-workflow.json", "workflow JSON file path")
	flag.Parse()

	fmt.Println("=== n8n Auto-Apply Workflow Activation ===")
	fmt.Println()

	// Check N8N_API_KEY
	apiKey := os.Getenv("N8N_API_KEY")
	if apiKey == "" {
		fmt.Printf("%s[ERROR] N8N_API_KEY not set%s\n", red, nc)
		fmt.Println("Please set your n8n API key:")
		fmt.Println("  export N8N_API_KEY=your-api-key")
		fmt.Println()
		fmt.Println("Get your API key from: https://n8n.jclee.me/settings/api")
		os.Exit(1)
	}

	n8nURL := *url
	if envURL := os.Getenv("N8N_URL"); envURL != "" {
		n8nURL = envURL
	}

	fmt.Printf("[INFO] n8n URL: %s\n", n8nURL)
	fmt.Printf("[INFO] Workflow file: %s\n", *workflowFile)
	fmt.Println()

	// Check if workflow file exists
	if _, err := os.Stat(*workflowFile); os.IsNotExist(err) {
		fmt.Printf("%s[ERROR] Workflow file not found: %s%s\n", red, *workflowFile, nc)
		os.Exit(1)
	}

	// Check curl availability
	curlPath, lookErr := exec.LookPath("curl")
	if lookErr != nil {
		fmt.Printf("%s[ERROR] curl is required but not installed%s\n", red, nc)
		os.Exit(1)
	}

	// Extract workflow ID using grep
	workflowID := extractWorkflowID(*workflowFile)
	if workflowID == "" {
		fmt.Printf("%s[ERROR] Could not extract workflow ID from workflow file%s\n", red, nc)
		os.Exit(1)
	}
	fmt.Printf("[INFO] Workflow ID from file: %s\n", workflowID)

	// Test n8n connection
	fmt.Println()
	fmt.Println("[INFO] Testing n8n connection...")

	authHeader := "X-N8N-API-KEY: " + apiKey
	exists, httpStatus := checkWorkflowExists(curlPath, n8nURL, authHeader, workflowID)

	if httpStatus == "200" {
		fmt.Printf("%s[OK] Workflow already exists in n8n%s\n", green, nc)
		exists = true
	} else if httpStatus == "404" {
		fmt.Printf("%s[INFO] Workflow not found, needs to be created%s\n", yellow, nc)
		exists = false
	} else {
		fmt.Printf("%s[WARNING] Could not check workflow status (HTTP %s)%s\n", yellow, httpStatus, nc)
		fmt.Println("  This might be due to Cloudflare Access authentication.")
		fmt.Println("  Make sure CF_ACCESS_CLIENT_ID and CF_ACCESS_CLIENT_SECRET are set.")
		exists = false
	}

	// Deploy workflow
	fmt.Println()
	method := "POST"
	urlStr := n8nURL + "/api/v1/workflows"
	if exists {
		fmt.Println("[INFO] Updating existing workflow...")
		method = "PUT"
		urlStr = n8nURL + "/api/v1/workflows/" + workflowID
	} else {
		fmt.Println("[INFO] Creating new workflow...")
	}

	cfID := os.Getenv("CF_ACCESS_CLIENT_ID")
	cfSecret := os.Getenv("CF_ACCESS_CLIENT_SECRET")

	curlOpts := []string{"-s", "-H", authHeader, "-H", "Content-Type: application/json"}
	if cfID != "" && cfSecret != "" {
		curlOpts = append(curlOpts, "-H", "CF-Access-Client-Id: "+cfID)
		curlOpts = append(curlOpts, "-H", "CF-Access-Client-Secret: "+cfSecret)
	}
	curlOpts = append(curlOpts, "-X", method, "-d", "@"+*workflowFile, urlStr)

	deployCmd := exec.Command(curlPath, curlOpts...)
	deployOut, err := deployCmd.CombinedOutput()
	response := string(deployOut)

	if err == nil && strings.Contains(response, `"id"`) {
		newID := extractID(response)
		fmt.Printf("%s[SUCCESS] Workflow deployed with ID: %s%s\n", green, newID, nc)

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
		_, activateErr := activateCmd.CombinedOutput()
		if activateErr == nil {
			fmt.Printf("%s[SUCCESS] Workflow activated!%s\n", green, nc)
			fmt.Println()
			fmt.Println("=== Summary ===")
			fmt.Printf("Workflow ID: %s\n", newID)
			fmt.Println("Schedule: Daily at 9:00 AM KST")
			fmt.Printf("URL: %s/workflow/%s\n", n8nURL, newID)
			fmt.Println()
			fmt.Println("The auto-apply system will now:")
			fmt.Println("  1. Run daily at 9:00 AM KST")
			fmt.Println("  2. Search for jobs on Wanted/JobKorea/Saramin")
			fmt.Println("  3. Apply to matching positions (match score ≥75%)")
			fmt.Println("  4. Send Telegram notifications with results")
		} else {
			fmt.Printf("%s[WARNING] Could not activate automatically%s\n", yellow, nc)
			fmt.Printf("Please activate manually at: %s/workflow/%s\n", n8nURL, newID)
		}
	} else {
		fmt.Printf("%s[ERROR] Failed to deploy workflow%s\n", red, nc)
		fmt.Println("Response:", response)
		os.Exit(1)
	}

	fmt.Println()
	fmt.Println("=== Next Steps ===")
	fmt.Printf("1. Verify workflow is active: %s/workflow/%s\n", n8nURL, workflowID)
	fmt.Println("2. Check Telegram bot is configured in n8n credentials")
	fmt.Println("3. Set JOB_SERVER_URL and JOB_SERVER_ADMIN_TOKEN in n8n environment")
	fmt.Println("4. Test with manual trigger or wait for next scheduled run (9:00 AM KST)")
	fmt.Println()
	fmt.Println("To check workflow status:")
	fmt.Printf("  curl -H 'X-N8N-API-KEY: $N8N_API_KEY' %s/api/v1/workflows/%s | jq\n", n8nURL, workflowID)
}

func extractWorkflowID(file string) string {
	grepCmd := exec.Command("grep", "-o", `"id": "[^"]*"`, file)
	grepOut, err := grepCmd.CombinedOutput()
	if err != nil {
		return ""
	}
	line := string(grepOut)
	parts := strings.Split(line, `"`)
	if len(parts) >= 4 {
		return parts[3]
	}
	return ""
}

func checkWorkflowExists(curlPath, n8nURL, authHeader, workflowID string) (bool, string) {
	checkCmd := exec.Command(curlPath, "-s", "-o", "/dev/null", "-w", "%{http_code}",
		"-H", authHeader, n8nURL+"/api/v1/workflows/"+workflowID)
	checkOut, err := checkCmd.CombinedOutput()
	httpStatus := string(checkOut)
	if err != nil {
		httpStatus = "000"
	}
	httpStatus = strings.TrimSpace(httpStatus)
	return httpStatus == "200", httpStatus
}

func extractID(response string) string {
	patterns := []string{`"id": "`, `"id":"`}
	for _, pattern := range patterns {
		idx := strings.Index(response, pattern)
		if idx != -1 {
			start := idx + len(pattern)
			end := strings.Index(response[start:], `"`)
			if end != -1 {
				return response[start : start+end]
			}
		}
	}

	// Fallback: use regex
	re := regexp.MustCompile(`"id":\s*"([^"]*)"`)
	matches := re.FindStringSubmatch(response)
	if len(matches) >= 2 {
		return matches[1]
	}
	return ""
}
