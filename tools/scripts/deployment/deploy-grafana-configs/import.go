package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
)

func importDashboardToGrafana() {
	logInfo("Importing dashboard...")

	dashboardData, err := os.ReadFile(dashboardFile)
	if err != nil {
		logError(fmt.Sprintf("Failed to read dashboard file: %v", err))
		os.Exit(1)
	}

	req, _ := http.NewRequest("POST", grafanaURL+"/api/dashboards/db", strings.NewReader(string(dashboardData)))
	req.Header.Set("Authorization", "Bearer "+grafanaAPIKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		logError(fmt.Sprintf("Failed to import dashboard: %v", err))
		os.Exit(1)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode == 200 {
		var result map[string]interface{}
		json.Unmarshal(body, &result)
		dashboardURL, _ := result["url"].(string)
		dashboardUID, _ := result["uid"].(string)
		logSuccess("Dashboard imported successfully")
		logInfo(fmt.Sprintf("Dashboard URL: %s%s", grafanaURL, dashboardURL))
		logInfo(fmt.Sprintf("Dashboard UID: %s", dashboardUID))
	} else {
		logError(fmt.Sprintf("Failed to import dashboard (HTTP %d)", resp.StatusCode))
		logError(fmt.Sprintf("Response: %s", string(body)))
		os.Exit(1)
	}
}

func importAlertRules() {
	logInfo("Importing alert rules...")

	alertRulesData, err := os.ReadFile(alertRulesFile)
	if err != nil {
		logError(fmt.Sprintf("Failed to read alert rules file: %v", err))
		return
	}

	req, _ := http.NewRequest("POST", grafanaURL+"/api/v1/provisioning/alert-rules", strings.NewReader(string(alertRulesData)))
	req.Header.Set("Authorization", "Bearer "+grafanaAPIKey)
	req.Header.Set("Content-Type", "application/yaml")
	req.Header.Set("X-Disable-Provenance", "true")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		logWarning(fmt.Sprintf("Alert rules API import failed: %v", err))
		logProvisioningFallback()
		return
	}
	resp.Body.Close()

	if resp.StatusCode == 200 || resp.StatusCode == 202 {
		logSuccess("Alert rules imported successfully")
	} else if resp.StatusCode == 409 {
		logWarning("Alert rules already exist, updating...")
		updateAlertRules(alertRulesData)
	} else {
		logWarning(fmt.Sprintf("Alert rules API import failed (HTTP %d)", resp.StatusCode))
		logProvisioningFallback()
	}
}

func updateAlertRules(alertRulesData []byte) {
	req, _ := http.NewRequest("PUT", grafanaURL+"/api/v1/provisioning/alert-rules", strings.NewReader(string(alertRulesData)))
	req.Header.Set("Authorization", "Bearer "+grafanaAPIKey)
	req.Header.Set("Content-Type", "application/yaml")
	req.Header.Set("X-Disable-Provenance", "true")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		logError(fmt.Sprintf("Failed to update alert rules: %v", err))
		return
	}
	resp.Body.Close()

	if resp.StatusCode == 200 || resp.StatusCode == 202 {
		logSuccess("Alert rules updated successfully")
	} else {
		logError(fmt.Sprintf("Failed to update alert rules (HTTP %d)", resp.StatusCode))
		logProvisioningFallback()
	}
}

func logProvisioningFallback() {
	logInfo("Attempting provisioning fallback...")
	logInfo("Manual steps:")
	logInfo(fmt.Sprintf("  1. Copy to provisioning: cp %s /path/to/grafana/provisioning/alerting/", alertRulesFile))
	logInfo("  2. Restart Grafana: docker restart grafana")
}
