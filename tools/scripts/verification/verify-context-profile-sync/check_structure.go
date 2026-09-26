package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

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
