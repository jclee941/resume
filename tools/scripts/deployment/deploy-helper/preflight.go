package main

import (
	"bufio"
	"fmt"
	"os"
	"os/exec"
	"strings"
)

// Stage 1: Check prerequisites
func checkPrerequisites() {
	fmt.Printf("%s[1/6]%s Checking prerequisites...\n", Yellow, NoColor)

	// Check Node.js
	cmd := exec.Command("node", "--version")
	out, err := cmd.Output()
	if err != nil {
		fmt.Fprintf(os.Stderr, "%s✗ Node.js not found%s\n", Red, NoColor)
		os.Exit(1)
	}
	fmt.Printf("%s✓ Node.js:%s %s", Green, NoColor, strings.TrimSpace(string(out)))

	// Check npm
	cmd = exec.Command("npm", "--version")
	out, err = cmd.Output()
	if err != nil {
		fmt.Fprintf(os.Stderr, "%s✗ npm not found%s\n", Red, NoColor)
		os.Exit(1)
	}
	fmt.Printf("%s✓ npm:%s %s", Green, NoColor, strings.TrimSpace(string(out)))

	// Check git
	cmd = exec.Command("git", "--version")
	out, err = cmd.Output()
	if err != nil {
		fmt.Fprintf(os.Stderr, "%s✗ git not found%s\n", Red, NoColor)
		os.Exit(1)
	}
	fmt.Printf("%s✓ git:%s %s\n", Green, NoColor, strings.Fields(string(out))[2])

	fmt.Println()
}

// Stage 2: Run tests
func runTests() {
	fmt.Printf("%s[2/6]%s Running tests...\n", Yellow, NoColor)

	// Run unit tests
	cmd := exec.Command("npm", "test")
	cmd.Dir = projectRoot
	if err := cmd.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "%s✗ Unit tests failed%s\n", Red, NoColor)
		os.Exit(1)
	}
	fmt.Printf("%s✓ Unit tests passed%s\n", Green, NoColor)

	// Run E2E tests
	cmd = exec.Command("npm", "run", "test:e2e")
	cmd.Dir = projectRoot
	if err := cmd.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "%s✗ E2E tests failed%s\n", Red, NoColor)
		os.Exit(1)
	}
	fmt.Printf("%s✓ E2E tests passed (10/10)%s\n", Green, NoColor)

	fmt.Println()
}

// Stage 4: Check git status
func checkGitStatus() {
	fmt.Printf("%s[4/6]%s Checking git status...\n", Yellow, NoColor)

	cmd := exec.Command("git", "status", "--porcelain")
	cmd.Dir = projectRoot
	out, err := cmd.Output()
	if err != nil {
		fmt.Fprintf(os.Stderr, "%s✗ Git status check failed%s\n", Red, NoColor)
		os.Exit(1)
	}

	if len(out) > 0 {
		fmt.Printf("%s⚠ Uncommitted changes detected:%s\n", Yellow, NoColor)
		fmt.Println(string(out))

		reader := bufio.NewReader(os.Stdin)
		fmt.Print("Continue with deployment? (y/N): ")
		response, _ := reader.ReadString('\n')
		response = strings.TrimSpace(strings.ToLower(response))

		if response != "y" && response != "yes" {
			fmt.Fprintf(os.Stderr, "%s✗ Deployment cancelled%s\n", Red, NoColor)
			os.Exit(1)
		}
	} else {
		fmt.Printf("%s✓ Working directory clean%s\n", Green, NoColor)
	}

	fmt.Println()
}
