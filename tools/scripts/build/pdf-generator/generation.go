package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

func generateAllResumes() {
	fmt.Printf("%s=== Resume PDF Generation ===%s\n", Blue, NoColor)
	fmt.Printf("Version: %s\n\n", version)
	success := 0
	failed := 0
	fmt.Println("Resume variants:")
	for _, variant := range resumeVariants {
		if generateSinglePDF(variant.Source, formatOutputPath(variant.Output), variant.Font, false) {
			success++
		} else {
			failed++
		}
	}
	fmt.Println("\nTechnical documentation:")
	for _, variant := range docVariants {
		if generateSinglePDF(variant.Source, variant.Output, fontNanum, true) {
			success++
		} else {
			failed++
		}
	}
	fmt.Printf("\n%s✓ Generated: %d%s\n", Green, success, NoColor)
	if failed > 0 {
		fmt.Printf("%s✗ Failed: %d%s\n", Red, failed, NoColor)
	}
	copyTechnicalDownloads()
}

func copyTechnicalDownloads() {
	downloadsDir := filepath.Join(projectRoot, "apps", "portfolio", "downloads")
	if _, err := os.Stat(downloadsDir); err != nil {
		return
	}
	fmt.Println("\nCopying to apps/portfolio/downloads/...")
	exportsDir := filepath.Join(projectRoot, "packages", "data", "resumes", "technical", "nextrade", "exports")
	files, err := os.ReadDir(exportsDir)
	if err != nil {
		return
	}
	for _, file := range files {
		if strings.HasSuffix(file.Name(), ".pdf") {
			copyFile(filepath.Join(exportsDir, file.Name()), filepath.Join(downloadsDir, file.Name()))
		}
	}
	fmt.Printf("%s✓ Web downloads updated%s\n", Green, NoColor)
}

func copyFile(src, dst string) {
	data, err := os.ReadFile(src)
	if err != nil {
		return
	}
	_ = os.WriteFile(dst, data, 0o644)
}

func generateVariant(variant string) {
	fmt.Printf("%s=== Generating %s ===%s\n\n", Blue, variant, NoColor)
	if resume, ok := resumeVariants[variant]; ok {
		if generateSinglePDF(resume.Source, formatOutputPath(resume.Output), resume.Font, false) {
			return
		}
		os.Exit(1)
	}
	if doc, ok := docVariants[variant]; ok {
		if generateSinglePDF(doc.Source, doc.Output, fontNanum, true) {
			return
		}
		os.Exit(1)
	}
	fmt.Printf("%s✗ Unknown variant: %s%s\n\n", Red, variant, NoColor)
	fmt.Print("Available variants:\n  Resumes: ")
	for name := range resumeVariants {
		fmt.Printf("%s ", name)
	}
	fmt.Print("\n  Docs: ")
	for name := range docVariants {
		fmt.Printf("%s ", name)
	}
	fmt.Println()
	os.Exit(1)
}
