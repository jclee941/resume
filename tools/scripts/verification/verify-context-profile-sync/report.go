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
	found := false
	for _, c := range claims {
		if !strings.HasPrefix(c.status, "FAIL") && !strings.HasPrefix(c.status, "PARTIAL") {
			continue
		}
		for _, line := range strings.Split(c.details, "\n") {
			if _, action, ok := strings.Cut(line, "Action: "); ok {
				found = true
				fmt.Printf("  %s•%s %s\n", cyan, reset, action)
			}
		}
	}
	if !found {
		fmt.Printf("  %s(none: every claim is resolved)%s\n", green, reset)
	}
	fmt.Println()
}
