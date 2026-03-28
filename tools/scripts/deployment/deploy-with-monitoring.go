// deploy-with-monitoring.go
// Deploy resume portfolio with real-time monitoring via tmux
package main

import (
	"bytes"
	"fmt"
	"os"
	"os/exec"
	"strings"
	"time"
)

const (
	sessionName = "resume-deploy"
	windowName  = "main"
)

const (
	green = "\033[0;32m"
	blue  = "\033[0;34m"
	red   = "\033[0;31m"
	nc    = "\033[0m"
)

func runCmd(name string, args ...string) error {
	cmd := exec.Command(name, args...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

func runCmdOutput(name string, args ...string) (string, error) {
	cmd := exec.Command(name, args...)
	var buf bytes.Buffer
	cmd.Stdout = &buf
	cmd.Stderr = &buf
	err := cmd.Run()
	return buf.String(), err
}

func sendKeys(keys string) error {
	return runCmd("tmux", "send-keys", "-t", sessionName+":"+windowName, keys, "C-m")
}

func capturePane(lines int) string {
	out, err := runCmdOutput("tmux", "capture-pane", "-t", sessionName+":"+windowName, "-p")
	if err != nil {
		return ""
	}
	// Get last N lines
	allLines := strings.Split(strings.TrimRight(out, "\n"), "\n")
	if len(allLines) <= lines {
		return out
	}
	return strings.Join(allLines[len(allLines)-lines:], "\n")
}

func checkSessionExists() bool {
	err := runCmd("tmux", "has-session", "-t", sessionName)
	return err == nil
}

func killSession() error {
	return runCmd("tmux", "kill-session", "-t", sessionName)
}

func newSession() error {
	return runCmd("tmux", "new-session", "-d", "-s", sessionName, "-n", windowName)
}

func setHistoryLimit() error {
	return runCmd("tmux", "set-option", "-t", sessionName, "history-limit", "50000")
}

func getProjectRoot() string {
	// Get absolute path to project root (3 levels up from script location)
	ex, err := os.Executable()
	if err != nil {
		// Fallback to cwd
		cwd, _ := os.Getwd()
		return cwd
	}
	// Navigate up 3 levels: deployment -> scripts -> tools -> project root
	parts := strings.Split(ex, "/")
	if len(parts) >= 3 {
		root := strings.Join(parts[:len(parts)-3], "/")
		return root
	}
	cwd, _ := os.Getwd()
	return cwd
}

func step1Build(root string) bool {
	fmt.Printf("%s[1/4] Building worker.js...%s\n", blue, nc)
	sendKeys("cd " + root + " && npm run build")
	time.Sleep(2 * time.Second)
	output := capturePane(5)
	if strings.Contains(output, "generated successfully") {
		fmt.Printf("%s✅ Build completed%s\n", green, nc)
		return true
	}
	fmt.Printf("%s❌ Build may have failed, check session%s\n", red, nc)
	return false
}

func step2Tests() bool {
	fmt.Printf("%s[2/4] Running tests...%s\n", blue, nc)
	sendKeys("npm test")
	time.Sleep(3 * time.Second)
	output := capturePane(10)
	if strings.Contains(output, "Tests:") && strings.Contains(output, "passed") {
		fmt.Printf("%s✅ Tests passed%s\n", green, nc)
		return true
	}
	fmt.Printf("%s❌ Tests may have failed, check session%s\n", red, nc)
	return false
}

func step3Deploy(root string) bool {
	fmt.Printf("%s[3/4] Deploying to Cloudflare Workers...%s\n", blue, nc)
	sendKeys("cd " + root + " && npx wrangler deploy --config apps/portfolio/wrangler.toml --env production")
	time.Sleep(5 * time.Second)
	output := capturePane(10)
	if strings.Contains(output, "Published") || strings.Contains(output, "Deployed") || strings.Contains(output, "Success") {
		fmt.Printf("%s✅ Deployment completed%s\n", green, nc)
		return true
	}
	fmt.Printf("%s❌ Deployment may have failed, check session%s\n", red, nc)
	return false
}

func step4Verify() bool {
	fmt.Printf("%s[4/4] Verifying deployment...%s\n", blue, nc)
	sendKeys("curl -I https://resume.jclee.me")
	time.Sleep(2 * time.Second)
	output := capturePane(5)
	if strings.Contains(output, "HTTP/") && strings.Contains(output, "200") {
		fmt.Printf("%s✅ Deployment verified (HTTP 200)%s\n", green, nc)
		return true
	}
	fmt.Printf("%s❌ Verification failed, check session%s\n", red, nc)
	return false
}

func main() {
	fmt.Printf("%s🚀 Starting Resume Portfolio Deployment%s\n", blue, nc)
	fmt.Printf("%s📺 Creating tmux session: %s%s\n", blue, sessionName, nc)

	projectRoot := getProjectRoot()

	// Check if session already exists
	if checkSessionExists() {
		fmt.Printf("%s♻️  Session already exists, killing...%s\n", blue, nc)
		killSession()
	}

	// Create new tmux session
	if err := newSession(); err != nil {
		fmt.Printf("%s❌ Failed to create tmux session: %v%s\n", red, err, nc)
		os.Exit(1)
	}

	// Set unlimited scrollback
	setHistoryLimit()

	fmt.Printf("%s✅ Tmux session created%s\n", green, nc)
	fmt.Println()
	fmt.Printf("%s📝 Deployment Steps:%s\n", blue, nc)
	fmt.Println("  1. Building worker.js")
	fmt.Println("  2. Running tests")
	fmt.Println("  3. Deploying to Cloudflare")
	fmt.Println("  4. Verifying deployment")
	fmt.Println()

	// Step 1: Build
	step1Build(projectRoot)
	fmt.Println()

	// Step 2: Tests
	step2Tests()
	fmt.Println()

	// Step 3: Deploy
	step3Deploy(projectRoot)
	fmt.Println()

	// Step 4: Verify
	step4Verify()
	fmt.Println()

	fmt.Printf("%s🎉 Deployment process completed!%s\n", green, nc)
	fmt.Println()
	fmt.Printf("%s📺 View session:%s\n", blue, nc)
	fmt.Printf("   tmux attach -t %s\n", sessionName)
	fmt.Println()
	fmt.Printf("%s📊 Stream logs:%s\n", blue, nc)
	fmt.Printf("   tmux capture-pane -t %s -p\n", sessionName)
	fmt.Println()
	fmt.Printf("%s🔚 Kill session:%s\n", blue, nc)
	fmt.Printf("   tmux kill-session -t %s\n", sessionName)
}
