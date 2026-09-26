package main

import (
	"os"
)

const (
	colorReset  = "\033[0m"
	colorRed    = "\033[31m"
	colorGreen  = "\033[32m"
	colorYellow = "\033[33m"
	colorBlue   = "\033[34m"

	profilesDir       = "/opt/wanted-profiles"
	logDir            = "/var/log/session-broker"
	defaultStealthURL = "http://localhost:8080"
	defaultWantedURL  = "https://www.wanted.co.kr/"
)

type checkResult struct {
	name        string
	ok          bool
	detail      string
	remediation string
	value       string
	skipped     bool
}

func main() {
	useXvfb := isTruthy(os.Getenv("SESSION_BROKER_USE_XVFB")) || hasFlag("--use-xvfb")
	stealthURL := envOrDefault("STEALTH_BROWSER_ENDPOINT", defaultStealthURL)
	wantedURL := envOrDefault("SESSION_BROKER_WANTED_REACHABILITY_URL", defaultWantedURL)

	results := []checkResult{
		checkOS(),
		checkBinaryVersion("Chrome/Chromium", []string{"google-chrome", "chromium", "chromium-browser"}, 0, 0),
		checkBinaryVersion("Python", []string{"python3"}, 3, 10),
		checkCloakBrowser(),
		checkBinaryVersion("Node.js", []string{"node"}, 18, 0),
		ensureDirectory(profilesDir, 0o750, true),
		ensureDirectory(logDir, 0o755, false),
		checkWriteAccess(profilesDir),
		checkEnv("SESSION_ENCRYPTION_KEY", validateEncryptionKey),
		checkEnv("WANTED_EMAIL", validateNonEmpty),
		checkWantedSecret(),
		checkEnv("JOB_SERVER_URL", validateURL),
		checkEnv("JOB_SERVER_ADMIN_TOKEN", validateNonEmpty),
		checkConnectivity("Stealth browser", stealthURL),
		checkConnectivity("Wanted API", wantedURL),
		checkXvfb(useXvfb),
	}

	printHeader("Session Broker Server Setup Verification")
	failed := 0
	for _, result := range results {
		printResult(result)
		if !result.ok && !result.skipped {
			failed++
		}
	}

	printSummary(results, stealthURL, wantedURL, useXvfb)
	printServiceInstructions()

	if failed > 0 {
		os.Exit(1)
	}
	os.Exit(0)
}
