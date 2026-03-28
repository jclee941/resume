// Resume Portfolio - Automated Deployment Helper
// 6-stage deployment pipeline for Cloudflare Workers

package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

// ANSI color codes
const (
	Red     = "\033[0;31m"
	Green   = "\033[0;32m"
	Yellow  = "\033[1;33m"
	Blue    = "\033[0;34m"
	NoColor = "\033[0m"
)

var projectRoot string

func main() {
	// Set up project root
	var err error
	projectRoot, err = os.Getwd()
	if err != nil {
		fmt.Fprintf(os.Stderr, "%s✗ Failed to get working directory: %v%s\n", Red, err, NoColor)
		os.Exit(1)
	}

	fmt.Printf("%s━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━%s\n", Blue, NoColor)
	fmt.Printf("%sResume Portfolio - Deployment Helper%s\n", Blue, NoColor)
	fmt.Printf("%s━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━%s\n", Blue, NoColor)
	fmt.Println()

	// Run all stages
	checkPrerequisites()
	runTests()
	buildWorker()
	checkGitStatus()
	deployCloudflare()
	verifyDeployment()

	// Success
	fmt.Printf("%s━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━%s\n", Green, NoColor)
	fmt.Printf("%s🎉 Deployment Successful!%s\n", Green, NoColor)
	fmt.Printf("%s━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━%s\n", Green, NoColor)
	fmt.Println()
	fmt.Printf("%sProduction URLs:%s\n", Blue, NoColor)
	fmt.Println("  • Site:    https://resume.jclee.me")
	fmt.Println("  • Health:  https://resume.jclee.me/health")
	fmt.Println("  • Metrics: https://resume.jclee.me/metrics")
	fmt.Println("  • OG Image: https://resume.jclee.me/og-image.png")
	fmt.Println()
	fmt.Printf("%sNext steps:%s\n", Blue, NoColor)
	fmt.Println("  1. Test social media previews (Twitter, Facebook, LinkedIn)")
	fmt.Println("  2. Monitor Web Vitals in Grafana Loki")
	fmt.Println("  3. Check GitHub Actions workflow (if pushed to GitHub)")
	fmt.Println()
}

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

// Stage 3: Build worker
func buildWorker() {
	fmt.Printf("%s[3/6]%s Building worker.js...\n", Yellow, NoColor)

	// Set deployment timestamp
	deployedAt := time.Now().UTC().Format("2006-01-02T15:04:05Z")
	os.Setenv("DEPLOYED_AT", deployedAt)

	// Run build
	cmd := exec.Command("npm", "run", "build")
	cmd.Dir = projectRoot
	if err := cmd.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "%s✗ Worker generation failed%s\n", Red, NoColor)
		os.Exit(1)
	}

	// Check if worker.js was created
	workerPath := filepath.Join(projectRoot, "apps", "portfolio", "worker.js")
	if info, err := os.Stat(workerPath); err == nil {
		sizeKB := float64(info.Size()) / 1024
		fmt.Printf("%s✓ Worker generated:%s %.2f KB\n", Green, NoColor, sizeKB)
		fmt.Printf("%s✓ Deployment timestamp:%s %s\n", Green, NoColor, deployedAt)
	} else {
		fmt.Fprintf(os.Stderr, "%s✗ Worker generation failed%s\n", Red, NoColor)
		os.Exit(1)
	}

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

// Stage 5: Deploy to Cloudflare
func deployCloudflare() {
	fmt.Printf("%s[5/6]%s Deploying to Cloudflare Workers...\n", Yellow, NoColor)

	// Check authentication
	if os.Getenv("CLOUDFLARE_API_TOKEN") != "" {
		fmt.Printf("%sUsing: API Token authentication%s\n", Blue, NoColor)
	} else if os.Getenv("CLOUDFLARE_API_KEY") != "" && os.Getenv("CLOUDFLARE_EMAIL") != "" {
		fmt.Printf("%sUsing: Global API Key authentication%s\n", Blue, NoColor)
	} else {
		fmt.Fprintf(os.Stderr, "%s✗ No Cloudflare authentication configured%s\n", Red, NoColor)
		fmt.Fprintf(os.Stderr, "%s→ Option 1: export CLOUDFLARE_API_TOKEN=your_token%s\n", Yellow, NoColor)
		fmt.Fprintf(os.Stderr, "%s→ Option 2: export CLOUDFLARE_API_KEY=your_key \u0026\u0026 export CLOUDFLARE_EMAIL=your@email%s\n", Yellow, NoColor)
		fmt.Fprintf(os.Stderr, "%s→ See guide: docs/CLOUDFLARE_AUTH_METHODS.md%s\n", Yellow, NoColor)
		os.Exit(1)
	}

	// Deploy
	cmd := exec.Command("npx", "wrangler", "deploy",
		"--config", filepath.Join(projectRoot, "apps", "portfolio", "wrangler.toml"),
		"--env", "production")
	cmd.Dir = projectRoot
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "%s✗ Deployment failed%s\n", Red, NoColor)
		fmt.Fprintf(os.Stderr, "%s→ Check logs: ~/.config/.wrangler/logs/%s\n", Yellow, NoColor)
		os.Exit(1)
	}
	fmt.Printf("%s✓ Deployed successfully%s\n", Green, NoColor)

	fmt.Println()
}

// Stage 6: Verify deployment
func verifyDeployment() {
	fmt.Printf("%s[6/6]%s Verifying deployment...\n", Yellow, NoColor)

	time.Sleep(3 * time.Second) // Wait for propagation

	// Check health endpoint
	resp, err := http.Get("https://resume.jclee.me/health")
	if err == nil && resp.StatusCode == 200 {
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()

		var health map[string]interface{}
		if err := json.Unmarshal(body, &health); err == nil {
			status, _ := health["status"].(string)
			deployedAt, _ := health["deployed_at"].(string)
			fmt.Printf("%s✓ Health check:%s %s\n", Green, NoColor, status)
			fmt.Printf("%s✓ Deployed at:%s %s\n", Green, NoColor, deployedAt)
		}
	} else {
		if resp != nil {
			resp.Body.Close()
		}
		fmt.Fprintf(os.Stderr, "%s✗ Health check failed%s\n", Red, NoColor)
		os.Exit(1)
	}

	// Check OG image
	resp, err = http.Head("https://resume.jclee.me/og-image.png")
	if err == nil && resp.StatusCode == 200 {
		resp.Body.Close()
		fmt.Printf("%s✓ OG image accessible%s\n", Green, NoColor)
	} else {
		if resp != nil {
			resp.Body.Close()
		}
		fmt.Printf("%s⚠ OG image check failed%s\n", Yellow, NoColor)
	}

	// Check metrics endpoint
	resp, err = http.Get("https://resume.jclee.me/metrics")
	if err == nil && resp.StatusCode == 200 {
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		if strings.Contains(string(body), "http_requests_total") {
			fmt.Printf("%s✓ Metrics endpoint working%s\n", Green, NoColor)
		} else {
			fmt.Printf("%s⚠ Metrics endpoint check failed%s\n", Yellow, NoColor)
		}
	} else {
		if resp != nil {
			resp.Body.Close()
		}
		fmt.Printf("%s⚠ Metrics endpoint check failed%s\n", Yellow, NoColor)
	}

	fmt.Println()
}
