package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
)

type affectedSummary struct {
	BaseBranch           string           `json:"base_branch"`
	ChangedFilesCount    int              `json:"changed_files_count"`
	Portfolio            bool             `json:"portfolio"`
	JobDashboard         bool             `json:"job_dashboard"`
	JobServer            bool             `json:"job_server"`
	Data                 bool             `json:"data"`
	Infra                bool             `json:"infra"`
	CLI                  bool             `json:"cli"`
	Shared               bool             `json:"shared"`
	AffectedTargetsCount int              `json:"affected_targets_count"`
	HasBuildChanges      bool             `json:"has_build_changes"`
	Outputs              *affectedOutputs `json:"outputs,omitempty"`
}

type affectedOutputs struct {
	ChangedFiles string `json:"changed_files"`
	AllAffected  string `json:"all_affected"`
	BuildTargets string `json:"build_targets"`
	TestTargets  string `json:"test_targets"`
}

func main() {
	baseBranch := "origin/master"
	if len(os.Args) > 1 {
		baseBranch = os.Args[1]
	}
	outputDir := ".affected"
	if len(os.Args) > 2 {
		outputDir = os.Args[2]
	}

	fmt.Println("=== Affected Target Analysis ===")
	fmt.Printf("Base: %s\n", baseBranch)
	fmt.Println("Head: HEAD")
	fmt.Println()

	if err := os.MkdirAll(outputDir, 0o755); err != nil {
		fmt.Fprintf(os.Stderr, "failed to create output dir: %v\n", err)
		os.Exit(1)
	}

	changedFiles, err := getChangedFiles(baseBranch)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to detect changed files: %v\n", err)
		os.Exit(1)
	}

	if len(changedFiles) == 0 {
		fmt.Println("No changes detected")
		summary := affectedSummary{
			BaseBranch:           baseBranch,
			ChangedFilesCount:    0,
			Portfolio:            false,
			JobDashboard:         false,
			JobServer:            false,
			Data:                 false,
			Infra:                false,
			CLI:                  false,
			Shared:               false,
			AffectedTargetsCount: 0,
			HasBuildChanges:      false,
		}
		mustWriteJSON(filepath.Join(outputDir, "affected_targets.json"), summary)
		mustWriteLines(filepath.Join(outputDir, "changed_files.txt"), []string{})
		mustWriteEnv(filepath.Join(outputDir, "affected.env"), map[string]string{
			"PORTFOLIO_AFFECTED":     "false",
			"JOB_DASHBOARD_AFFECTED": "false",
			"JOB_SERVER_AFFECTED":    "false",
			"DATA_AFFECTED":          "false",
			"INFRA_AFFECTED":         "false",
			"CLI_AFFECTED":           "false",
			"SHARED_AFFECTED":        "false",
			"AFFECTED_COUNT":         "0",
		})
		os.Exit(0)
		mustWriteEnv(filepath.Join(outputDir, "affected.env"), map[string]string{
			"PORTFOLIO_AFFECTED":     "false",
			"JOB_DASHBOARD_AFFECTED": "false",
			"JOB_SERVER_AFFECTED":    "false",
			"DATA_AFFECTED":          "false",
			"INFRA_AFFECTED":         "false",
			"CLI_AFFECTED":           "false",
			"SHARED_AFFECTED":        "false",
			"AFFECTED_COUNT":         "0",
		})
		os.Exit(0)
		os.Exit(0)
	}

	fmt.Println("=== Changed Files ===")
	for i, file := range changedFiles {
		if i >= 20 {
			break
		}
		fmt.Println(file)
	}
	if len(changedFiles) > 20 {
		fmt.Printf("... and %d more\n", len(changedFiles)-20)
	}
	fmt.Println()

	mustWriteLines(filepath.Join(outputDir, "changed_files.txt"), changedFiles)

	buildPattern := regexp.MustCompile(`BUILD(\.bazel)?$`)
	buildChanges := filterMatches(changedFiles, buildPattern)
	if len(buildChanges) > 0 {
		fmt.Println("=== BUILD File Changes (Full Package Rebuild) ===")
		for _, file := range buildChanges {
			fmt.Println(file)
		}
		fmt.Println()
	}

	if _, err := exec.LookPath("bazel"); err != nil {
		fmt.Println("Bazel not found, using path-based analysis")
		affectedTargets := collectPathBasedTargets(changedFiles)

		fmt.Println("=== Affected Targets (Path-based) ===")
		for _, target := range affectedTargets {
			fmt.Println(target)
		}
		mustWriteLines(filepath.Join(outputDir, "affected_targets.txt"), affectedTargets)

		sharedAffected := anyMatch(changedFiles, regexp.MustCompile(`^packages/shared/`))
		summary := affectedSummary{
			BaseBranch:           baseBranch,
			ChangedFilesCount:    len(changedFiles),
			Portfolio:            anyMatch(changedFiles, regexp.MustCompile(`^apps/portfolio/|^packages/data/|^packages/shared/`)),
			JobDashboard:         anyMatch(changedFiles, regexp.MustCompile(`^apps/job-dashboard/|^packages/shared/`)),
			JobServer:            anyMatch(changedFiles, regexp.MustCompile(`^apps/job-server/`)),
			Data:                 anyMatch(changedFiles, regexp.MustCompile(`^packages/data/`)),
			Infra:                anyMatch(changedFiles, regexp.MustCompile(`^infrastructure/`)),
			CLI:                  anyMatch(changedFiles, regexp.MustCompile(`^packages/cli/`)),
			Shared:               sharedAffected,
			AffectedTargetsCount: len(affectedTargets),
			HasBuildChanges:      len(buildChanges) > 0,
		}
		mustWriteJSON(filepath.Join(outputDir, "affected_targets.json"), summary)
		os.Exit(0)
	}

	fmt.Println("=== Running Bazel Query ===")

	allAffectedPath := filepath.Join(outputDir, "all_affected.txt")
	buildTargetsPath := filepath.Join(outputDir, "build_targets.txt")
	testTargetsPath := filepath.Join(outputDir, "test_targets.txt")

	fileSet := strings.Join(changedFiles, " ")
	query := fmt.Sprintf("rdeps(//..., set(%s))", fileSet)
	bazelCmd := exec.Command("bazel", "query", query, "--output=label", "--keep_going")
	bazelOut, err := bazelCmd.Output()
	if err != nil {
		_ = os.WriteFile(allAffectedPath, []byte{}, 0o644)
	} else {
		_ = os.WriteFile(allAffectedPath, bazelOut, 0o644)
	}

	allAffected := readLinesSafe(allAffectedPath)
	buildTargets := make([]string, 0, len(allAffected))
	testTargets := make([]string, 0, len(allAffected))
	for _, t := range allAffected {
		if strings.HasSuffix(t, "_test") {
			testTargets = append(testTargets, t)
		} else {
			buildTargets = append(buildTargets, t)
		}
	}

	mustWriteLines(buildTargetsPath, buildTargets)
	mustWriteLines(testTargetsPath, testTargets)

	fmt.Println()
	fmt.Println("=== Summary ===")
	fmt.Printf("Changed files: %d\n", len(changedFiles))
	fmt.Printf("Affected targets: %d\n", len(allAffected))
	fmt.Printf("Build targets: %d\n", len(buildTargets))
	fmt.Printf("Test targets: %d\n", len(testTargets))
	fmt.Println()
	fmt.Printf("Output saved to: %s/\n", outputDir)

	sharedAffected := anyMatch(changedFiles, regexp.MustCompile(`^packages/shared/`))
	summary := affectedSummary{
		BaseBranch:           baseBranch,
		ChangedFilesCount:    len(changedFiles),
		Portfolio:            anyMatch(changedFiles, regexp.MustCompile(`^apps/portfolio/|^packages/data/|^packages/shared/`)),
		JobDashboard:         anyMatch(changedFiles, regexp.MustCompile(`^apps/job-dashboard/|^packages/shared/`)),
		JobServer:            anyMatch(changedFiles, regexp.MustCompile(`^apps/job-server/`)),
		Data:                 anyMatch(changedFiles, regexp.MustCompile(`^packages/data/`)),
		Infra:                anyMatch(changedFiles, regexp.MustCompile(`^infrastructure/`)),
		CLI:                  anyMatch(changedFiles, regexp.MustCompile(`^packages/cli/`)),
		Shared:               sharedAffected,
		AffectedTargetsCount: len(allAffected),
		HasBuildChanges:      len(buildChanges) > 0,
		Outputs: &affectedOutputs{
			ChangedFiles: filepath.Join(outputDir, "changed_files.txt"),
			AllAffected:  filepath.Join(outputDir, "all_affected.txt"),
			BuildTargets: filepath.Join(outputDir, "build_targets.txt"),
			TestTargets:  filepath.Join(outputDir, "test_targets.txt"),
		},
	}
	mustWriteJSON(filepath.Join(outputDir, "affected_targets.json"), summary)

	// Write dotenv file for GitLab CI
	mustWriteEnv(filepath.Join(outputDir, "affected.env"), map[string]string{
		"PORTFOLIO_AFFECTED":     fmt.Sprintf("%t", summary.Portfolio),
		"JOB_DASHBOARD_AFFECTED": fmt.Sprintf("%t", summary.JobDashboard),
		"JOB_SERVER_AFFECTED":    fmt.Sprintf("%t", summary.JobServer),
		"DATA_AFFECTED":          fmt.Sprintf("%t", summary.Data),
		"INFRA_AFFECTED":         fmt.Sprintf("%t", summary.Infra),
		"CLI_AFFECTED":           fmt.Sprintf("%t", summary.CLI),
		"SHARED_AFFECTED":        fmt.Sprintf("%t", summary.Shared),
		"AFFECTED_COUNT":         fmt.Sprintf("%d", summary.AffectedTargetsCount),
	})

	fmt.Println("Analysis complete")
}

func getChangedFiles(baseBranch string) ([]string, error) {
	cmd1 := exec.Command("git", "diff", "--name-only", baseBranch+"...HEAD")
	out, err := cmd1.Output()
	if err != nil {
		cmd2 := exec.Command("git", "diff", "--name-only", baseBranch, "HEAD")
		out, err = cmd2.Output()
		if err != nil {
			return nil, err
		}
	}
	return normalizeLines(string(out)), nil
}

func normalizeLines(content string) []string {
	parts := strings.Split(strings.ReplaceAll(content, "\r\n", "\n"), "\n")
	res := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			res = append(res, p)
		}
	}
	return res
}

func anyMatch(lines []string, re *regexp.Regexp) bool {
	for _, line := range lines {
		if re.MatchString(line) {
			return true
		}
	}
	return false
}

func filterMatches(lines []string, re *regexp.Regexp) []string {
	res := make([]string, 0)
	for _, line := range lines {
		if re.MatchString(line) {
			res = append(res, line)
		}
	}
	return res
}

func collectPathBasedTargets(changedFiles []string) []string {
	targets := make(map[string]struct{})
	for _, file := range changedFiles {
		switch {
		case strings.HasPrefix(file, "apps/portfolio/"):
			targets["//apps/portfolio:all"] = struct{}{}
		case strings.HasPrefix(file, "apps/job-dashboard/"):
			targets["//apps/job-dashboard:all"] = struct{}{}
		case strings.HasPrefix(file, "apps/job-server/"):
			targets["//apps/job-server:all"] = struct{}{}
		case strings.HasPrefix(file, "packages/data/"):
			targets["//packages/data:all"] = struct{}{}
			targets["//apps/portfolio:all"] = struct{}{}
		case strings.HasPrefix(file, "packages/shared/"):
			targets["//packages/shared:all"] = struct{}{}
			targets["//apps/portfolio:all"] = struct{}{}
			targets["//apps/job-dashboard:all"] = struct{}{}
		case strings.HasPrefix(file, "packages/cli/"):
			targets["//packages/cli:all"] = struct{}{}
		case strings.HasPrefix(file, "tools/"):
			targets["//tools:all"] = struct{}{}
		}
		if file == "package.json" || file == "package-lock.json" {
			targets["//..."] = struct{}{}
		}
	}
	res := make([]string, 0, len(targets))
	for k := range targets {
		res = append(res, k)
	}
	sort.Strings(res)
	return res
}

func mustWriteLines(path string, lines []string) {
	content := ""
	if len(lines) > 0 {
		content = strings.Join(lines, "\n") + "\n"
	}
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		fmt.Fprintf(os.Stderr, "failed to write %s: %v\n", path, err)
		os.Exit(1)
	}
}

func mustWriteJSON(path string, v any) {
	data, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to marshal json: %v\n", err)
		os.Exit(1)
	}
	data = append(data, '\n')
	if err := os.WriteFile(path, data, 0o644); err != nil {
		fmt.Fprintf(os.Stderr, "failed to write %s: %v\n", path, err)
		os.Exit(1)
	}
}

func mustWriteEnv(path string, vars map[string]string) {
	var lines []string
	for key, value := range vars {
		lines = append(lines, fmt.Sprintf("%s=%s", key, value))
	}
	sort.Strings(lines)
	content := strings.Join(lines, "\n") + "\n"
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		fmt.Fprintf(os.Stderr, "failed to write %s: %v\n", path, err)
		os.Exit(1)
	}
}

func readLinesSafe(path string) []string {
	f, err := os.Open(path)
	if err != nil {
		return nil
	}
	defer f.Close()
	lines := make([]string, 0)
	s := bufio.NewScanner(f)
	for s.Scan() {
		line := strings.TrimSpace(s.Text())
		if line != "" {
			lines = append(lines, line)
		}
	}
	return lines
}
