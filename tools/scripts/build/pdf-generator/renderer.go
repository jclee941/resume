package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

const (
	margin      = "1.35cm"
	fontSize    = "9pt"
	lineStretch = "1.06"
)

func checkDependencies() bool {
	fmt.Printf("%sChecking dependencies...%s\n", Blue, NoColor)
	if _, err := exec.LookPath("pandoc"); err == nil {
		cmd := exec.Command("pandoc", "--version")
		out, _ := cmd.Output()
		lines := strings.Split(string(out), "\n")
		if len(lines) > 0 {
			fmt.Printf("%s✓ Pandoc installed: %s%s\n", Green, lines[0], NoColor)
		}
		return true
	}
	if _, err := exec.LookPath("docker"); err == nil {
		fmt.Printf("%s⚠ Pandoc not found, will use Docker fallback%s\n", Yellow, NoColor)
		return true
	}
	fmt.Printf("%s✗ Neither Pandoc nor Docker found%s\n", Red, NoColor)
	return false
}

func generatePDFNative(source, output, font string, toc bool) error {
	args := pandocPDFArgs(source, output, font)
	if toc {
		args = append(args, "--toc", "--toc-depth=3", "--number-sections")
	}
	cmd := exec.Command("pandoc", args...)
	cmd.Dir = projectRoot
	cmd.Env = deterministicEnv(source)
	return cmd.Run()
}

func generatePDFDocker(source, output, font string, toc bool) error {
	relSource, _ := filepath.Rel(projectRoot, source)
	relOutput, _ := filepath.Rel(projectRoot, output)
	args := []string{
		"run", "--rm",
		"-e", "FORCE_SOURCE_DATE=1",
		"-e", fmt.Sprintf("SOURCE_DATE_EPOCH=%d", sourceDateEpoch(source)),
		"-v", fmt.Sprintf("%s:/data", projectRoot),
		"-w", "/data",
		"pandoc/latex:latest",
	}
	args = append(args, pandocPDFArgs(relSource, relOutput, font)...)
	if toc {
		args = append(args, "--toc", "--toc-depth=3", "--number-sections")
	}
	cmd := exec.Command("docker", args...)
	cmd.Env = deterministicEnv(source)
	return cmd.Run()
}

func pandocPDFArgs(source, output, font string) []string {
	return []string{
		source,
		"-o", output,
		"--pdf-engine=xelatex",
		"--include-in-header", "tools/scripts/build/resume-style.tex",
		"-V", fmt.Sprintf("mainfont=%s", font),
		"-V", fmt.Sprintf("CJKmainfont=%s", font),
		"-V", fmt.Sprintf("sansfont=%s", font),
		"-V", fmt.Sprintf("monofont=%s", font),
		"-V", fmt.Sprintf("geometry:margin=%s", margin),
		"-V", "papersize=a4",
		"-V", fmt.Sprintf("fontsize=%s", fontSize),
		"-V", fmt.Sprintf("linestretch=%s", lineStretch),
		"-V", "colorlinks:true",
		"-V", "linkcolor:[HTML]{5AA9B8}",
		"-V", "urlcolor:[HTML]{5AA9B8}",
		"--metadata", "author=Jaecheol Lee",
		"--metadata", "lang=ko-KR",
		"--lua-filter", "tools/scripts/build/strip-emoji.lua",
	}
}

func generateSinglePDF(source, output, font string, toc bool) bool {
	sourcePath := filepath.Join(projectRoot, source)
	outputPath := filepath.Join(projectRoot, output)
	if _, err := os.Stat(sourcePath); os.IsNotExist(err) {
		fmt.Fprintf(os.Stderr, "%s✗ Source file not found: %s%s\n", Red, source, NoColor)
		return false
	}
	if err := os.MkdirAll(filepath.Dir(outputPath), 0o755); err != nil {
		fmt.Fprintf(os.Stderr, "%s✗ Failed to create output directory: %v%s\n", Red, err, NoColor)
		return false
	}
	fmt.Printf("  Generating %s... ", filepath.Base(output))
	if _, err := exec.LookPath("pandoc"); err == nil {
		if err := generatePDFNative(sourcePath, outputPath, font, toc); err == nil {
			normalizeGeneratedPDF(outputPath)
			fmt.Printf("%s✓ (%s)%s\n", Green, getFileSize(outputPath), NoColor)
			return true
		}
	}
	if _, err := exec.LookPath("docker"); err == nil {
		if err := generatePDFDocker(sourcePath, outputPath, font, toc); err == nil {
			normalizeGeneratedPDF(outputPath)
			fmt.Printf("%s✓ Docker (%s)%s\n", Green, getFileSize(outputPath), NoColor)
			return true
		}
	}
	fmt.Printf("%s✗ Failed%s\n", Red, NoColor)
	return false
}

func normalizeGeneratedPDF(outputPath string) {
	if err := normalizePdfFile(outputPath); err != nil {
		fmt.Printf("%s⚠ generated but /ID normalize failed: %s%s\n", Yellow, err, NoColor)
	}
}

func getFileSize(path string) string {
	info, err := os.Stat(path)
	if err != nil {
		return "unknown"
	}
	size := info.Size()
	if size < 1024 {
		return fmt.Sprintf("%dB", size)
	}
	if size < 1024*1024 {
		return fmt.Sprintf("%dKB", size/1024)
	}
	return fmt.Sprintf("%.1fMB", float64(size)/(1024*1024))
}
