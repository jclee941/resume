package main

import (
	"fmt"
	"os"
)

// ANSI color codes
const (
	Red     = "\033[0;31m"
	Green   = "\033[0;32m"
	Yellow  = "\033[1;33m"
	Blue    = "\033[0;34m"
	Cyan    = "\033[0;36m"
	NoColor = "\033[0m"
)

// Configuration
var (
	portfolioURL    = getEnv("PORTFOLIO_URL", "https://resume.jclee.me")
	jobDashboardURL = getEnv("JOB_DASHBOARD_URL", "https://resume.jclee.me/job")
	mode            = "full"
	outputFormat    = "text"
	reportFile      = getEnv("REPORT_FILE", "verification-report.txt")
)

// Counters
var (
	passCount  = 0
	failCount  = 0
	warnCount  = 0
	totalCount = 0
	results    []Result
)

// Result represents a single check result
type Result struct {
	Status   string `json:"status"`
	Category string `json:"category"`
	Check    string `json:"check"`
	Message  string `json:"message"`
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func logResult(status, category, check, message string) {
	totalCount++
	results = append(results, Result{status, category, check, message})

	if outputFormat != "text" {
		return
	}

	switch status {
	case "pass":
		passCount++
		fmt.Printf("%s✓%s [%s] %s: %s\n", Green, NoColor, category, check, message)
	case "fail":
		failCount++
		fmt.Printf("%s✗%s [%s] %s: %s\n", Red, NoColor, category, check, message)
	case "warn":
		warnCount++
		fmt.Printf("%s⚠%s [%s] %s: %s\n", Yellow, NoColor, category, check, message)
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
