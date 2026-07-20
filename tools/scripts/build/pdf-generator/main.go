package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

const (
	Red     = "\033[0;31m"
	Green   = "\033[0;32m"
	Yellow  = "\033[1;33m"
	Blue    = "\033[0;34m"
	NoColor = "\033[0m"
)

var (
	scriptDir   string
	projectRoot string
	version     string
)

func main() {
	var err error
	scriptDir, err = os.Getwd()
	if err != nil {
		fmt.Fprintf(os.Stderr, "%s✗ Failed to get working directory: %v%s\n", Red, err, NoColor)
		os.Exit(1)
	}
	projectRoot, err = findProjectRoot(scriptDir)
	if err != nil {
		fmt.Fprintf(os.Stderr, "%s✗ Failed to find project root: %v%s\n", Red, err, NoColor)
		os.Exit(1)
	}

	version = getVersion()
	if !checkDependencies() {
		os.Exit(1)
	}
	fmt.Println()

	variant := "all"
	if len(os.Args) > 1 {
		variant = os.Args[1]
	}
	if variant == "all" {
		generateAllResumes()
		return
	}
	generateVariant(variant)
}

func getVersion() string {
	cmd := exec.Command("node", "-p", "require('./package.json').version")
	cmd.Dir = projectRoot
	out, err := cmd.Output()
	if err != nil {
		return "1.0.0"
	}
	return strings.TrimSpace(string(out))
}

func findProjectRoot(startDir string) (string, error) {
	dir, err := filepath.Abs(startDir)
	if err != nil {
		return "", err
	}
	for {
		if _, err := os.Stat(filepath.Join(dir, "package.json")); err == nil {
			return dir, nil
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return "", fmt.Errorf("package.json not found from %s", startDir)
		}
		dir = parent
	}
}
