// Resume Portfolio - Automated Deployment Helper
// 6-stage deployment pipeline for Cloudflare Workers

package main

import (
	"fmt"
	"os"
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
