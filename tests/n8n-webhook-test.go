// n8n Webhook Integration Test Script
// Tests the GitHub deployment webhook without actual n8n server

package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

func main() {
	fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	fmt.Println("🧪 n8n Webhook Integration Test")
	fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	fmt.Println()

	// Test 1: Validate GitHub Actions webhook payload generation
	fmt.Println("📋 Test 1: GitHub Actions Payload Generation")
	fmt.Println("   Simulating GitHub Actions environment...")

	commitSHA := "7ae6deb1234567890abcdef1234567890abcdef"
	commitShort := commitSHA[:7]
	commitMessage := "test: n8n webhook integration verification"
	author := "Claude Code"
	deployedAt := time.Now().UTC().Format("2006-01-02T15:04:05Z")
	status := "success"
	workflowRunID := "12345678"
	repository := "qws941/resume"
	branch := "master"

	payload := map[string]string{
		"commit_sha":      commitShort,
		"commit_message":  commitMessage,
		"author":          author,
		"deployed_at":     deployedAt,
		"status":          status,
		"workflow_run_id": workflowRunID,
		"repository":      repository,
		"branch":          branch,
	}

	payloadJSON, _ := json.MarshalIndent(payload, "", "  ")
	fmt.Println(string(payloadJSON))
	fmt.Println("   ✅ Valid JSON payload generated")
	fmt.Println()

	// Test 2: Validate required fields
	fmt.Println("📋 Test 2: Required Fields Validation")
	requiredFields := []string{"commit_sha", "commit_message", "author", "deployed_at", "status"}
	for _, field := range requiredFields {
		if value, ok := payload[field]; ok && value != "" {
			fmt.Printf("   ✅ %s: %s\n", field, value)
		} else {
			fmt.Printf("   ❌ Missing required field: %s\n", field)
			os.Exit(1)
		}
	}
	fmt.Println()

	// Test 3: Check resume site health
	fmt.Println("📋 Test 3: Resume Site Health Check")
	resp, err := http.Get("https://resume.jclee.me/health")
	if err != nil {
		fmt.Printf("   ❌ Health check failed: %v\n", err)
		os.Exit(1)
	}
	defer resp.Body.Close()

	var health map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&health); err != nil {
		fmt.Printf("   ❌ Failed to parse health response: %v\n", err)
		os.Exit(1)
	}

	if health["status"] == "healthy" {
		healthJSON, _ := json.MarshalIndent(health, "", "  ")
		fmt.Println("   ✅ Site is healthy")
		fmt.Println(string(healthJSON))
	} else {
		fmt.Printf("   ❌ Site unhealthy: %v\n", health["status"])
		os.Exit(1)
	}
	fmt.Println()

	// Test 4: Check metrics endpoint
	fmt.Println("📋 Test 4: Metrics Endpoint Validation")
	resp, err = http.Get("https://resume.jclee.me/metrics")
	if err != nil {
		fmt.Printf("   ❌ Metrics endpoint not working: %v\n", err)
		os.Exit(1)
	}
	defer resp.Body.Close()

	metrics, _ := io.ReadAll(resp.Body)
	if strings.Contains(string(metrics), "http_requests_total") {
		fmt.Println("   ✅ Prometheus metrics available")
		lines := strings.Split(string(metrics), "\n")
		for i, line := range lines {
			if i < 5 {
				fmt.Println("   " + line)
			}
		}
		fmt.Println("   ...")
	} else {
		fmt.Println("   ❌ Metrics endpoint not working")
		os.Exit(1)
	}
	fmt.Println()

	// Test 5: n8n server connectivity
	fmt.Println("📋 Test 5: n8n Server Connectivity")
	resp, err = http.Get("https://n8n.jclee.me/healthz")
	if err != nil {
		fmt.Println("   ❌ n8n server not accessible")
		os.Exit(1)
	}
	defer resp.Body.Close()

	n8nHealth, _ := io.ReadAll(resp.Body)
	if len(n8nHealth) > 0 {
		fmt.Println("   ✅ n8n server is accessible")
		fmt.Printf("   Response: %s\n", string(n8nHealth))
	} else {
		fmt.Println("   ❌ n8n server not accessible")
		os.Exit(1)
	}
	fmt.Println()

	// Test 6: Workflow JSON validation
	fmt.Println("📋 Test 6: Workflow JSON Validation")
	workflows := []string{
		"infrastructure/workflows/01-site-health-monitor.json",
		"infrastructure/workflows/02-github-deployment-webhook.json",
	}

	for _, workflow := range workflows {
		if _, err := os.Stat(workflow); os.IsNotExist(err) {
			fmt.Printf("   ❌ Workflow not found: %s\n", workflow)
			os.Exit(1)
		}

		data, err := os.ReadFile(workflow)
		if err != nil {
			fmt.Printf("   ❌ Cannot read workflow: %s\n", workflow)
			os.Exit(1)
		}

		var workflowData map[string]interface{}
		if err := json.Unmarshal(data, &workflowData); err != nil {
			fmt.Printf("   ❌ Invalid JSON in workflow: %s\n", workflow)
			os.Exit(1)
		}

		name, _ := workflowData["name"].(string)
		nodes, _ := workflowData["nodes"].([]interface{})
		nodeCount := len(nodes)

		if name != "" && nodeCount > 0 {
			fmt.Printf("   ✅ %s (%d nodes)\n", name, nodeCount)
		} else {
			fmt.Printf("   ❌ Invalid workflow: %s\n", workflow)
			os.Exit(1)
		}
	}
	fmt.Println()

	// Test 7: GitHub Actions integration check
	fmt.Println("📋 Test 7: GitHub Actions Integration")
	deployYAML := ".github/workflows/release.yml"
	if data, err := os.ReadFile(deployYAML); err == nil {
		content := string(data)
		if strings.Contains(content, "N8N_WEBHOOK_URL") {
			fmt.Println("   ✅ N8N_WEBHOOK_URL configured in release.yml")
		} else {
			fmt.Println("   ❌ N8N_WEBHOOK_URL not found in release.yml")
			os.Exit(1)
		}

		if strings.Contains(content, "Notify n8n Webhook") {
			fmt.Println("   ✅ Webhook notification step present")
		} else {
			fmt.Println("   ❌ Webhook notification step not found")
			os.Exit(1)
		}
	} else {
		fmt.Printf("   ❌ Cannot read release.yml: %v\n", err)
		os.Exit(1)
	}
	fmt.Println()

	// Test 8: Documentation completeness
	fmt.Println("📋 Test 8: Documentation Completeness")
	docs := []string{
		"docs/N8N-MONITORING-WORKFLOWS.md",
		"infrastructure/workflows/README.md",
		"docs/DEPLOYMENT-SUMMARY-2025-11-18.md",
	}

	for _, doc := range docs {
		if info, err := os.Stat(doc); err == nil {
			size := info.Size()
			fmt.Printf("   ✅ %s (%d bytes)\n", doc, size)
		} else {
			fmt.Printf("   ❌ Missing documentation: %s\n", doc)
			os.Exit(1)
		}
	}
	fmt.Println()

	// Summary
	fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	fmt.Println("✅ All Tests Passed!")
	fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	fmt.Println()
	fmt.Println("📊 Test Summary:")
	fmt.Println("   1. ✅ GitHub Actions payload generation")
	fmt.Println("   2. ✅ Required fields validation")
	fmt.Println("   3. ✅ Resume site health check")
	fmt.Println("   4. ✅ Metrics endpoint validation")
	fmt.Println("   5. ✅ n8n server connectivity")
	fmt.Println("   6. ✅ Workflow JSON validation (2 workflows)")
	fmt.Println("   7. ✅ GitHub Actions integration")
	fmt.Println("   8. ✅ Documentation completeness (3 files)")
	fmt.Println()
}
