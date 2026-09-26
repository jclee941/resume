package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
)

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
