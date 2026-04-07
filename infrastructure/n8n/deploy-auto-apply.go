package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"
)

func main() {
	fmt.Println("=== n8n Auto-Apply Workflow Deployment ===")

	// Environment variables
	n8nURL := os.Getenv("N8N_URL")
	apiKey := os.Getenv("N8N_API_KEY")
	cfClientID := os.Getenv("CF_ACCESS_CLIENT_ID")
	cfClientSecret := os.Getenv("CF_ACCESS_CLIENT_SECRET")

	if n8nURL == "" {
		n8nURL = "https://n8n.jclee.me"
		fmt.Printf("[INFO] Using default n8n URL: %s\n", n8nURL)
	}

	if apiKey == "" {
		fmt.Println("[ERROR] N8N_API_KEY not set. Please set it first:")
		fmt.Println("  export N8N_API_KEY=your-api-key")
		fmt.Println("\nGet your API key from: https://n8n.jclee.me/settings/api")
		os.Exit(1)
	}

	// Read workflow file
	workflowFile := "infrastructure/n8n/job-auto-apply-workflow.json"
	if len(os.Args) > 1 {
		workflowFile = os.Args[1]
	}

	data, err := os.ReadFile(workflowFile)
	if err != nil {
		fmt.Printf("[ERROR] Failed to read workflow file: %v\n", err)
		os.Exit(1)
	}

	var workflow map[string]interface{}
	if err := json.Unmarshal(data, &workflow); err != nil {
		fmt.Printf("[ERROR] Failed to parse workflow JSON: %v\n", err)
		os.Exit(1)
	}

	workflowName := workflow["name"].(string)
	fmt.Printf("[INFO] Deploying workflow: %s\n", workflowName)

	// Create HTTP client with timeout
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	// Check if workflow already exists
	workflowID := workflow["id"].(string)
	exists := checkWorkflowExists(client, n8nURL, apiKey, cfClientID, cfClientSecret, workflowID)

	var result map[string]interface{}
	if exists {
		fmt.Println("[INFO] Workflow already exists, updating...")
		result = updateWorkflow(client, n8nURL, apiKey, cfClientID, cfClientSecret, workflowID, data)
	} else {
		fmt.Println("[INFO] Creating new workflow...")
		result = createWorkflow(client, n8nURL, apiKey, cfClientID, cfClientSecret, data)
	}

	if result == nil {
		fmt.Println("[ERROR] Failed to deploy workflow")
		os.Exit(1)
	}

	newID := result["id"].(string)
	fmt.Printf("[SUCCESS] Workflow deployed with ID: %s\n", newID)

	// Activate workflow
	fmt.Println("[INFO] Activating workflow...")
	if activateWorkflow(client, n8nURL, apiKey, cfClientID, cfClientSecret, newID) {
		fmt.Println("[SUCCESS] Workflow activated successfully!")
	} else {
		fmt.Println("[WARNING] Failed to activate workflow automatically")
		fmt.Println("  Please activate manually at:")
		fmt.Printf("  %s/workflow/%s\n", n8nURL, newID)
	}

	// Summary
	fmt.Println("\n=== Deployment Summary ===")
	fmt.Printf("Workflow Name: %s\n", workflowName)
	fmt.Printf("Workflow ID:   %s\n", newID)
	fmt.Printf("Status:        %s\n", result["active"].(bool))
	fmt.Printf("URL:           %s/workflow/%s\n", n8nURL, newID)
	fmt.Println("\nSchedule: Daily at 9:00 AM KST (Asia/Seoul)")
	fmt.Println("Trigger:  POST /api/auto-apply/run")
	fmt.Println("Notify:   Telegram via telegram-notifier workflow")
}

func checkWorkflowExists(client *http.Client, n8nURL, apiKey, cfClientID, cfClientSecret, workflowID string) bool {
	req, err := http.NewRequest("GET", fmt.Sprintf("%s/api/v1/workflows/%s", n8nURL, workflowID), nil)
	if err != nil {
		return false
	}

	req.Header.Set("X-N8N-API-KEY", apiKey)
	if cfClientID != "" && cfClientSecret != "" {
		req.Header.Set("CF-Access-Client-Id", cfClientID)
		req.Header.Set("CF-Access-Client-Secret", cfClientSecret)
	}

	resp, err := client.Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()

	return resp.StatusCode == http.StatusOK
}

func createWorkflow(client *http.Client, n8nURL, apiKey, cfClientID, cfClientSecret string, data []byte) map[string]interface{} {
	req, err := http.NewRequest("POST", fmt.Sprintf("%s/api/v1/workflows", n8nURL), bytes.NewReader(data))
	if err != nil {
		fmt.Printf("[ERROR] Failed to create request: %v\n", err)
		return nil
	}

	req.Header.Set("X-N8N-API-KEY", apiKey)
	req.Header.Set("Content-Type", "application/json")
	if cfClientID != "" && cfClientSecret != "" {
		req.Header.Set("CF-Access-Client-Id", cfClientID)
		req.Header.Set("CF-Access-Client-Secret", cfClientSecret)
	}

	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("[ERROR] Failed to create workflow: %v\n", err)
		return nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		fmt.Printf("[ERROR] Create workflow failed with status: %d\n", resp.StatusCode)
		return nil
	}

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		fmt.Printf("[ERROR] Failed to decode response: %v\n", err)
		return nil
	}

	return result
}

func updateWorkflow(client *http.Client, n8nURL, apiKey, cfClientID, cfClientSecret, workflowID string, data []byte) map[string]interface{} {
	req, err := http.NewRequest("PUT", fmt.Sprintf("%s/api/v1/workflows/%s", n8nURL, workflowID), bytes.NewReader(data))
	if err != nil {
		fmt.Printf("[ERROR] Failed to create request: %v\n", err)
		return nil
	}

	req.Header.Set("X-N8N-API-KEY", apiKey)
	req.Header.Set("Content-Type", "application/json")
	if cfClientID != "" && cfClientSecret != "" {
		req.Header.Set("CF-Access-Client-Id", cfClientID)
		req.Header.Set("CF-Access-Client-Secret", cfClientSecret)
	}

	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("[ERROR] Failed to update workflow: %v\n", err)
		return nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		fmt.Printf("[ERROR] Update workflow failed with status: %d\n", resp.StatusCode)
		return nil
	}

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		fmt.Printf("[ERROR] Failed to decode response: %v\n", err)
		return nil
	}

	return result
}

func activateWorkflow(client *http.Client, n8nURL, apiKey, cfClientID, cfClientSecret, workflowID string) bool {
	payload := []byte(`{"active": true}`)
	req, err := http.NewRequest("PATCH", fmt.Sprintf("%s/api/v1/workflows/%s", n8nURL, workflowID), bytes.NewReader(payload))
	if err != nil {
		return false
	}

	req.Header.Set("X-N8N-API-KEY", apiKey)
	req.Header.Set("Content-Type", "application/json")
	if cfClientID != "" && cfClientSecret != "" {
		req.Header.Set("CF-Access-Client-Id", cfClientID)
		req.Header.Set("CF-Access-Client-Secret", cfClientSecret)
	}

	resp, err := client.Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()

	return resp.StatusCode == http.StatusOK
}
