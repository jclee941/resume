// Resume Portfolio - Enhanced Deployment Verification
// Expanded verification with 15+ checks across 5 categories
//
// Categories:
//   1. Service Health (3 checks)
//   2. Security Headers (4 checks)
//   3. Content Integrity (4 checks: title, OG, OG image, JSON-LD parse on /+/en)
//   4. Performance Metrics (3 checks)
//   5. API Endpoints (3 checks)
//
// Usage: ./verify-deployment [--quick|--full] [--json]

package main

import (
	"flag"
	"fmt"
	"time"
)

func main() {
	// Parse flags
	flag.StringVar(&mode, "mode", "full", "Verification mode: quick or full")
	jsonFlag := flag.Bool("json", false, "Output results as JSON")
	flag.Parse()

	if *jsonFlag {
		outputFormat = "json"
	}

	// Handle positional arguments
	if len(flag.Args()) > 0 {
		arg := flag.Args()[0]
		if arg == "--quick" || arg == "quick" {
			mode = "quick"
		} else if arg == "--full" || arg == "full" {
			mode = "full"
		}
	}
	if len(flag.Args()) > 1 {
		arg := flag.Args()[1]
		if arg == "--json" || arg == "json" {
			outputFormat = "json"
		}
	}

	// Header
	if outputFormat == "text" {
		fmt.Printf("%s━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━%s\n", Blue, NoColor)
		fmt.Printf("%sResume Portfolio - Enhanced Deployment Verification v2%s\n", Blue, NoColor)
		fmt.Printf("%s━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━%s\n", Blue, NoColor)
		fmt.Printf("Target: %s%s%s\n", Cyan, portfolioURL, NoColor)
		fmt.Printf("Mode: %s%s%s\n", Cyan, mode, NoColor)
		fmt.Printf("Time: %s%s%s\n", Cyan, time.Now().Format("2006-01-02 15:04:05 MST"), NoColor)
	}

	// Run checks
	checkServiceHealth()
	checkSecurityHeaders()
	checkContentIntegrity()
	checkPerformance()
	checkAPIEndpoints()

	// Summary
	if outputFormat == "text" {
		printSummary()
	} else {
		printJSON()
	}
}
