// Quick Deploy Script - Go migration from quick-deploy.sh
// One-command deployment with all checks
package main

import (
	"fmt"
	"os"
	"os/exec"
)

const (
	projectRoot = "/home/jclee/dev/resume"
)

// ANSI color codes
const (
	RED    = "\033[0;31m"
	GREEN  = "\033[0;32m"
	YELLOW = "\033[1;33m"
	BLUE   = "\033[0;34m"
	NC     = "\033[0m"
)

func printBoxHeader() {
	fmt.Printf("%s╔════════════════════════════════════════╗%s\n", BLUE, NC)
	fmt.Printf("%s║  Resume Portfolio - Quick Deploy      ║%s\n", BLUE, NC)
	fmt.Printf("%s╚════════════════════════════════════════╝%s\n", BLUE, NC)
	fmt.Println()
}

func checkAuth() (string, bool) {
	apiToken := os.Getenv("CLOUDFLARE_API_TOKEN")
	apiKey := os.Getenv("CLOUDFLARE_API_KEY")
	email := os.Getenv("CLOUDFLARE_EMAIL")

	if apiToken != "" {
		fmt.Printf("%s✓ Authentication: API Token (recommended)%s\n", GREEN, NC)
		return "API Token", true
	} else if apiKey != "" && email != "" {
		fmt.Printf("%s✓ Authentication: Global API Key%s\n", GREEN, NC)
		return "Global API Key", true
	}

	fmt.Printf("%s✗ No Cloudflare authentication configured%s\n", RED, NC)
	fmt.Println()
	fmt.Printf("%sQuick Setup Options:%s\n", YELLOW, NC)
	fmt.Println()
	fmt.Println("Option 1: API Token (⭐ Recommended)")
	fmt.Printf("  export CLOUDFLARE_API_TOKEN=your_token_here\n")
	fmt.Printf("  %s\n", os.Args[0])
	fmt.Println()
	fmt.Println("Option 2: Global API Key")
	fmt.Printf("  export CLOUDFLARE_API_KEY=your_key_here\n")
	fmt.Printf("  export CLOUDFLARE_EMAIL=your@email.com\n")
	fmt.Printf("  %s\n", os.Args[0])
	fmt.Println()
	fmt.Println("Option 3: Interactive login (opens browser)")
	fmt.Printf("  cd apps/portfolio && npx wrangler login\n")
	fmt.Println()
	fmt.Printf("%s→ See detailed guide: docs/CLOUDFLARE_AUTH_METHODS.md%s\n", BLUE, NC)
	fmt.Printf("%s→ See token guide: docs/GET_CLOUDFLARE_API_TOKEN.md%s\n", BLUE, NC)
	fmt.Println()

	return "", false
}

func runScript(scriptPath string) error {
	cmd := exec.Command("go", "run", scriptPath)
	cmd.Dir = projectRoot
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

func main() {
	os.Chdir(projectRoot)

	printBoxHeader()

	_, authOk := checkAuth()
	if !authOk {
		os.Exit(1)
	}

	fmt.Println()

	if err := runScript("./tools/scripts/deployment/deploy-helper.go"); err != nil {
		fmt.Printf("%s✗ Deployment failed%s\n", RED, NC)
		fmt.Printf("%s→ Check logs: ~/.config/.wrangler/logs/%s\n", YELLOW, NC)
		fmt.Printf("%s→ See troubleshooting: docs/MANUAL_DEPLOYMENT_GUIDE.md%s\n", YELLOW, NC)
		os.Exit(1)
	}

	fmt.Printf("%s✓ Deployment completed%s\n", GREEN, NC)
	fmt.Println()

	fmt.Printf("%sRunning deployment verification...%s\n", BLUE, NC)
	fmt.Println()

	if err := runScript("./tools/scripts/verification/verify-deployment.go"); err != nil {
		fmt.Printf("%s✗ Verification failed%s\n", RED, NC)
		os.Exit(1)
	}

	os.Exit(0)
}
