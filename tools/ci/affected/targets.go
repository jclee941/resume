package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"regexp"
	"sort"
	"strings"
)

type affectedSummary struct {
	BaseBranch           string           `json:"base_branch"`
	ChangedFilesCount    int              `json:"changed_files_count"`
	Portfolio            bool             `json:"portfolio"`
	JobDashboard         bool             `json:"job_dashboard"`
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
