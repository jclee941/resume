package main

import (
	"fmt"
	"net/http"
	"os"
	"time"
)

func runVerifyE2E() int {
	v := &verifier{cfg: loadConfig(), client: &http.Client{Timeout: 15 * time.Second}}
	return v.run()
}

func (v *verifier) run() int {
	defer v.stopServer()
	fmt.Println("🔍 Session Broker E2E Verification")
	fmt.Println("================================")
	fmt.Println()
	v.ensureServiceReady()
	v.testHealthCheck()
	v.testSessionStatus()
	v.testSessionRenewal()
	v.testErrorHandling()
	v.testAutomationWebhook()
	v.testTelegramNotification()
	passed, failed, skipped, criticalFailed := 0, 0, 0, false
	for _, r := range v.results {
		switch r.status {
		case "passed":
			passed++
			fmt.Printf("✓ %s\n", r.message)
		case "skipped":
			skipped++
			fmt.Printf("⚠ %s\n", r.message)
		default:
			failed++
			fmt.Printf("✗ %s\n", r.message)
			criticalFailed = criticalFailed || r.critical
		}
	}
	status := "READY FOR PRODUCTION"
	if criticalFailed {
		status = "NOT READY"
	}
	fmt.Println()
	fmt.Printf("Results: %d/%d passed, %d failed, %d skipped\n", passed, len(v.results), failed, skipped)
	fmt.Printf("Status: %s\n", status)
	if len(v.recommendations) > 0 {
		fmt.Println()
		fmt.Println("Recommendations:")
		for _, rec := range v.recommendations {
			fmt.Printf("- %s\n", rec)
		}
	}
	if criticalFailed {
		return 1
	}
	return 0
}

func main() {
	os.Exit(runVerifyE2E())
}
