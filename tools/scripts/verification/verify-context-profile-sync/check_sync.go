package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

// ─── Claim C: Profile sync is one-way ──────────────────────────────────────

// The reverse direction is proposal-first by design (context-profile-sync-plan
// Gap 2): crawlers emit proposals, a human reviews them, and sync:proposals
// applies approved ones to the SSoT. Nothing writes resume_data.json directly.
func checkSyncDirection(repoRoot string) claim {
	crawlerDir := filepath.Join(repoRoot, "apps", "job-server", "src", "crawlers")
	crawlerOut, _ := exec.Command("grep", "-rl", "generateProposalsFromCrawlerResult", crawlerDir).Output()
	crawlerProposals := strings.TrimSpace(string(crawlerOut)) != ""

	reviewCLI := fileExists(filepath.Join(repoRoot, "apps", "job-server", "src", "sync", "proposal-review-cli.js"))
	appliesToSSoT := fileContains(filepath.Join(repoRoot, "tools", "scripts", "sync", "apply-proposals.go"), "resume_data.json")
	readsFromSSoT := fileContains(
		filepath.Join(repoRoot, "apps", "job-server", "src", "tools", "unified-resume-sync.js"), "resume_data.json")

	details := fmt.Sprintf("    SSoT → platforms (unified-resume-sync reads SSoT): %v\n", readsFromSSoT)
	details += fmt.Sprintf("    Crawlers emit SSoT proposals: %v\n", crawlerProposals)
	details += fmt.Sprintf("    Proposal review CLI: %v\n", reviewCLI)
	details += fmt.Sprintf("    Approved proposals applied to SSoT (sync:proposals): %v\n", appliesToSSoT)

	if crawlerProposals && reviewCLI && appliesToSSoT {
		return claim{
			name:    "C: Profile sync directionality",
			status:  "STALE — Bidirectional",
			details: details + "    → Crawler data reaches the SSoT through reviewed proposals.",
		}
	}
	return claim{
		name:    "C: Profile sync directionality",
		status:  "FAIL — One-way only",
		details: details + "    → Action: Restore the crawler → proposal → review → apply pipeline.",
	}
}

// ─── Claim D: No external profile enrichment ───────────────────────────────

func checkExternalEnrichment(repoRoot string) claim {
	enrichDir := filepath.Join(repoRoot, "tools", "scripts", "enrichment")
	providers := []struct {
		label string
		ok    bool
	}{
		{"GitHub repositories → project proposals", fileContains(filepath.Join(enrichDir, "github", "main.go"), "api.github.com")},
		{"Application history → skill proposals", fileExists(filepath.Join(enrichDir, "skills", "main.go"))},
		{"LLM analysis → content proposals", fileExists(filepath.Join(enrichDir, "ai", "main.go"))},
	}
	writesProposals := fileContains(filepath.Join(enrichDir, "lib", "common.go"), "func WriteProposal")

	details := ""
	found := 0
	for _, provider := range providers {
		details += fmt.Sprintf("    %s: %v\n", provider.label, provider.ok)
		if provider.ok {
			found++
		}
	}
	details += fmt.Sprintf("    Providers write proposals, never the SSoT: %v\n", writesProposals)

	switch {
	case found == len(providers) && writesProposals:
		return claim{
			name:    "D: External profile enrichment",
			status:  "STALE — Enrichment in place",
			details: details + "    → npm run enrich:all feeds the same reviewed proposal queue.",
		}
	case found > 0:
		return claim{
			name:    "D: External profile enrichment",
			status:  "PARTIAL — Providers missing",
			details: details + "    → Action: Restore the missing enrichment providers under tools/scripts/enrichment.",
		}
	default:
		return claim{
			name:    "D: External profile enrichment",
			status:  "FAIL — None found",
			details: details + "    → Action: Add enrichment providers that emit proposals (GitHub, skills, LLM).",
		}
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
			details: fmt.Sprintf("    worker.js: %v\n    resume_data.json: %v\n    → Action: Run npm run build.", workerErr, dataErr),
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
		details: details + "    → Action: resume_data.json is newer than worker.js; run npm run build.",
	}
}

func fileExists(path string) bool {
	info, err := os.Stat(path)
	return err == nil && !info.IsDir()
}

func fileContains(path, needle string) bool {
	content, err := os.ReadFile(path)
	return err == nil && strings.Contains(string(content), needle)
}
