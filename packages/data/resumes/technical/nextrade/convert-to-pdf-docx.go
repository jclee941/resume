// Convert Markdown to PDF and DOCX
// Converts markdown files to both PDF and DOCX formats

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
		fmt.Fprintf(os.Stderr, "%sUsage: %s <file.md>%s\n", Red, os.Args[0], NoColor)
		os.Exit(1)
	}

	input := os.Args[1]

	// Check if file exists
	if _, err := os.Stat(input); os.IsNotExist(err) {
		fmt.Fprintf(os.Stderr, "%s✗ File not found: %s%s\n", Red, input, NoColor)
		os.Exit(1)
	}

	// Check if it's a markdown file
	if !strings.HasSuffix(input, ".md") {
		fmt.Fprintf(os.Stderr, "%s✗ Not a markdown file: %s%s\n", Red, input, NoColor)
		os.Exit(1)
	}

	base := strings.TrimSuffix(input, ".md")
	pdfOutput := base + ".pdf"
	docxOutput := base + ".docx"

	fmt.Printf("%s=== Converting %s ===%s\n\n", Green, filepath.Base(input), NoColor)

	// Convert to PDF
	fmt.Printf("Converting to PDF... ")
	cmd := exec.Command("pandoc",
		input,
		"-o", pdfOutput,
		"--pdf-engine=xelatex",
		"-V", "mainfont=Noto Serif CJK KR",
		"-V", "geometry:margin=2cm",
		"-V", "fontsize=11pt",
		"-V", "linestretch=1.3",
	)

	if err := cmd.Run(); err == nil {
		fmt.Printf("%s✓%s %s\n", Green, NoColor, pdfOutput)
	} else {
		fmt.Printf("%s✗ Failed%s\n", Red, NoColor)
		os.Exit(1)
	}

	// Convert to DOCX
	fmt.Printf("Converting to DOCX... ")
	cmd = exec.Command("pandoc",
		input,
		"-o", docxOutput,
	)

	if err := cmd.Run(); err == nil {
		fmt.Printf("%s✓%s %s\n", Green, NoColor, docxOutput)
	} else {
		fmt.Printf("%s✗ Failed%s\n", Red, NoColor)
		os.Exit(1)
	}

	fmt.Println()
	fmt.Printf("%s✓ Conversion complete!%s\n", Green, NoColor)
}
