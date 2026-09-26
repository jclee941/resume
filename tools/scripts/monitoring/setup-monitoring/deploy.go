package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

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
