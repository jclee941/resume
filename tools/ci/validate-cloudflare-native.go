package main

import (
	"bufio"
	"fmt"
	"os"
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

	if !fileExists(filepath.Join(rootDir, "apps/portfolio/wrangler.toml")) {
		fmt.Println("ERROR: missing portfolio wrangler.toml")
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
