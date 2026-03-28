package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
)

const (
	GREEN  = "\033[0;32m"
	YELLOW = "\033[0;33m"
	RED    = "\033[0;31m"
	NC     = "\033[0m"
)

func main() {
	wranglerBin := getEnv("WRANGLER_BIN", "wrangler")
	previousVersion := getEnv("PREVIOUS_VERSION", "")
	currentVersion := getEnv("CURRENT_VERSION", "")

	if previousVersion == "" || currentVersion == "" {
		fmt.Fprintf(os.Stderr, "Usage: PREVIOUS_VERSION=<id> CURRENT_VERSION=<id> %s\n", os.Args[0])
		os.Exit(1)
	}

	fmt.Println("Rolling back traffic to previous stable version")

	cmd := exec.Command(wranglerBin, "versions", "deploy", previousVersion+"@100", currentVersion+"@0")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "%s[ERROR] Wrangler deploy failed: %v%s\n", RED, err, NC)
		os.Exit(1)
	}

	// Call health-gate.go
	scriptDir := getScriptDir()
	healthGateCmd := exec.Command("go", "run", filepath.Join(scriptDir, "health-gate.go"))
	healthGateCmd.Stdout = os.Stdout
	healthGateCmd.Stderr = os.Stderr
	if err := healthGateCmd.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "%s[ERROR] Health gate failed: %v%s\n", RED, err, NC)
		os.Exit(1)
	}

	fmt.Println("Rollback completed")
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}

func getScriptDir() string {
	exe, err := os.Executable()
	if err != nil {
		return "."
	}
	return filepath.Dir(exe)
}
