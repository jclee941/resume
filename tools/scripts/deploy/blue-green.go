package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
)

func main() {
	wranglerBin := getEnv("WRANGLER_BIN", "wrangler")
	workerName := getEnv("WORKER_NAME", "resume-portfolio")
	newVersion := os.Getenv("NEW_VERSION")
	stableVersion := os.Getenv("STABLE_VERSION")

	if newVersion == "" || stableVersion == "" {
		fmt.Fprintf(os.Stderr, "Usage: NEW_VERSION=<id> STABLE_VERSION=<id> %s\n", os.Args[0])
		os.Exit(1)
	}

	fmt.Printf("Starting blue-green deploy for %s\n", workerName)
	fmt.Printf("Blue (stable): %s\n", stableVersion)
	fmt.Printf("Green (candidate): %s\n", newVersion)

	scriptDir, err := filepath.Abs(filepath.Dir(os.Args[0]))
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error getting script directory: %v\n", err)
		os.Exit(1)
	}

	deployCmd := exec.Command(wranglerBin, "versions", "deploy", fmt.Sprintf("%s@100", newVersion), fmt.Sprintf("%s@0", stableVersion))
	deployCmd.Stdout = os.Stdout
	deployCmd.Stderr = os.Stderr
	if err := deployCmd.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "Deployment failed: %v\n", err)
		os.Exit(1)
	}

	healthGatePath := filepath.Join(scriptDir, "health-gate")
	if _, err := os.Stat(healthGatePath); os.IsNotExist(err) {
		healthGatePath = filepath.Join(scriptDir, "health-gate.go")
	}

	healthGateCmd := exec.Command(healthGatePath)
	healthGateCmd.Stdout = os.Stdout
	healthGateCmd.Stderr = os.Stderr
	if err := healthGateCmd.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "Health gate failed: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("Blue-green deployment completed")
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}
