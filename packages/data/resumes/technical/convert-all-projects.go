// Convert All Projects to PDF
// Batch conversion of markdown project files to PDF

package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

// ANSI color codes
const (
	Red     = "\033[0;31m"
	Green   = "\033[0;32m"
	Yellow  = "\033[1;33m"
	NoColor = "\033[0m"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintf(os.Stderr, "%sUsage: %s <directory>%s\n", Red, os.Args[0], NoColor)
		os.Exit(1)
	}

	dir := os.Args[1]

	// Check if directory exists
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		fmt.Fprintf(os.Stderr, "%s✗ Directory not found: %s%s\n", Red, dir, NoColor)
		os.Exit(1)
	}

	fmt.Printf("%s=== Converting Markdown Projects to PDF ===%s\n", Green, NoColor)
	fmt.Printf("Directory: %s\n\n", dir)

	// Find all markdown files
	files, err := filepath.Glob(filepath.Join(dir, "*.md"))
	if err != nil {
		fmt.Fprintf(os.Stderr, "%s✗ Error finding files: %v%s\n", Red, err, NoColor)
		os.Exit(1)
	}

	if len(files) == 0 {
		fmt.Printf("%s⚠ No markdown files found in %s%s\n", Yellow, dir, NoColor)
		os.Exit(0)
	}

	fmt.Printf("Found %d markdown files\n\n", len(files))

	success := 0
	failed := 0

	for _, file := range files {
		base := filepath.Base(file)
		name := strings.TrimSuffix(base, ".md")
		output := filepath.Join(dir, name+".pdf")

		fmt.Printf("Converting %s... ", base)

		// Convert using pandoc
		cmd := exec.Command("pandoc",
			file,
			"-o", output,
			"--pdf-engine=xelatex",
			"-V", "mainfont=Noto Serif CJK KR",
			"-V", "geometry:margin=2cm",
			"-V", "fontsize=11pt",
			"-V", "linestretch=1.3",
		)

		if err := cmd.Run(); err == nil {
			fmt.Printf("%s✓%s\n", Green, NoColor)
			success++
		} else {
			fmt.Printf("%s✗ Failed%s\n", Red, NoColor)
			failed++
		}
	}

	fmt.Println()
	fmt.Printf("%s✓ Converted: %d%s\n", Green, success, NoColor)
	if failed > 0 {
		fmt.Printf("%s✗ Failed: %d%s\n", Red, failed, NoColor)
		os.Exit(1)
	}
}
