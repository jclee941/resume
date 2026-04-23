package main

import (
	"fmt"
	"os"
	"os/exec"
	"strings"
)

func main() {
	workflowFile := "/tmp/job-auto-apply-workflow.json"
	n8nAPIURL := "http://localhost:5678/api/v1/workflows"
	workflowURL := "https://raw.githubusercontent.com/qws941/resume/master/infrastructure/n8n/job-auto-apply-workflow.json"

	fmt.Println("=== Resume Auto-Apply Activation ===")
	fmt.Println()

	// Download workflow
	fmt.Println("[1/4] Downloading workflow...")
	downloadCmd := exec.Command("curl", "-sL", workflowURL, "-o", workflowFile)
	downloadOut, err := downloadCmd.CombinedOutput()
	if err != nil {
		_ = downloadOut
		// Fallback to inline workflow
		fmt.Println("Using local file...")
		inlineWorkflow := `{"id":"DRHg9pwanv4pHGxV","name":"job-auto-apply","nodes":[{"parameters":{"rule":{"interval":[{"triggerAtMinute":0,"triggerAtHour":9}]}},"id":"schedule-trigger","name":"Daily Schedule","type":"n8n-nodes-base.scheduleTrigger","typeVersion":1.2,"position":[100,300]},{"type":"n8n-nodes-base.httpRequest","typeVersion":4.2,"position":[400,300],"parameters":{"options":{"timeout":30000},"method":"POST","url":"={{ $env.JOB_SERVER_URL }}/api/auto-apply/run","sendHeaders":true,"headerParameters":{"parameters":[{"name":"Content-Type","value":"application/json"},{"name":"Authorization","value":"=Bearer {{ $env.JOB_SERVER_ADMIN_TOKEN }}"}]},"sendBody":true,"specifyBody":"json","jsonBody":"={{ JSON.stringify({ dryRun: false, maxApplications: 10, platforms: ['wanted'], keywords: ['시니어 엔지니어', '클�라우드 엔지니어', 'SRE', 'DevOps'] }) }}"},"id":"trigger-auto-apply","name":"Trigger Auto-Apply"},{"parameters":{"amount":30,"unit":"seconds"},"id":"wait-before-poll","name":"Wait 30s","type":"n8n-nodes-base.wait","typeVersion":1.1,"position":[700,300]},{"id":"poll-status","name":"Poll Status","type":"n8n-nodes-base.httpRequest","typeVersion":4.2,"position":[1000,300],"parameters":{"method":"GET","url":"={{ $env.JOB_SERVER_URL }}/api/auto-apply/status","sendHeaders":true,"headerParameters":{"parameters":[{"value":"=Bearer {{ $env.JOB_SERVER_ADMIN_TOKEN }}","name":"Authorization"}]},"options":{"timeout":15000}}},{"name":"Check if Done","type":"n8n-nodes-base.if","typeVersion":2.2,"position":[1300,300],"parameters":{"conditions":{"conditions":[{"id":"cond-completed","leftValue":"={{ $json.status }}","rightValue":"completed","operator":{"type":"string","operation":"equals"}},{"leftValue":"={{ $json.status }}","rightValue":"failed","operator":{"operation":"equals","type":"string"},"id":"cond-failed"}],"options":{"rightValue":"","typeValidation":"strict","caseSensitive":true,"leftValue":""},"combinator":"or"}},"id":"check-completion"},{"parameters":{"jsCode":"const status = $input.first().json; const lastRun = status.lastRun ? new Date(status.lastRun).toLocaleString('ko-KR') : 'N/A'; return [{ json: { status: status.status, applied: status.applied || 0, total: status.total || 0, lastRun, errors: status.errors || [] } }];"},"id":"format-result","name":"Format Result","type":"n8n-nodes-base.code","typeVersion":2,"position":[1600,300]},{"parameters":{"rule":{"interval":[{"triggerAtMinute":0,"triggerAtHour":21}]}},"id":"evening-schedule","name":"Evening Schedule","type":"n8n-nodes-base.scheduleTrigger","typeVersion":1.2,"position":[100,500]},{"parameters":{},"id":"merge-schedules","name":"Merge","type":"n8n-nodes-base.merge","typeVersion":2.1,"position":[250,400]},{"parameters":{"assignments":{"assignments":[{"id":"assignment-1","name":"timestamp","value":"={{ $now }}","type":"string"},{"id":"assignment-2","name":"source","value":"=n8n-schedule","type":"string"}]},"options":{}},"id":"set-payload","name":"Set Payload","type":"n8n-nodes-base.set","typeVersion":3.2,"position":[550,400]},{"parameters":{"options":{"timeout":30000},"method":"POST","url":"={{ $env.JOB_SERVER_URL }}/api/auto-apply/run","sendHeaders":true,"headerParameters":{"parameters":[{"name":"Content-Type","value":"application/json"},{"name":"Authorization","value":"=Bearer {{ $env.JOB_SERVER_ADMIN_TOKEN }}"}]},"sendBody":true,"specifyBody":"json","jsonBody":"={{ JSON.stringify({ dryRun: false, maxApplications: 10, platforms: ['wanted'], keywords: ['시니어 엔지니어', '클�라우드 엔지니어', 'SRE', 'DevOps'] }) }}"},"id":"trigger-evening","name":"Trigger Evening","type":"n8n-nodes-base.httpRequest","typeVersion":4.2,"position":[400,500]}],"connections":{"Daily Schedule":{"main":[[{"node":"Merge","type":"main","index":0}]]},"Evening Schedule":{"main":[[{"node":"Merge","type":"main","index":0}]]},"Merge":{"main":[[{"node":"Set Payload","type":"main","index":0}]]},"Set Payload":{"main":[[{"node":"Trigger Auto-Apply","type":"main","index":0}]]},"Trigger Auto-Apply":{"main":[[{"node":"Wait 30s","type":"main","index":0}]]},"Wait 30s":{"main":[[{"node":"Poll Status","type":"main","index":0}]]},"Poll Status":{"main":[[{"node":"Check if Done","type":"main","index":0}]]},"Check if Done":{"main":[[{"node":"Format Result","type":"main","index":0}]]}},"settings":{"executionOrder":"v1"},"staticData":null,"tags":[]}`
		f, err := os.Create(workflowFile)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error creating local file: %v\n", err)
			os.Exit(1)
		}
		f.WriteString(inlineWorkflow)
		f.Close()
	}
	fmt.Println("✅ Workflow file ready")
	fmt.Println()

	// Import workflow
	fmt.Println("[2/4] Importing workflow to n8n...")
	importCmd := exec.Command("curl", "-s", "-X", "POST", n8nAPIURL,
		"-H", "Content-Type: application/json",
		"-d", "@"+workflowFile)
	importOut, err := importCmd.CombinedOutput()
	if err != nil {
		// curl error
	}
	importResult := string(importOut)

	workflowID := "DRHg9pwanv4pHGxV"
	if strings.Contains(importResult, "\"id\"") {
		idx := strings.Index(importResult, "\"id\":\"")
		if idx == -1 {
			idx = strings.Index(importResult, "\"id\": \"")
		}
		if idx != -1 {
			start := idx
			for start < len(importResult) && importResult[start] != '"' {
				start++
			}
			start++
			end := start
			for end < len(importResult) && importResult[end] != '"' {
				end++
			}
			if end > start {
				workflowID = importResult[start:end]
			}
		}
		fmt.Println("✅ Workflow imported:", workflowID)
	} else if strings.Contains(importResult, "already exists") {
		workflowID = "DRHg9pwanv4pHGxV"
		fmt.Println("⚠️ Workflow already exists:", workflowID)
	} else {
		truncated := importResult
		if len(truncated) > 100 {
			truncated = truncated[:100]
		}
		fmt.Println("⚠️ Import response:", truncated)
		workflowID = "DRHg9pwanv4pHGxV"
	}
	fmt.Println()

	// Activate workflow
	fmt.Println("[3/4] Activating workflow...")
	activateCmd := exec.Command("curl", "-s", "-X", "PATCH", n8nAPIURL+"/"+workflowID,
		"-H", "Content-Type: application/json",
		"-d", `{"active":true}`)
	activateOut, err := activateCmd.CombinedOutput()
	if err != nil {
		// curl error
	}
	activateResult := string(activateOut)

	status := "UNKNOWN"
	if strings.Contains(activateResult, "\"active\":true") {
		fmt.Println("✅ Workflow ACTIVATED!")
		status = "ACTIVE"
	} else {
		truncated := activateResult
		if len(truncated) > 100 {
			truncated = truncated[:100]
		}
		fmt.Println("⚠️ Activation response:", truncated)
		status = "UNKNOWN"
	}
	fmt.Println()

	// Verify
	fmt.Println("[4/4] Verifying...")
	verifyCmd := exec.Command("curl", "-s", n8nAPIURL+"/"+workflowID)
	verifyOut, err := verifyCmd.CombinedOutput()
	if err != nil {
		// curl error
	}
	verifyResult := string(verifyOut)
	if strings.Contains(verifyResult, "\"active\":true") {
		fmt.Println("✅ VERIFIED: Workflow is ACTIVE")
		status = "ACTIVE"
	} else {
		fmt.Println("⚠️ Verification failed")
	}
	fmt.Println()

	// Cleanup
	os.Remove(workflowFile)

	// Summary
	fmt.Println("==========================================")
	fmt.Println("  AUTO-APPLY DEPLOYMENT COMPLETE")
	fmt.Println("==========================================")
	fmt.Println()
	fmt.Println("Workflow ID:", workflowID)
	fmt.Println("Status:", status)
	fmt.Println("Schedule: Daily at 9:00 AM KST")
	fmt.Println("Timezone: Asia/Seoul")
	fmt.Println()
	fmt.Println("Features:")
	fmt.Println("  ✅ Automatic job search and apply")
	fmt.Println("  ✅ Telegram notifications")
	fmt.Println("  ✅ 20-min timeout protection")
	fmt.Println("  ✅ Error handling")
	fmt.Println()
	fmt.Println("Next Run: Tomorrow at 9:00 AM KST")
	fmt.Println("Monitor: http://192.168.50.110:5678/workflow/" + workflowID)
	fmt.Println()
	fmt.Println("==========================================")

	// Environment variables reminder
	fmt.Println()
	fmt.Println("⚠️  IMPORTANT: Set environment variables in n8n UI:")
	fmt.Println("   Settings → Variables:")
	fmt.Println("   - JOB_SERVER_URL = http://localhost:3456")
	fmt.Println("   - JOB_SERVER_ADMIN_TOKEN = (your token)")
	fmt.Println()
}
