package main

import (
	"bufio"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

var requiredDirs = []string{
	".",
	"apps/portfolio",
	"apps/portfolio/lib",
	"apps/job-server",
	"apps/job-server/src",
	"apps/job-server/platforms",
	"packages/cli",
	"packages/cli/internal",
	"infrastructure",
	"resumes",
	"scripts",
	"tests",
	"docs",
}

var forbiddenTerms = []string{"TODO:", "FIXME:", "HACK:"}

func main() {
	exitCode := 0

	fmt.Println("=== AGENTS.md Compliance Check ===")
	fmt.Println("[-] Checking coverage...")
	for _, dir := range requiredDirs {
		target := filepath.Join(dir, "AGENTS.md")
		if _, err := os.Stat(target); err != nil {
			if os.IsNotExist(err) {
				fmt.Printf("[FAIL] Missing AGENTS.md in %s\n", dir)
				exitCode = 1
				continue
			}
			fmt.Printf("[FAIL] Unable to check %s: %v\n", target, err)
			exitCode = 1
		}
	}

	files, err := collectAgentsFiles(".")
	if err != nil {
		fmt.Printf("[FAIL] Unable to collect AGENTS.md files: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("[-] Checking content standards...")
	parentRe := regexp.MustCompile(`Parent: \[.*AGENTS\.md\]`)
	for _, file := range files {
		lines, readErr := readLines(file)
		if readErr != nil {
			fmt.Printf("[FAIL] %s: Unable to read file: %v\n", file, readErr)
			continue
		}

		firstLine := ""
		if len(lines) > 0 {
			firstLine = lines[0]
		}
		if !strings.HasPrefix(firstLine, "# ") {
			fmt.Printf("[FAIL] %s: Missing H1 title on first line\n", file)
		}

		if !isRootAgents(file) {
			content := strings.Join(lines, "\n")
			if !parentRe.MatchString(content) {
				fmt.Printf("[FAIL] %s: Missing 'Parent' navigation link\n", file)
			}
		}

		content := strings.Join(lines, "\n")
		if !strings.Contains(content, "**Generated:**") {
			fmt.Printf("[FAIL] %s: Missing '**Generated:**' metadata\n", file)
		}
	}

	fmt.Println("[-] Checking for forbidden terms...")
	for _, file := range files {
		contentBytes, readErr := os.ReadFile(file)
		if readErr != nil {
			fmt.Printf("[WARN] %s: Unable to read file for forbidden term checks: %v\n", file, readErr)
			continue
		}
		content := string(contentBytes)
		for _, term := range forbiddenTerms {
			if strings.Contains(content, term) {
				fmt.Printf("[WARN] %s contains '%s' (Anti-pattern)\n", file, term)
			}
		}
	}

	if exitCode == 0 {
		fmt.Println("[PASS] AGENTS.md compliance check passed.")
	} else {
		fmt.Println("[FAIL] AGENTS.md compliance check failed.")
	}

	os.Exit(exitCode)
}

func collectAgentsFiles(root string) ([]string, error) {
	files := make([]string, 0, 32)
	err := filepath.WalkDir(root, func(path string, d fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if d.IsDir() && d.Name() == "node_modules" {
			return filepath.SkipDir
		}
		if d.IsDir() {
			return nil
		}
		if d.Name() == "AGENTS.md" {
			files = append(files, filepath.Clean(path))
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return files, nil
}

func isRootAgents(path string) bool {
	clean := filepath.Clean(path)
	return clean == "AGENTS.md" || clean == "."
}

func readLines(path string) ([]string, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	lines := make([]string, 0, 128)
	s := bufio.NewScanner(f)
	for s.Scan() {
		lines = append(lines, s.Text())
	}
	if err := s.Err(); err != nil {
		return nil, err
	}
	return lines, nil
}
