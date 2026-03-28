// Grafana Configuration Deployment Script
// Imports dashboard and alert rules to grafana.jclee.me

package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

// ANSI color codes
const (
	Red     = "\033[0;31m"
	Green   = "\033[0;32m"
	Yellow  = "\033[1;33m"
	Blue    = "\033[0;34m"
	NoColor = "\033[0m"
)

// Configuration
var (
	grafanaURL           = getEnv("GRAFANA_URL", "https://grafana.jclee.me")
	grafanaAPIKey        = os.Getenv("GRAFANA_API_KEY")
	projectRoot          = os.Getenv("PROJECT_ROOT")
	grafanaConfigDir     string
	grafanaMonitoringDir string
	dashboardFile        string
	alertRulesFile       string
)

// Flags
var (
	importDashboard = true
	importAlerts    = true
)

func main() {
	// Parse arguments
	args := os.Args[1:]
	for i := 0; i < len(args); i++ {
		arg := args[i]
		switch arg {
		case "-d", "--dashboard-only":
			importAlerts = false
		case "-a", "--alerts-only":
			importDashboard = false
		case "-k", "--api-key":
			if i+1 < len(args) {
				grafanaAPIKey = args[i+1]
				i++
			}
		case "-u", "--url":
			if i+1 < len(args) {
				grafanaURL = args[i+1]
				i++
			}
		case "-h", "--help":
			usage()
			os.Exit(0)
		default:
			if strings.HasPrefix(arg, "-") {
				logError(fmt.Sprintf("Unknown option: %s", arg))
				usage()
			}
		}
	}

	// Set up paths
	if projectRoot == "" {
		// Try to find project root from executable location
		ex, err := os.Executable()
		if err == nil {
			projectRoot = filepath.Dir(filepath.Dir(filepath.Dir(filepath.Dir(ex))))
		}
	}

	grafanaConfigDir = filepath.Join(projectRoot, "infrastructure", "configs", "grafana")
	grafanaMonitoringDir = filepath.Join(projectRoot, "infrastructure", "monitoring")
	dashboardFile = filepath.Join(grafanaMonitoringDir, "grafana-dashboard-resume-portfolio.json")
	alertRulesFile = filepath.Join(grafanaConfigDir, "alert-rules.yaml")

	// Validate prerequisites
	logInfo("Validating prerequisites...")

	if importDashboard {
		if _, err := os.Stat(dashboardFile); os.IsNotExist(err) {
			logError(fmt.Sprintf("Dashboard file not found: %s", dashboardFile))
			os.Exit(1)
		}
	}

	if importAlerts {
		if _, err := os.Stat(alertRulesFile); os.IsNotExist(err) {
			logError(fmt.Sprintf("Alert rules file not found: %s", alertRulesFile))
			os.Exit(1)
		}
	}

	if grafanaAPIKey == "" {
		logError("Grafana API key not provided")
		logInfo("Set GRAFANA_API_KEY environment variable or use --api-key option")
		os.Exit(1)
	}

	// Check Grafana connectivity
	logInfo(fmt.Sprintf("Checking Grafana connectivity: %s", grafanaURL))
	resp, err := http.Get(grafanaURL + "/api/health")
	if err != nil {
		logError(fmt.Sprintf("Grafana is not accessible at %s", grafanaURL))
		logInfo("Check network connectivity and Grafana URL")
		os.Exit(1)
	}
	resp.Body.Close()
	logSuccess("Grafana is accessible")

	// Verify API key
	logInfo("Verifying API key...")
	req, _ := http.NewRequest("GET", grafanaURL+"/api/org", nil)
	req.Header.Set("Authorization", "Bearer "+grafanaAPIKey)
	resp, err = http.DefaultClient.Do(req)
	if err != nil || resp.StatusCode != 200 {
		logError("Invalid Grafana API key")
		logInfo("Generate a new API key in Grafana: Configuration → API Keys")
		if resp != nil {
			resp.Body.Close()
		}
		os.Exit(1)
	}
	resp.Body.Close()
	logSuccess("API key is valid")

	// Import dashboard
	if importDashboard {
		importDashboardToGrafana()
	}

	// Import alerts
	if importAlerts {
		importAlertRules()
	}

	// Summary
	fmt.Println()
	logSuccess("Deployment complete!")
	fmt.Println()
	logInfo(fmt.Sprintf("📊 Dashboard: %s/d/resume-portfolio", grafanaURL))
	logInfo(fmt.Sprintf("🚨 Alerts: %s/alerting/list", grafanaURL))
	logInfo("📈 Metrics: https://resume.jclee.me/metrics")
	logInfo("💓 Health: https://resume.jclee.me/health")
	fmt.Println()
	logInfo("Next steps:")
	logInfo("  1. Verify dashboard is displaying data (wait 30-60s for first scrape)")
	logInfo("  2. Configure Slack webhook for alert notifications")
	logInfo("  3. Test alerts by triggering conditions (in staging only)")
	logInfo("  4. Review and adjust alert thresholds as needed")
	fmt.Println()
}

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

func usage() {
	fmt.Println("Usage: deploy-grafana-configs [OPTIONS]")
	fmt.Println()
	fmt.Println("Import Grafana dashboard and alert rules for resume portfolio monitoring.")
	fmt.Println()
	fmt.Println("OPTIONS:")
	fmt.Println("  -d, --dashboard-only     Import dashboard only (skip alerts)")
	fmt.Println("  -a, --alerts-only        Import alerts only (skip dashboard)")
	fmt.Println("  -k, --api-key KEY        Grafana API key (or set GRAFANA_API_KEY env var)")
	fmt.Println("  -u, --url URL            Grafana URL (default: https://grafana.jclee.me)")
	fmt.Println("  -h, --help               Show this help message")
	fmt.Println()
	fmt.Println("EXAMPLES:")
	fmt.Println("  # Import everything (requires GRAFANA_API_KEY env var)")
	fmt.Println("  export GRAFANA_API_KEY=\"your-api-key\"")
	fmt.Println("  deploy-grafana-configs")
	fmt.Println()
	fmt.Println("  # Import dashboard only with API key")
	fmt.Println("  deploy-grafana-configs --dashboard-only --api-key \"your-api-key\"")
	fmt.Println()
	fmt.Println("ENVIRONMENT VARIABLES:")
	fmt.Println("  GRAFANA_API_KEY    Grafana API key for authentication")
	fmt.Println("  GRAFANA_URL        Grafana instance URL (default: https://grafana.jclee.me)")
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func logInfo(msg string) {
	fmt.Fprintf(os.Stderr, "%sℹ%s %s\n", Blue, NoColor, msg)
}

func logSuccess(msg string) {
	fmt.Fprintf(os.Stderr, "%s✓%s %s\n", Green, NoColor, msg)
}

func logWarning(msg string) {
	fmt.Fprintf(os.Stderr, "%s⚠%s %s\n", Yellow, NoColor, msg)
}

func logError(msg string) {
	fmt.Fprintf(os.Stderr, "%s✗%s %s\n", Red, NoColor, msg)
}

// Unused but kept for completeness
func _unused() {
	_ = bufio.NewScanner(nil)
}
