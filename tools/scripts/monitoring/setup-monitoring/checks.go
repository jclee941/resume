package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

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
