package main

import (
	"bufio"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
)

func main() {
	rootDir := detectRootDir()

	fmt.Println("== Cloudflare native structure validation ==")

	if !fileExists(filepath.Join(rootDir, "wrangler.jsonc")) {
		fmt.Println("ERROR: missing root wrangler.jsonc")
		os.Exit(1)
	}

	if !fileExists(filepath.Join(rootDir, "apps/portfolio/wrangler.jsonc")) {
		fmt.Println("ERROR: missing portfolio wrangler.jsonc")
		os.Exit(1)
	}

	if err := validateDeployBuildConfig(rootDir); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
	if err := runProductionBindingValidation(rootDir); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}

	legacyPattern := regexp.MustCompile(`/home/jclee/applications/resume|cd web\b|web/wrangler\.toml|web/worker\.js`)
	legacyTargets := []string{
		filepath.Join(rootDir, ".github/workflows"),
		filepath.Join(rootDir, "tools/scripts"),
		filepath.Join(rootDir, "README.md"),
		filepath.Join(rootDir, "docs/deployment-guide.md"),
		filepath.Join(rootDir, "docs/guides"),
	}
	legacyMatches := grepLike(legacyTargets, legacyPattern)
	if legacyMatches != "" {
		fmt.Println("ERROR: legacy Cloudflare patterns found")
		fmt.Print(legacyMatches)
		os.Exit(1)
	}

	namingDriftPattern := regexp.MustCompile(`\bJOB_DASHBOARD\b|\bJOB_AUTOMATION_DB\b|\bJOB_CACHE\b|\bJOB_RATE_LIMIT\b`)
	namingDriftTargets := []string{
		filepath.Join(rootDir, "README.md"),
		filepath.Join(rootDir, "docs/deployment-guide.md"),
		filepath.Join(rootDir, "apps/job-server/AGENTS.md"),
		filepath.Join(rootDir, "apps/job-dashboard/AGENTS.md"),
		filepath.Join(rootDir, "apps/job-dashboard/README.md"),
	}
	namingDriftMatches := grepLike(namingDriftTargets, namingDriftPattern)
	if namingDriftMatches != "" {
		fmt.Println("ERROR: non-canonical Cloudflare naming aliases found")
		fmt.Println("Use canonical names (e.g., job-dashboard-db, SESSIONS, RATE_LIMIT_KV).")
		fmt.Print(namingDriftMatches)
		os.Exit(1)
	}

	jsoncDocPattern := regexp.MustCompile(`job-automation/workers/wrangler\.jsonc`)
	jsoncDocTargets := []string{
		filepath.Join(rootDir, "README.md"),
		filepath.Join(rootDir, "docs/deployment-guide.md"),
		filepath.Join(rootDir, "docs/guides"),
		filepath.Join(rootDir, "apps/job-dashboard/README.md"),
	}
	jsoncDocMatches := grepLike(jsoncDocTargets, jsoncDocPattern)
	if jsoncDocMatches != "" {
		fmt.Println("ERROR: documentation drift found for job worker config path")
		fmt.Println("Expected active config path: apps/job-dashboard/wrangler.jsonc")
		fmt.Print(jsoncDocMatches)
		os.Exit(1)
	}

	fmt.Println("OK: Cloudflare native structure validated")
}

func runProductionBindingValidation(rootDir string) error {
	script := filepath.Join(rootDir, "tools/ci/validate-cloudflare-bindings.go")
	command := exec.Command("go", "run", script, rootDir)
	output, err := command.CombinedOutput()
	if err != nil {
		return fmt.Errorf("production binding validation failed: %s", strings.TrimSpace(string(output)))
	}
	return nil
}

func validateDeployBuildConfig(rootDir string) error {
	configs := []string{
		"wrangler.jsonc",
		"apps/portfolio/wrangler.jsonc",
	}
	buildBlock := regexp.MustCompile(`(?m)^\s*"build"\s*:\s*\{`)
	buildCommand := regexp.MustCompile(`(?m)^\s*"command"\s*:\s*"npm run build"\s*,?\s*$`)
	buildCWD := regexp.MustCompile(`(?m)^\s*"cwd"\s*:\s*"\."\s*,?\s*$`)
	for _, config := range configs {
		body, err := os.ReadFile(filepath.Join(rootDir, config))
		if err != nil {
			return fmt.Errorf("ERROR: read %s: %w", config, err)
		}
		text := string(body)
		if !buildBlock.MatchString(text) {
			return fmt.Errorf("ERROR: %s missing deploy build block; production deploy must run root `npm run build` so SSoT sync happens before bundling", config)
		}
		if !buildCommand.MatchString(text) {
			return fmt.Errorf("ERROR: %s build.command must be `npm run build`; root build chains sync:data before worker generation", config)
		}
		if !buildCWD.MatchString(text) {
			return fmt.Errorf("ERROR: %s build.cwd must be `.` so deploy builds execute from the repository root", config)
		}
	}
	return nil
}

func detectRootDir() string {
	wd, err := os.Getwd()
	if err == nil {
		if fileExists(filepath.Join(wd, "wrangler.jsonc")) {
			return wd
		}
		cur := wd
		for {
			parent := filepath.Dir(cur)
			if parent == cur {
				break
			}
			if fileExists(filepath.Join(parent, "wrangler.jsonc")) {
				return parent
			}
			cur = parent
		}
	}
	return wd
}

func fileExists(path string) bool {
	info, err := os.Stat(path)
	if err != nil {
		return false
	}
	return !info.IsDir()
}

func grepLike(targets []string, re *regexp.Regexp) string {
	var b strings.Builder
	for _, target := range targets {
		info, err := os.Stat(target)
		if err != nil {
			continue
		}
		if info.IsDir() {
			_ = filepath.WalkDir(target, func(path string, d os.DirEntry, walkErr error) error {
				if walkErr != nil {
					return nil
				}
				if d.IsDir() {
					return nil
				}
				appendMatches(&b, path, re)
				return nil
			})
		} else {
			appendMatches(&b, target, re)
		}
	}
	return b.String()
}

func appendMatches(out *strings.Builder, path string, re *regexp.Regexp) {
	f, err := os.Open(path)
	if err != nil {
		return
	}
	defer f.Close()

	s := bufio.NewScanner(f)
	lineNum := 0
	for s.Scan() {
		lineNum++
		line := s.Text()
		if re.MatchString(line) {
			fmt.Fprintf(out, "%s:%d:%s\n", path, lineNum, line)
		}
	}
}
