// Performance Monitoring Setup Script
// Automates Grafana dashboard deployment and monitoring configuration

package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
)

// Color codes
const (
	Red     = "\033[0;31m"
	Green   = "\033[0;32m"
	Yellow  = "\033[1;33m"
	Blue    = "\033[0;34m"
	NoColor = "\033[0m"
)

// Paths
var (
	scriptDir, _  = os.Getwd()
	projectRoot   = filepath.Dir(filepath.Dir(scriptDir))
	dashboardFile = filepath.Join(projectRoot, "infrastructure", "monitoring", "grafana-dashboard-resume-portfolio.json")
	alertRules    = filepath.Join(projectRoot, "infrastructure", "configs", "grafana", "alert-rules.yaml")
	grafanaURL    = getEnv("GRAFANA_URL", "http://localhost:3000")
	grafanaAPIKey = os.Getenv("GRAFANA_API_KEY")
	prometheusURL = getEnv("PROMETHEUS_URL", "http://localhost:9090")
)

func main() {
	command := "help"
	if len(os.Args) > 1 {
		command = os.Args[1]
	}

	switch command {
	case "deploy":
		deployDashboard()
	case "verify":
		verifySetup()
	case "test":
		testMetrics()
	case "help", "--help", "-h":
		usage()
	default:
		logError("Unknown command: " + command)
		fmt.Println()
		usage()
		os.Exit(1)
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func logInfo(msg string) {
	fmt.Printf("%sℹ%s %s\n", Blue, NoColor, msg)
}

func logSuccess(msg string) {
	fmt.Printf("%s✓%s %s\n", Green, NoColor, msg)
}

func logWarn(msg string) {
	fmt.Printf("%s⚠%s %s\n", Yellow, NoColor, msg)
}

func logError(msg string) {
	fmt.Printf("%s✗%s %s\n", Red, NoColor, msg)
}

func checkDependencies() bool {
	logInfo("Checking dependencies...")
	missing := 0

	// Check curl (not needed in Go version, but keeping for compatibility)
	logSuccess("curl available (using Go net/http)")

	// Check jq (optional)
	// In Go, we use encoding/json so no need for external jq
	logSuccess("JSON parsing available (using Go encoding/json)")

	if missing > 0 {
		logError("Missing required dependencies")
		return false
	}

	logSuccess("All dependencies installed")
	return true
}

func checkGrafana() bool {
	logInfo("Checking Grafana connectivity...")

	if grafanaAPIKey == "" {
		logWarn("GRAFANA_API_KEY not set")
		logInfo("Set it with: export GRAFANA_API_KEY=your_api_key")
		return false
	}

	req, _ := http.NewRequest("GET", grafanaURL+"/api/health", nil)
	req.Header.Set("Authorization", "Bearer "+grafanaAPIKey)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		logError(fmt.Sprintf("Cannot connect to Grafana: %v", err))
		logInfo("Check if Grafana is running: docker ps | grep grafana")
		return false
	}
	defer resp.Body.Close()

	if resp.StatusCode == 200 {
		logSuccess(fmt.Sprintf("Grafana is accessible at %s", grafanaURL))
		return true
	}

	logError(fmt.Sprintf("Cannot connect to Grafana (HTTP %d)", resp.StatusCode))
	logInfo("Check if Grafana is running: docker ps | grep grafana")
	return false
}

func checkPrometheus() bool {
	logInfo("Checking Prometheus connectivity...")

	resp, err := http.Get(prometheusURL + "/-/healthy")
	if err != nil {
		logWarn(fmt.Sprintf("Cannot connect to Prometheus: %v", err))
		logInfo("Monitoring will work without Prometheus, but metrics won't be collected")
		return false
	}
	defer resp.Body.Close()

	if resp.StatusCode == 200 {
		logSuccess(fmt.Sprintf("Prometheus is accessible at %s", prometheusURL))
		return true
	}

	logWarn(fmt.Sprintf("Cannot connect to Prometheus (HTTP %d)", resp.StatusCode))
	logInfo("Monitoring will work without Prometheus, but metrics won't be collected")
	return false
}

func deployDashboard() {
	logInfo("Deploying Grafana dashboard...")

	if _, err := os.Stat(dashboardFile); os.IsNotExist(err) {
		logError("Dashboard file not found: " + dashboardFile)
		os.Exit(1)
	}

	if !checkGrafana() {
		os.Exit(1)
	}

	// Read dashboard JSON
	dashboardJSON, err := os.ReadFile(dashboardFile)
	if err != nil {
		logError(fmt.Sprintf("Cannot read dashboard file: %v", err))
		os.Exit(1)
	}

	// Prepare payload
	var dashboardObj map[string]interface{}
	if err := json.Unmarshal(dashboardJSON, &dashboardObj); err != nil {
		logError(fmt.Sprintf("Invalid dashboard JSON: %v", err))
		os.Exit(1)
	}

	payload := map[string]interface{}{
		"dashboard": dashboardObj,
		"overwrite": true,
		"message":   "Deployed via setup-monitoring",
	}

	payloadBytes, _ := json.Marshal(payload)

	// Deploy to Grafana
	req, _ := http.NewRequest("POST", grafanaURL+"/api/dashboards/db", bytes.NewBuffer(payloadBytes))
	req.Header.Set("Authorization", "Bearer "+grafanaAPIKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		logError(fmt.Sprintf("Dashboard deployment failed: %v", err))
		os.Exit(1)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var result map[string]interface{}
	json.Unmarshal(body, &result)

	if status, ok := result["status"].(string); ok && status == "success" {
		logSuccess("Dashboard deployed successfully")
		if url, ok := result["url"].(string); ok && url != "" {
			logInfo(fmt.Sprintf("Dashboard URL: %s%s", grafanaURL, url))
		}
	} else {
		logError("Dashboard deployment failed")
		fmt.Println(string(body))
		os.Exit(1)
	}
}

func deployAlerts() {
	logInfo("Deploying alert rules...")

	if _, err := os.Stat(alertRules); os.IsNotExist(err) {
		logWarn("Alert rules file not found: " + alertRules)
		return
	}

	if !checkGrafana() {
		return
	}

	logWarn("Alert rules deployment requires Grafana Alerting API")
	logInfo("Please import alert rules manually via Grafana UI")
	logInfo("File: " + alertRules)
}

func testMetrics() {
	logInfo("Testing metrics collection...")

	if !checkPrometheus() {
		logWarn("Skipping metrics test (Prometheus not available)")
		os.Exit(1)
	}

	// Test query: http_requests_total
	query := "http_requests_total{job=\"resume\"}"
	resp, err := http.Get(prometheusURL + "/api/v1/query?query=" + query)
	if err != nil {
		logWarn(fmt.Sprintf("No metrics found for query: %s", query))
		logInfo("Metrics will be collected once the application starts sending data")
		os.Exit(1)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var result map[string]interface{}
	json.Unmarshal(body, &result)

	if status, ok := result["status"].(string); ok && status == "success" {
		data, _ := result["data"].(map[string]interface{})
		results, _ := data["result"].([]interface{})
		logSuccess(fmt.Sprintf("Metrics query successful (%d results)", len(results)))
	} else {
		logWarn(fmt.Sprintf("No metrics found for query: %s", query))
		logInfo("Metrics will be collected once the application starts sending data")
		os.Exit(1)
	}
}

func verifySetup() {
	logInfo("Verifying monitoring setup...")
	fmt.Println()

	checksPassed := 0
	checksTotal := 0

	// Check 1: Dependencies
	checksTotal++
	if checkDependencies() {
		checksPassed++
	}
	fmt.Println()

	// Check 2: Grafana
	checksTotal++
	if checkGrafana() {
		checksPassed++
	}
	fmt.Println()

	// Check 3: Prometheus
	checksTotal++
	if checkPrometheus() {
		checksPassed++
	}
	fmt.Println()

	// Check 4: Dashboard file
	checksTotal++
	if _, err := os.Stat(dashboardFile); err == nil {
		logSuccess("Dashboard file exists")
		checksPassed++
	} else {
		logError("Dashboard file not found")
	}
	fmt.Println()

	// Check 5: Alert rules file
	checksTotal++
	if _, err := os.Stat(alertRules); err == nil {
		logSuccess("Alert rules file exists")
		checksPassed++
	} else {
		logWarn("Alert rules file not found")
	}
	fmt.Println()

	// Summary
	fmt.Println("=========================================")
	logInfo("Verification Summary")
	fmt.Println("=========================================")
	fmt.Printf("Checks passed: %d/%d\n", checksPassed, checksTotal)

	if checksPassed == checksTotal {
		logSuccess("All checks passed! Monitoring is ready.")
		os.Exit(0)
	} else if checksPassed >= 3 {
		logWarn("Some checks failed, but monitoring can work with limitations")
		os.Exit(0)
	} else {
		logError("Too many checks failed. Please fix the issues above.")
		os.Exit(1)
	}
}

func usage() {
	fmt.Println(`Performance Monitoring Setup Script

Usage:
  setup-monitoring [command]

Commands:
  deploy      Deploy Grafana dashboard
  verify      Verify monitoring setup
  test        Test metrics collection
  help        Show this help message

Environment Variables:
  GRAFANA_URL       Grafana URL (default: http://localhost:3000)
  GRAFANA_API_KEY   Grafana API key (required for deploy)
  PROMETHEUS_URL    Prometheus URL (default: http://localhost:9090)

Examples:
  # Verify setup
  setup-monitoring verify

  # Deploy dashboard
  export GRAFANA_API_KEY=your_api_key
  setup-monitoring deploy

  # Test metrics
  setup-monitoring test`)
}
