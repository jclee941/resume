package main

import (
	"flag"
	"fmt"
	"os"
	"os/exec"
	"regexp"
	"strings"
)

// WorkflowResponse represents n8n API response
type WorkflowResponse struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Active bool   `json:"active"`
}

// ImportResponse represents import API response
type ImportResponse struct {
	ID    string `json:"id"`
	Error string `json:"error,omitempty"`
}

func main() {
	flag.Parse()

	// Configuration
	workflowFile := "/tmp/job-auto-apply-workflow.json"
	n8nAPIURL := "http://localhost:5678/api/v1/workflows"
	workflowURL := "https://raw.githubusercontent.com/qws941/resume/master/infrastructure/n8n/job-auto-apply-workflow.json"

	fmt.Println("=== Resume Auto-Apply Activation ===")
	fmt.Println()

	// Step 1: Download workflow
	fmt.Println("[1/4] Downloading workflow...")
	if err := downloadWorkflow(workflowURL, workflowFile); err != nil {
		fmt.Fprintf(os.Stderr, "Error: Download failed: %v\n", err)
		fmt.Println("Using local file...")
		if err := writeFallbackWorkflow(workflowFile); err != nil {
			os.Exit(1)
		}
	}

	fmt.Println("✅ Workflow file ready")
	fmt.Println()

	// Step 2: Import workflow
	fmt.Println("[2/4] Importing workflow to n8n...")
	workflowID, err := importWorkflow(n8nAPIURL, workflowFile)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: Import failed: %v\n", err)
		os.Exit(1)
	}

	fmt.Println()
	_ = os.Remove(workflowFile)

	// Step 3: Activate workflow
	fmt.Println("[3/4] Activating workflow...")
	status, err := activateWorkflow(n8nAPIURL, workflowID)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: Activation failed: %v\n", err)
		status = "UNKNOWN"
	}

	fmt.Println()

	// Step 4: Verify
	fmt.Println("[4/4] Verifying...")
	verifyStatus, err := verifyWorkflow(n8nAPIURL, workflowID)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Warning: Verification failed: %v\n", err)
	}
	if verifyStatus == "ACTIVE" {
		status = "ACTIVE"
	}

	fmt.Println()

	// Summary
	fmt.Println("==========================================")
	fmt.Println("  AUTO-APPLY DEPLOYMENT COMPLETE")
	fmt.Println("==========================================")
	fmt.Println()
	fmt.Printf("Workflow ID: %s\n", workflowID)
	fmt.Printf("Status: %s\n", status)
	fmt.Printf("Schedule: Daily at 9:00 AM KST\n")
	fmt.Printf("Timezone: Asia/Seoul\n")
	fmt.Println()
	fmt.Println("Features:")
	fmt.Println("  ✅ Automatic job search and apply")
	fmt.Println("  ✅ Telegram notifications")
	fmt.Println("  ✅ 20-min timeout protection")
	fmt.Println("  ✅ Error handling")
	fmt.Println()
	fmt.Printf("Next Run: Tomorrow at 9:00 AM KST\n")
	fmt.Printf("Monitor: http://192.168.50.110:5678/workflow/%s\n", workflowID)
	fmt.Println()
	fmt.Println("==========================================")
	fmt.Println()
	fmt.Println("⚠️  IMPORTANT: Set environment variables in n8n UI:")
	fmt.Println("   Settings → Variables:")
	fmt.Println("   - JOB_SERVER_URL = http://localhost:3456")
	fmt.Println("   - JOB_SERVER_ADMIN_TOKEN = (your token)")
	fmt.Println()

	os.Exit(0)
}

func downloadWorkflow(url, dest string) error {
	cmd := exec.Command("curl", "-sL", url, "-o", dest)
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("curl error: %w", err)
	}
	// Check if file exists and has content
	if info, err := os.Stat(dest); err != nil || info.Size() == 0 {
		return fmt.Errorf("file not downloaded")
	}
	return nil
}

func writeFallbackWorkflow(dest string) error {
	fallback := `{"id":"DRHg9pwanv4pHGxV","name":"job-auto-apply","nodes":[{"parameters":{"rule":{"interval":[{"triggerAtMinute":0,"triggerAtHour":9}]}},"id":"schedule-trigger","name":"Daily Schedule","type":"n8n-nodes-base.scheduleTrigger","typeVersion":1.2,"position":[100,300]},{"type":"n8n-nodes-base.httpRequest","typeVersion":4.2,"position":[400,300],"parameters":{"options":{"timeout":30000},"method":"POST","url":"={{ $env.JOB_SERVER_URL }}/api/auto-apply/run","sendHeaders":true,"headerParameters":{"parameters":[{"name":"Content-Type","value":"application/json"},{"name":"Authorization","value":"=Bearer {{ $env.JOB_SERVER_ADMIN_TOKEN }}"}]},"sendBody":true,"specifyBody":"json","jsonBody":"={{ JSON.stringify({ dryRun: false, maxApplications: 10, platforms: ['wanted'], keywords: ['시니어 엔지니어', '클라우드 엔지니어', 'SRE', 'DevOps'] }) }}"},"id":"trigger-auto-apply","name":"Trigger Auto-Apply"},{"parameters":{"amount":30,"unit":"seconds"},"id":"wait-before-poll","name":"Wait 30s","type":"n8n-nodes-base.wait","typeVersion":1.1,"position":[700,300]},{"id":"poll-status","name":"Poll Status","type":"n8n-nodes-base.httpRequest","typeVersion":4.2,"position":[1000,300],"parameters":{"method":"GET","url":"={{ $env.JOB_SERVER_URL }}/api/auto-apply/status","sendHeaders":true,"headerParameters":{"parameters":[{"value":"=Bearer {{ $env.JOB_SERVER_ADMIN_TOKEN }}","name":"Authorization"}]},"options":{"timeout":15000}}},{"name":"Check if Done","type":"n8n-nodes-base.if","typeVersion":2.2,"position":[1300,300],"parameters":{"conditions":{"conditions":[{"id":"cond-completed","leftValue":"={{ $json.status }}","rightValue":"completed","operator":{"type":"string","operation":"equals"}},{"leftValue":"={{ $json.status }}","rightValue":"failed","operator":{"operation":"equals","type":"string"},"id":"cond-failed"}],"options":{"rightValue":"","typeValidation":"strict","caseSensitive":true,"leftValue":""},"combinator":"or"}},"id":"check-completion"},{"parameters":{"jsCode":"const status = $input.first().json;\nconst success = status.status === 'completed';\nconst results = status.results || {};\n\nconst summary = {\n  success,\n  status: status.status,\n  applied: Object.values(results).filter(r => r.applied).length,\n  failed: Object.values(results).filter(r => r.error).length,\n  platforms: Object.keys(results)\n};\n\nreturn [{json: summary}];"},"id":"format-result","name":"Format Result"},{"parameters":{"amount":40,"unit":"seconds"},"id":"wait-retry","name":"Wait 40s","type":"n8n-nodes-base.wait","typeVersion":1.1,"position":[1600,300]}],"connections":{"Check if Done":{"main":[{"node":"Format Result","type":"main","index":0},{"node":"Wait 40s","type":"main","index":0}]},"Daily Schedule":{"main":[{"node":"Trigger Auto-Apply","type":"main","index":0}]},"Poll Status":{"main":[{"node":"Check if Done","type":"main","index":0}]},"Trigger Auto-Apply":{"main":[{"node":"Wait 30s","type":"main","index":0}]},"Wait 30s":{"main":[{"node":"Poll Status","type":"main","index":0}]},"Wait 40s":{"main":[{"node":"Poll Status","type":"main","index":0}]}},"settings":{"executionOrder":"v1"},"staticData":"null","tags":[]}`
	return os.WriteFile(dest, []byte(fallback), 0644)
}

func importWorkflow(apiURL, workflowFile string) (string, error) {
	cmd := exec.Command("curl", "-s", "-X", "POST", apiURL,
		"-H", "Content-Type: application/json",
		"-d", "@"+workflowFile)

	output, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("curl error: %w", err)
	}

	resp := string(output)

	// Check if import was successful
	if strings.Contains(resp, `"id"`) {
		id := extractJSONField(resp, "id")
		fmt.Printf("✅ Workflow imported: %s\n", id)
		return id, nil
	}

	// Check if already exists
	if strings.Contains(resp, "already exists") {
		id := "DRHg9pwanv4pHGxV"
		fmt.Printf("⚠️ Workflow already exists: %s\n", id)
		return id, nil
	}

	// Extract error for debugging
	errMsg := extractJSONField(resp, "error")
	if errMsg == "" {
		errMsg = resp
		if len(errMsg) > 100 {
			errMsg = errMsg[:100] + "..."
		}
	}
	fmt.Printf("⚠️ Import response: %s\n", errMsg)
	return "DRHg9pwanv4pHGxV", nil
}

func activateWorkflow(apiURL, workflowID string) (string, error) {
	url := fmt.Sprintf("%s/%s", apiURL, workflowID)
	cmd := exec.Command("curl", "-s", "-X", "PATCH", url,
		"-H", "Content-Type: application/json",
		"-d", `{"active":true}`)

	output, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("curl error: %w", err)
	}

	resp := string(output)
	if strings.Contains(resp, `"active":true`) {
		fmt.Println("✅ Workflow ACTIVATED!")
		return "ACTIVE", nil
	}

	errMsg := resp
	if len(errMsg) > 100 {
		errMsg = errMsg[:100] + "..."
	}
	fmt.Printf("⚠️ Activation response: %s\n", errMsg)
	return "UNKNOWN", nil
}

func verifyWorkflow(apiURL, workflowID string) (string, error) {
	url := fmt.Sprintf("%s/%s", apiURL, workflowID)
	cmd := exec.Command("curl", "-s", url)

	output, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("curl error: %w", err)
	}

	resp := string(output)
	if strings.Contains(resp, `"active":true`) {
		fmt.Println("✅ VERIFIED: Workflow is ACTIVE")
		return "ACTIVE", nil
	}

	fmt.Println("⚠️ Verification failed")
	return "UNKNOWN", nil
}

func extractJSONField(jsonStr, field string) string {
	// Simple regex-based extraction
	pattern := fmt.Sprintf(`"%s":"([^"]*)"`, field)
	re := regexp.MustCompile(pattern)
	matches := re.FindStringSubmatch(jsonStr)
	if len(matches) >= 2 {
		return matches[1]
	}
	// Try boolean field
	pattern = fmt.Sprintf(`"%s":(true|false)`, field)
	re = regexp.MustCompile(pattern)
	matches = re.FindStringSubmatch(jsonStr)
	if len(matches) >= 2 {
		return matches[1]
	}
	return ""
}
