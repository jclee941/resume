package main

import (
	"fmt"
	"strings"
)

func printSummaryTable(claims []claim) {
	fmt.Println()
	fmt.Printf("%s=== SUMMARY TABLE ===%s\n", cyan, reset)
	fmt.Printf("%-40s %-20s %s\n", "Claim", "Status", "Evidence")
	fmt.Println(strings.Repeat("-", 100))
	for _, c := range claims {
		color := green
		if strings.HasPrefix(c.status, "FAIL") {
			color = red
		} else if strings.HasPrefix(c.status, "STALE") {
			color = yellow
		} else if strings.HasPrefix(c.status, "PARTIAL") {
			color = yellow
		}
		firstLine := c.details
		if idx := strings.Index(firstLine, "\n"); idx != -1 {
			firstLine = firstLine[:idx]
		}
		if len(firstLine) > 55 {
			firstLine = firstLine[:52] + "..."
		}
		fmt.Printf("%-40s %s%-20s%s %s\n", c.name, color, c.status, reset, firstLine)
	}
	fmt.Println()
}

func printConfirmedGaps(claims []claim) {
	fmt.Printf("%s=== CONFIRMED GAPS ===%s\n", red, reset)
	found := false
	for _, c := range claims {
		if strings.HasPrefix(c.status, "FAIL") || strings.HasPrefix(c.status, "PARTIAL") {
			found = true
			fmt.Printf("\n%s%s%s\n", cyan, c.name, reset)
			lines := strings.Split(c.details, "\n")
			for _, line := range lines {
				if strings.TrimSpace(line) != "" {
					fmt.Printf("  %s•%s %s\n", red, reset, strings.TrimSpace(line))
				}
			}
		}
	}
	if !found {
		fmt.Printf("  %s(no confirmed gaps)%s\n", green, reset)
	}
	fmt.Println()
}

func printStaleAssumptions(claims []claim) {
	fmt.Printf("%s=== STALE ASSUMPTIONS ===%s\n", yellow, reset)
	found := false
	for _, c := range claims {
		if strings.HasPrefix(c.status, "STALE") {
			found = true
			fmt.Printf("\n%s%s%s\n", cyan, c.name, reset)
			lines := strings.Split(c.details, "\n")
			for _, line := range lines {
				if strings.TrimSpace(line) != "" {
					fmt.Printf("  %s•%s %s\n", yellow, reset, strings.TrimSpace(line))
				}
			}
		}
	}
	if !found {
		fmt.Printf("  %s(no stale assumptions)%s\n", green, reset)
	}
	fmt.Println()
}

func printRecommendations(claims []claim) {
	fmt.Printf("%s=== RECOMMENDATIONS ===%s\n", cyan, reset)
	recs := []string{
		"Migrate apps/portfolio/lib/validators.js to use @resume/schemas instead of hand-rolled validation",
		"Evaluate whether @resume/types, @resume/schemas, @resume/contracts packages need adoption in app code or deprecation",
		"Add a bidirectional sync mechanism: crawlers → SSoT enrichment pipeline for profile data",
		"Consider GitHub API integration for repository/activity enrichment into resume_data.json",
		"Ensure 'npm run sync:data' is always followed by 'npm run build' in automation (automate:ssot already does this)",
		"Document the split of applications.js and auto-apply.js in architecture docs to close Epic 6 tracking",
	}
	for _, r := range recs {
		fmt.Printf("  %s•%s %s\n", cyan, reset, r)
	}
	fmt.Println()
}
