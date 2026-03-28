//go:build ignore

package main

import (
	"bufio"
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

const (
	red    = "\033[0;31m"
	green  = "\033[0;32m"
	yellow = "\033[1;33m"
	nc     = "\033[0m"
)

var (
	n8nURL           = getenvOrDefault("N8N_URL", "https://n8n.jclee.me")
	n8nAPIKey        = os.Getenv("N8N_API_KEY")
	cfAccessClientID = os.Getenv("CF_ACCESS_CLIENT_ID")
	cfAccessSecret   = os.Getenv("CF_ACCESS_CLIENT_SECRET")
	cfAccessCookie   = os.Getenv("CF_ACCESS_COOKIE")
	workflowFile     = "resume/resume-unified-workflow.json"
	httpClient       = &http.Client{Timeout: 30 * time.Second}
)

type workflowsResponse struct {
	Data []struct {
		ID   string `json:"id"`
		Name string `json:"name"`
	} `json:"data"`
}

type workflowNode struct {
	Type       string `json:"type"`
	Parameters struct {
		Path string `json:"path"`
	} `json:"parameters"`
}

type workflowDefinition struct {
	Nodes []workflowNode `json:"nodes"`
}

type summaryOutput struct {
	ID        any `json:"id"`
	Name      any `json:"name"`
	Active    any `json:"active"`
	CreatedAt any `json:"createdAt"`
	UpdatedAt any `json:"updatedAt"`
}

func main() {
	flag.Parse()
	if flag.NArg() > 0 {
		workflowFile = flag.Arg(0)
	}

	log_info("=== n8n Workflow Deployment ===")
	log_info("Target: " + n8nURL)
	log_info("Workflow: " + workflowFile)
	log_info("")

	check_prerequisites()
	test_connection()

	reader := bufio.NewReader(os.Stdin)
	existingID := check_existing_workflow(reader)
	workflowID := deploy_workflow(existingID)
	activate_workflow(workflowID)
	get_webhook_url(workflowID)

	log_info("")
	log_info("=== Deployment Complete ===")
	log_info("Workflow ID: " + workflowID)
	log_info("Dashboard: " + strings.TrimRight(n8nURL, "/") + "/workflow/" + workflowID)
}

func log_info(msg string) {
	fmt.Printf("%s[INFO]%s %s\n", green, nc, msg)
}

func log_warn(msg string) {
	fmt.Printf("%s[WARN]%s %s\n", yellow, nc, msg)
}

func log_error(msg string) {
	fmt.Printf("%s[ERROR]%s %s\n", red, nc, msg)
}

func check_prerequisites() {
	if strings.TrimSpace(n8nAPIKey) == "" {
		log_error("N8N_API_KEY environment variable is not set.")
		log_info("Get API key from: " + strings.TrimRight(n8nURL, "/") + "/settings/api")
		os.Exit(1)
	}

	if _, err := os.Stat(workflowFile); err != nil {
		log_error("Workflow file not found: " + workflowFile)
		os.Exit(1)
	}
}

func test_connection() {
	log_info("Testing n8n API connection...")

	body, httpCode, err := apiRequest(http.MethodGet, "/api/v1/workflows", nil)
	_ = body
	if err != nil || httpCode != 200 {
		log_error(fmt.Sprintf("Failed to connect to n8n API (HTTP %d)", httpCode))
		log_error("URL: " + strings.TrimRight(n8nURL, "/") + "/api/v1/workflows")
		os.Exit(1)
	}

	log_info("Connection successful!")
}

func check_existing_workflow(reader *bufio.Reader) string {
	workflowName := "Resume Auto Deploy"

	log_info("Checking for existing workflow: " + workflowName)

	body, httpCode, err := apiRequest(http.MethodGet, "/api/v1/workflows", nil)
	if err != nil || httpCode != 200 {
		return ""
	}

	var resp workflowsResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return ""
	}

	for _, wf := range resp.Data {
		if wf.Name == workflowName && wf.ID != "" {
			log_warn("Workflow already exists with ID: " + wf.ID)
			fmt.Print("Do you want to update it? (y/N): ")
			answer, _ := reader.ReadString('\n')
			answer = strings.TrimSpace(answer)
			if len(answer) > 0 && (answer[0] == 'y' || answer[0] == 'Y') {
				return wf.ID
			}
			log_info("Deployment cancelled.")
			os.Exit(0)
		}
	}

	return ""
}

func deploy_workflow(workflowID string) string {
	workflowData, err := os.ReadFile(workflowFile)
	if err != nil {
		log_error("Workflow file not found: " + workflowFile)
		os.Exit(1)
	}

	if !json.Valid(workflowData) {
		log_error("Invalid JSON in workflow file: " + workflowFile)
		os.Exit(1)
	}

	log_info("Deploying workflow from: " + workflowFile)

	if workflowID != "" {
		log_info("Updating workflow ID: " + workflowID)
		body, httpCode, reqErr := apiRequest(http.MethodPatch, "/api/v1/workflows/"+workflowID, workflowData)
		if reqErr == nil && httpCode == 200 {
			log_info("Workflow updated successfully!")
			printSummary(body)
			return workflowID
		}

		log_error(fmt.Sprintf("Failed to update workflow (HTTP %d)", httpCode))
		printPrettyOrRaw(body)
		os.Exit(1)
	}

	log_info("Creating new workflow...")
	body, httpCode, reqErr := apiRequest(http.MethodPost, "/api/v1/workflows", workflowData)
	if reqErr == nil && (httpCode == 200 || httpCode == 201) {
		log_info("Workflow created successfully!")
		printSummary(body)
		createdID := extractID(body)
		if createdID == "" {
			log_error("Failed to parse workflow ID from API response.")
			os.Exit(1)
		}
		return createdID
	}

	log_error(fmt.Sprintf("Failed to create workflow (HTTP %d)", httpCode))
	printPrettyOrRaw(body)
	os.Exit(1)
	return ""
}

func activate_workflow(workflowID string) {
	log_info("Activating workflow...")

	body, httpCode, err := apiRequest(http.MethodPatch, "/api/v1/workflows/"+workflowID, []byte(`{"active": true}`))
	_ = body
	if err == nil && httpCode == 200 {
		log_info("Workflow activated successfully!")
		return
	}

	log_warn(fmt.Sprintf("Failed to activate workflow (HTTP %d)", httpCode))
}

func get_webhook_url(_ string) {
	log_info("Getting webhook URL...")

	workflowData, err := os.ReadFile(workflowFile)
	if err != nil {
		return
	}

	var wf workflowDefinition
	if err := json.Unmarshal(workflowData, &wf); err != nil {
		return
	}

	webhookPath := ""
	for _, node := range wf.Nodes {
		if node.Type == "n8n-nodes-base.webhook" && strings.TrimSpace(node.Parameters.Path) != "" {
			webhookPath = node.Parameters.Path
			break
		}
	}

	if webhookPath == "" {
		return
	}

	webhookURL := strings.TrimRight(n8nURL, "/") + "/webhook/" + webhookPath
	log_info("Webhook URL: " + webhookURL)
	log_info("")
	log_info("Configure GitHub webhook:")
	log_info("  Repository: https://github.com/qws941/resume")
	log_info("  Settings → Webhooks → Add webhook")
	log_info("  Payload URL: " + webhookURL)
	log_info("  Content type: application/json")
	log_info("  Events: Just the push event")
}

func apiRequest(method, path string, payload []byte) ([]byte, int, error) {
	url := strings.TrimRight(n8nURL, "/") + path

	var bodyReader io.Reader
	if payload != nil {
		bodyReader = bytes.NewReader(payload)
	}

	req, err := http.NewRequest(method, url, bodyReader)
	if err != nil {
		return nil, 0, err
	}

	req.Header.Set("X-N8N-API-KEY", n8nAPIKey)
	if cfAccessClientID != "" {
		req.Header.Set("CF-Access-Client-Id", cfAccessClientID)
	}
	if cfAccessSecret != "" {
		req.Header.Set("CF-Access-Client-Secret", cfAccessSecret)
	}
	if payload != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if cfAccessCookie != "" {
		req.Header.Set("Cookie", cfAccessCookie)
	}

	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer resp.Body.Close()

	body, readErr := io.ReadAll(resp.Body)
	if readErr != nil {
		return nil, resp.StatusCode, readErr
	}

	return body, resp.StatusCode, nil
}

func printSummary(body []byte) {
	var data map[string]any
	if err := json.Unmarshal(body, &data); err != nil {
		printPrettyOrRaw(body)
		return
	}

	summary := summaryOutput{
		ID:        data["id"],
		Name:      data["name"],
		Active:    data["active"],
		CreatedAt: data["createdAt"],
		UpdatedAt: data["updatedAt"],
	}

	formatted, err := json.MarshalIndent(summary, "", "  ")
	if err != nil {
		printPrettyOrRaw(body)
		return
	}

	fmt.Println(string(formatted))
}

func printPrettyOrRaw(body []byte) {
	if len(body) == 0 {
		fmt.Println()
		return
	}

	var pretty bytes.Buffer
	if err := json.Indent(&pretty, body, "", "  "); err == nil {
		fmt.Println(pretty.String())
		return
	}

	fmt.Println(string(body))
}

func extractID(body []byte) string {
	var data map[string]any
	if err := json.Unmarshal(body, &data); err != nil {
		return ""
	}

	switch v := data["id"].(type) {
	case string:
		return v
	case float64:
		return fmt.Sprintf("%.0f", v)
	default:
		return ""
	}
}

func getenvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); strings.TrimSpace(value) != "" {
		return value
	}
	return defaultValue
}
