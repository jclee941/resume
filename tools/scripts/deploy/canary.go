package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
)

func main() {
	wranglerBin := getEnv("WRANGLER_BIN", "wrangler")
	newVersion := os.Getenv("NEW_VERSION")
	stableVersion := os.Getenv("STABLE_VERSION")

	if newVersion == "" || stableVersion == "" {
		fmt.Fprintf(os.Stderr, "Usage: NEW_VERSION=<id> STABLE_VERSION=<id> %s\n", os.Args[0])
		os.Exit(1)
	}

	stages := []struct {
		newPct    int
		stablePct int
		label     string
	}{{25, 75, "25%"}, {50, 50, "50%"}, {75, 25, "75%"}, {100, 0, "100%"}}

	for _, stage := range stages {
		if !runStep(wranglerBin, newVersion, stableVersion, stage.newPct, stage.stablePct, stage.label) {
			os.Exit(1)
		}
	}

	fmt.Println("Canary rollout completed")
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}

func runStep(wranglerBin, newVersion, stableVersion string, newPct, stablePct int, label string) bool {
	fmt.Printf("Canary step: %s (%d/%d)\n", label, newPct, stablePct)
	cmd := exec.Command(wranglerBin, "versions", "deploy",
		fmt.Sprintf("%s@%d", newVersion, newPct),
		fmt.Sprintf("%s@%d", stableVersion, stablePct))
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		return false
	}

	if !runHealthGate() {
		return false
	}

	return true
}

func runHealthGate() bool {
	healthGatePath := filepath.Join(filepath.Dir(os.Args[0]), "health-gate")
	cmd := exec.Command(healthGatePath)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		return false
	}

	return true
}
