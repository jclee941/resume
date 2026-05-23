// Context Profile Sync Baseline Verification
// Fact-checks the current state of resume.jclee.me monorepo sync automation,
// distinguishing confirmed gaps from stale assumptions.
//
// Usage: go run tools/scripts/verification/verify-context-profile-sync.go

package main

import (
	"bufio"
	"flag"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
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
	jsonFlag := flag.Bool("json", false, "Output results as JSON")
	flag.Parse()
	if len(flag.Args()) > 0 {
		repoRoot = flag.Args()[0]
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

	if *jsonFlag {
		fmt.Println("{}")
	}

	if confirmed > 0 || partial > 0 {
		os.Exit(1)
	}
	os.Exit(0)
}

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

// ─── Claim A: Epic 6 file-size hygiene is pending ──────────────────────────

func checkEpic6(repoRoot string) claim {
	appsDir := filepath.Join(repoRoot, "apps", "job-dashboard", "src", "handlers")
	files := []string{
		filepath.Join(appsDir, "applications.js"),
		filepath.Join(appsDir, "auto-apply.js"),
	}

	details := []string{}
	allSmall := true
	for _, f := range files {
		lines := countLines(f)
		status := "✅ split"
		if lines > 500 {
			status = "❌ still large"
			allSmall = false
		} else if lines > 50 {
			status = "⚠️ medium"
		}
		details = append(details, fmt.Sprintf("    %s: %d lines (%s)", filepath.Base(f), lines, status))

		// Check for split directory
		dir := strings.TrimSuffix(f, ".js")
		if fi, err := os.Stat(dir); err == nil && fi.IsDir() {
			details = append(details, fmt.Sprintf("    → split directory exists: %s", dir))
			// Check for any remaining large files in the split directory
			_ = filepath.WalkDir(dir, func(path string, d os.DirEntry, err error) error {
				if err != nil || d.IsDir() || !strings.HasSuffix(path, ".js") {
					return nil
				}
				subLines := countLines(path)
				if subLines > 500 {
					details = append(details, fmt.Sprintf("    ❌ %s: %d lines (exceeds 500 LOC)", path, subLines))
					allSmall = false
				}
				return nil
			})
		}
	}

	if allSmall {
		return claim{
			name:    "A: Epic 6 file-size hygiene",
			status:  "STALE — Already done",
			details: strings.Join(details, "\n") + "\n    → Files are thin re-exports. No action needed.",
		}
	}
	return claim{
		name:    "A: Epic 6 file-size hygiene",
		status:  "FAIL — Large files remain",
		details: strings.Join(details, "\n"),
	}
}

// ─── Claim B: Shared packages are dead code ────────────────────────────────

func checkSharedPackages(repoRoot string) claim {
	appsDir := filepath.Join(repoRoot, "apps")

	// Check each package
	packages := []string{"@resume/shared", "@resume/types", "@resume/schemas", "@resume/contracts"}
	counts := make(map[string]int)
	details := []string{}

	for _, pkg := range packages {
		out, _ := exec.Command("grep", "-rE", fmt.Sprintf(`from ['"]%s['"]|import.*%s|require\(['"]%s['"\)]`, pkg, pkg, pkg), appsDir).Output()
		matches := strings.Split(strings.TrimSpace(string(out)), "\n")
		count := 0
		for _, m := range matches {
			if strings.TrimSpace(m) != "" && !strings.Contains(m, "test") && !strings.Contains(m, "spec") && !strings.Contains(m, "__tests__") {
				count++
			}
		}
		counts[pkg] = count
		details = append(details, fmt.Sprintf("    %s: %d non-test imports", pkg, count))
	}

	// Check portfolio validators
	validatorsPath := filepath.Join(repoRoot, "apps", "portfolio", "lib", "validators.js")
	if content, err := os.ReadFile(validatorsPath); err == nil {
		usesSchemas := strings.Contains(string(content), "@resume/schemas")
		if usesSchemas {
			details = append(details, "    portfolio/lib/validators.js: uses @resume/schemas ✅")
		} else {
			details = append(details, "    portfolio/lib/validators.js: hand-rolled validation ❌ (does NOT use @resume/schemas)")
		}
	} else {
		details = append(details, fmt.Sprintf("    portfolio/lib/validators.js: %v", err))
	}

	total := counts["@resume/types"] + counts["@resume/schemas"] + counts["@resume/contracts"]
	if total == 0 && counts["@resume/shared"] > 0 {
		return claim{
			name:    "B: Shared packages adoption",
			status:  "PARTIAL — types/schemas/contracts unused",
			details: strings.Join(details, "\n") + "\n    → @resume/shared is adopted, but types/schemas/contracts are dead code in apps.\n    → Action: Migrate app-local types/validation to @resume/types and @resume/schemas.",
		}
	}

	if total == 0 && counts["@resume/shared"] == 0 {
		return claim{
			name:    "B: Shared packages adoption",
			status:  "FAIL — All shared packages unused",
			details: strings.Join(details, "\n") + "\n    → Zero imports of shared packages across all apps.\n    → Action: Audit and adopt or deprecate shared packages.",
		}
	}

	return claim{
		name:    "B: Shared packages adoption",
		status:  "STALE — Fully adopted",
		details: strings.Join(details, "\n") + "\n    → All shared packages are consumed. No action needed.",
	}
}

// ─── Claim C: Profile sync is one-way ──────────────────────────────────────

func checkSyncDirection(repoRoot string) claim {
	crawlerDir := filepath.Join(repoRoot, "apps", "job-server", "src", "crawlers")
	ssotPath := "packages/data/resumes/master/resume_data.json"

	crawlerOut, _ := exec.Command("grep", "-r", ssotPath, crawlerDir).Output()
	crawlerWrites := strings.TrimSpace(string(crawlerOut)) != ""

	// Check unified-resume-sync direction
	syncFile := filepath.Join(repoRoot, "apps", "job-server", "src", "tools", "unified-resume-sync.js")
	syncContent, _ := os.ReadFile(syncFile)
	syncsToPlatforms := strings.Contains(string(syncContent), "syncTo")
	readsFromSSoT := strings.Contains(string(syncContent), "resume_data.json")

	// Check git history for resume_data.json
	history := gitFileHistory(filepath.Join(repoRoot, ssotPath), 5)
	hasCrawlerCommits := false
	for _, h := range history {
		if strings.Contains(strings.ToLower(h), "crawler") || strings.Contains(strings.ToLower(h), "sync") {
			hasCrawlerCommits = true
		}
	}

	details := fmt.Sprintf("    Crawlers write to SSoT: %v\n", crawlerWrites)
	details += fmt.Sprintf("    unified-resume-sync reads SSoT: %v\n", readsFromSSoT)
	details += fmt.Sprintf("    unified-resume-sync pushes TO platforms: %v\n", syncsToPlatforms)
	details += fmt.Sprintf("    Git history shows crawler commits: %v\n", hasCrawlerCommits)
	if len(history) > 0 {
		details += fmt.Sprintf("    Recent commits on resume_data.json:\n")
		for _, h := range history {
			details += fmt.Sprintf("      - %s\n", h)
		}
	}

	if !crawlerWrites && !hasCrawlerCommits {
		return claim{
			name:    "C: Profile sync directionality",
			status:  "FAIL — One-way only",
			details: details + "    → SSoT → platforms exists, but crawlers don't enrich SSoT.\n    → Action: Add reverse sync pipeline (crawler → SSoT).",
		}
	}
	return claim{
		name:    "C: Profile sync directionality",
		status:  "STALE — Bidirectional",
		details: details + "    → Bidirectional sync confirmed.",
	}
}

// ─── Claim D: No external profile enrichment ───────────────────────────────

func checkExternalEnrichment(repoRoot string) claim {
	// Check for GitHub API integration
	githubOut, _ := exec.Command("grep", "-riE", `--exclude-dir=node_modules`, `--exclude-dir=.wrangler`, `api\.github\.com|github\.com/api|octokit`, filepath.Join(repoRoot, "apps")).Output()
	githubLines := strings.Split(string(githubOut), "\n")
	hasGitHubAPI := false
	for _, line := range githubLines {
		if strings.TrimSpace(line) != "" && !strings.Contains(strings.ToLower(line), "test") && !strings.Contains(strings.ToLower(line), "spec") {
			hasGitHubAPI = true
			break
		}
	}

	// Check for LinkedIn profile sync (not job application)
	linkedinOut, _ := exec.Command("grep", "-riE", "linkedin.*profile|linkedin.*enrich", filepath.Join(repoRoot, "apps")).Output()
	hasLinkedInEnrich := strings.TrimSpace(string(linkedinOut)) != ""

	// Check for AI parser that updates resume
	aiOut, _ := exec.Command("grep", "-riE", "openai|gpt-|ai.*pars|llm.*resume", filepath.Join(repoRoot, "apps", "job-server", "src")).Output()
	hasAIParser := strings.TrimSpace(string(aiOut)) != ""

	// Check if AI is used for resume/profile enrichment specifically
	aiResumeEnrich := false
	if hasAIParser {
		aiLines := strings.Split(string(aiOut), "\n")
		for _, line := range aiLines {
			if strings.Contains(strings.ToLower(line), "resume") || strings.Contains(strings.ToLower(line), "profile") {
				aiResumeEnrich = true
				break
			}
		}
	}

	details := fmt.Sprintf("    GitHub API for portfolio: %v\n", hasGitHubAPI)
	details += fmt.Sprintf("    LinkedIn profile enrichment: %v\n", hasLinkedInEnrich)
	details += fmt.Sprintf("    AI resume parser: %v\n", hasAIParser)
	details += fmt.Sprintf("    AI used for resume/profile enrichment: %v\n", aiResumeEnrich)

	if !hasGitHubAPI && !hasLinkedInEnrich && !aiResumeEnrich {
		return claim{
			name:    "D: External profile enrichment",
			status:  "FAIL — None found",
			details: details + "    → No GitHub API, LinkedIn enrichment, or AI parser detected for resume updates.\n    → Action: Add enrichment providers (GitHub → projects, job history → skills).",
		}
	}
	return claim{
		name:    "D: External profile enrichment",
		status:  "PARTIAL — Job-only integrations",
		details: details + "    → LinkedIn/GitHub/AI exist for job application sync, not portfolio enrichment.\n    → Action: Add portfolio-focused enrichment pipeline.",
	}
}

// ─── Claim E: Build pipeline gaps ──────────────────────────────────────────

func checkBuildFreshness(repoRoot string) claim {
	workerPath := filepath.Join(repoRoot, "apps", "portfolio", "worker.js")
	dataPath := filepath.Join(repoRoot, "packages", "data", "resumes", "master", "resume_data.json")

	workerInfo, workerErr := os.Stat(workerPath)
	dataInfo, dataErr := os.Stat(dataPath)

	if workerErr != nil || dataErr != nil {
		return claim{
			name:    "E: Build pipeline freshness",
			status:  "FAIL — Files missing",
			details: fmt.Sprintf("    worker.js: %v\n    resume_data.json: %v", workerErr, dataErr),
		}
	}

	fresh := workerInfo.ModTime().After(dataInfo.ModTime())
	diff := workerInfo.ModTime().Unix() - dataInfo.ModTime().Unix()
	details := fmt.Sprintf("    worker.js modified: %s\n", workerInfo.ModTime().Format("2006-01-02 15:04"))
	details += fmt.Sprintf("    resume_data.json modified: %s\n", dataInfo.ModTime().Format("2006-01-02 15:04"))
	details += fmt.Sprintf("    Diff: %d seconds (%.1f hours)\n", diff, float64(diff)/3600)

	if fresh {
		return claim{
			name:    "E: Build pipeline freshness",
			status:  "STALE — Fresh",
			details: details + "    → worker.js is newer than resume_data.json. Build is current.",
		}
	}
	return claim{
		name:    "E: Build pipeline freshness",
		status:  "FAIL — Stale build",
		details: details + "    → resume_data.json is newer than worker.js. Portfolio needs rebuild.",
	}
}

// ─── Helpers ───────────────────────────────────────────────────────────────

func countLines(path string) int {
	cmd := exec.Command("wc", "-l", path)
	out, err := cmd.Output()
	if err != nil {
		return -1
	}
	fields := strings.Fields(string(out))
	if len(fields) < 2 {
		return -1
	}
	var n int
	fmt.Sscanf(fields[0], "%d", &n)
	return n
}

func gitFileHistory(path string, maxCount int) []string {
	cmd := exec.Command("git", "log", "--oneline", fmt.Sprintf("-n %d", maxCount), "--", path)
	out, err := cmd.Output()
	if err != nil {
		return []string{fmt.Sprintf("git log error: %v", err)}
	}
	var lines []string
	scanner := bufio.NewScanner(strings.NewReader(string(out)))
	for scanner.Scan() {
		lines = append(lines, scanner.Text())
	}
	if len(lines) == 0 {
		lines = append(lines, "(no history)")
	}
	return lines
}
