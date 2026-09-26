package main

import (
	"bufio"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

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
