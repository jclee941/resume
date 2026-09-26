// Context Profile Sync Baseline Verification
// Fact-checks the current state of resume.jclee.me monorepo sync automation,
// distinguishing confirmed gaps from stale assumptions.
//
// Usage: go run ./tools/scripts/verification/verify-context-profile-sync

package main

import (
	"fmt"
	"os"
	"strings"
)

const (
	reset  = "\033[0m"
	red    = "\033[31m"
	green  = "\033[32m"
	yellow = "\033[33m"
	cyan   = "\033[36m"
)

type claim struct {
	name    string
	status  string
	details string
}

func main() {
	repoRoot := "."
	if len(os.Args) > 1 {
		repoRoot = os.Args[1]
	}

	fmt.Printf("%s╔══════════════════════════════════════════════════════════════╗%s\n", cyan, reset)
	fmt.Printf("%s║     Resume.jclee.me Context/Profile Sync Baseline Audit     ║%s\n", cyan, reset)
	fmt.Printf("%s╚══════════════════════════════════════════════════════════════╝%s\n\n", cyan, reset)

	claims := []claim{}

	// CLAIM A: Epic 6 file-size hygiene
	claims = append(claims, checkEpic6(repoRoot))

	// CLAIM B: Shared packages usage
	claims = append(claims, checkSharedPackages(repoRoot))

	// CLAIM C: Profile sync directionality
	claims = append(claims, checkSyncDirection(repoRoot))

	// CLAIM D: External enrichment
	claims = append(claims, checkExternalEnrichment(repoRoot))

	// CLAIM E: Build freshness
	claims = append(claims, checkBuildFreshness(repoRoot))

	// Print summary table
	printSummaryTable(claims)

	// Print confirmed gaps
	printConfirmedGaps(claims)

	// Print stale assumptions
	printStaleAssumptions(claims)

	// Print recommendations
	printRecommendations(claims)

	// Count categories
	confirmed := 0
	stale := 0
	partial := 0
	for _, c := range claims {
		if strings.HasPrefix(c.status, "FAIL") {
			confirmed++
		} else if strings.HasPrefix(c.status, "STALE") {
			stale++
		} else if strings.HasPrefix(c.status, "PARTIAL") {
			partial++
		}
	}

	fmt.Printf("\n%sSummary:%s Confirmed=%d Stale=%d Partial=%d\n", cyan, reset, confirmed, stale, partial)

	if confirmed > 0 || partial > 0 {
		os.Exit(1)
	}
	os.Exit(0)
}
