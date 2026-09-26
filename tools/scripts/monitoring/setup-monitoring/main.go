// Performance Monitoring Setup Script
// Automates Grafana dashboard deployment and monitoring configuration

package main

import (
	"fmt"
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
