// Resume Portfolio - E2E Verification Script
// Integrates Playwright E2E tests with deployment verification

package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
)

// ANSI color codes
const (
	Red     = "\033[0;31m"
	Green   = "\033[0;32m"
	Yellow  = "\033[1;33m"
	Blue    = "\033[0;34m"
	NoColor = "\033[0m"
)

// Environment URLs
var urls = map[string]string{
	"production": "https://resume.jclee.me",
	"staging":    "https://resume-staging.jclee.me",
	"local":      "http://localhost:8787",
}

func main() {
	// Get environment
	env := "production"
	if len(os.Args) > 1 {
		env = os.Args[1]
	}

	// Get project root
	projectRoot, err := os.Getwd()
	if err != nil {
		fmt.Fprintf(os.Stderr, "%s✗ Failed to get working directory: %v%s\n", Red, err, NoColor)
		os.Exit(1)
	}

	// Get base URL
	baseURL, ok := urls[env]
	if !ok {
		baseURL = urls["production"]
	}

	// Header
	fmt.Printf("%s━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━%s\n", Blue, NoColor)
	fmt.Printf("%sResume Portfolio - E2E Verification%s\n", Blue, NoColor)
	fmt.Printf("%s━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━%s\n", Blue, NoColor)
	fmt.Printf("Environment: %s%s%s\n", Yellow, env, NoColor)
	fmt.Printf("URL: %s%s%s\n", Yellow, baseURL, NoColor)
	fmt.Println()

	// Check prerequisites
	fmt.Printf("%s[1/4]%s Checking prerequisites...\n", Yellow, NoColor)

	// Check npx
	if _, err := exec.LookPath("npx"); err != nil {
		fmt.Fprintf(os.Stderr, "%s✗ npx not found. Please install Node.js%s\n", Red, NoColor)
		os.Exit(1)
	}
	fmt.Printf("%s✓ npx available%s\n", Green, NoColor)

	// Check Playwright
	os.Chdir(projectRoot)
	cmd := exec.Command("npx", "playwright", "--version")
	if err := cmd.Run(); err != nil {
		fmt.Printf("%s⚠ Playwright not installed. Installing...%s\n", Yellow, NoColor)
		exec.Command("npm", "install", "@playwright/test").Run()
		exec.Command("npx", "playwright", "install", "chromium").Run()
	}
	fmt.Printf("%s✓ Playwright installed%s\n", Green, NoColor)
	fmt.Println()

	// Health check
	fmt.Printf("%s[2/4]%s Running health check...\n", Yellow, NoColor)
	healthURL := baseURL + "/health"

	resp, err := http.Get(healthURL)
	if err == nil && resp.StatusCode == 200 {
		var health map[string]interface{}
		if err := json.NewDecoder(resp.Body).Decode(&health); err == nil {
			status, _ := health["status"].(string)
			if status == "healthy" {
				fmt.Printf("%s✓ Health check passed (status: healthy)%s\n", Green, NoColor)
			} else {
				fmt.Printf("%s⚠ Health status: %s%s\n", Yellow, status, NoColor)
			}
		} else {
			fmt.Printf("%s⚠ Health check returned invalid JSON%s\n", Yellow, NoColor)
		}
		resp.Body.Close()
	} else {
		if resp != nil {
			resp.Body.Close()
		}
		fmt.Printf("%s✗ Health check failed - site may be down%s\n", Red, NoColor)
		fmt.Printf("%s→ Continuing with E2E tests anyway...%s\n", Yellow, NoColor)
	}
	fmt.Println()

	// Run E2E tests
	fmt.Printf("%s[3/4]%s Running Playwright E2E tests...\n", Yellow, NoColor)
	fmt.Printf("%s→ Target: %s%s\n", Blue, baseURL, NoColor)
	fmt.Println()

	// Set BASE_URL for Playwright
	os.Setenv("BASE_URL", baseURL)

	// Run tests
	var testCmd *exec.Cmd
	if env == "local" {
		testCmd = exec.Command("npx", "playwright", "test", "tests/e2e/",
			"--project=chromium",
			"--reporter=list",
			"--retries=1")
	} else {
		testCmd = exec.Command("npx", "playwright", "test", "tests/e2e/",
			"--project=chromium",
			"--reporter=list")
	}
	testCmd.Dir = projectRoot
	testCmd.Stdout = os.Stdout
	testCmd.Stderr = os.Stderr

	testExitCode := 0
	if err := testCmd.Run(); err != nil {
		if exitError, ok := err.(*exec.ExitError); ok {
			testExitCode = exitError.ExitCode()
		} else {
			testExitCode = 1
		}
	}

	fmt.Println()

	// Summary
	fmt.Printf("%s[4/4]%s Verification summary...\n", Yellow, NoColor)
	fmt.Printf("%s━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━%s\n", Blue, NoColor)

	if testExitCode == 0 {
		fmt.Printf("%s🎉 All E2E tests passed!%s\n", Green, NoColor)
		fmt.Println()
		fmt.Printf("%sTest Results:%s\n", Blue, NoColor)
		fmt.Printf("  • Environment: %s\n", env)
		fmt.Printf("  • URL: %s\n", baseURL)
		fmt.Printf("  • Status: %sPASSED%s\n", Green, NoColor)
		fmt.Println()
		fmt.Printf("%sNext Steps:%s\n", Blue, NoColor)
		fmt.Println("  • View full report: npx playwright show-report")
		fmt.Println("  • Run visual tests: npm run test:e2e -- --project=visual")
		os.Exit(0)
	} else {
		fmt.Printf("%s✗ E2E tests failed (exit code: %d)%s\n", Red, testExitCode, NoColor)
		fmt.Println()
		fmt.Printf("%sDebugging:%s\n", Yellow, NoColor)
		fmt.Println("  • View report: npx playwright show-report")
		fmt.Println("  • Run in UI mode: npx playwright test --ui")
		fmt.Println("  • Run specific test: npx playwright test tests/e2e/portfolio.spec.js")
		fmt.Println()
		os.Exit(testExitCode)
	}
}
