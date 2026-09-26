package main

import (
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
		fmt.Fprintf(os.Stderr, "%s→ Option 2: export CLOUDFLARE_API_KEY=your_key && export CLOUDFLARE_EMAIL=your@email%s\n", Yellow, NoColor)
		fmt.Fprintf(os.Stderr, "%s→ See guide: docs/CLOUDFLARE_AUTH_METHODS.md%s\n", Yellow, NoColor)
		os.Exit(1)
	}

	// Deploy
	cmd := exec.Command("npx", "wrangler", "deploy",
		"--config", filepath.Join(projectRoot, "wrangler.jsonc"))
	cmd.Dir = projectRoot
	cmd.Env = append(os.Environ(), "CLOUDFLARE_ENV=")
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
