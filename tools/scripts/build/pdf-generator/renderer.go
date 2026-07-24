package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
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

func generatePDFNative(source, output, font string, layout PDFLayoutProfile, toc bool) error {
	args := pandocPDFArgsForProfile(source, output, font, layout)
	if toc {
		args = append(args, "--toc", "--toc-depth=3", "--number-sections")
	}
	cmd := exec.Command("pandoc", args...)
	cmd.Dir = projectRoot
	cmd.Env = deterministicEnv(source)
	return cmd.Run()
}

func generatePDFDocker(source, output, font string, layout PDFLayoutProfile, toc bool) error {
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
	args = append(args, pandocPDFArgsForProfile(relSource, relOutput, font, layout)...)
	if toc {
		args = append(args, "--toc", "--toc-depth=3", "--number-sections")
	}
	cmd := exec.Command("docker", args...)
	cmd.Env = deterministicEnv(source)
	return cmd.Run()
}

func pandocPDFArgs(source, output, font string) []string {
	return pandocPDFArgsForProfile(source, output, font, defaultPDFLayout)
}

func pandocPDFArgsForProfile(source, output, font string, layout PDFLayoutProfile) []string {
	args := []string{
		source,
		"-o", output,
		"--pdf-engine=xelatex",
		"--include-in-header", layout.HeaderPath,
	}
	for _, variable := range layout.FontVariables {
		args = append(args, "-V", fmt.Sprintf("%s=%s", variable, font))
	}
	args = append(args,
		"-V", fmt.Sprintf("geometry:margin=%s", layout.Margin),
		"-V", fmt.Sprintf("papersize=%s", layout.PaperSize),
		"-V", fmt.Sprintf("fontsize=%s", layout.FontSize),
		"-V", fmt.Sprintf("linestretch=%s", layout.LineStretch),
		"-V", "colorlinks:true",
		"-V", "linkcolor:[HTML]{5AA9B8}",
		"-V", "urlcolor:[HTML]{5AA9B8}",
		"--metadata", "author=Jaecheol Lee",
		"--metadata", "lang=ko-KR",
		"--lua-filter", "tools/scripts/build/strip-emoji.lua",
	)
	return args
}

type pdfGenerator func(temporaryOutputPath string) error

type pdfNormalizer func(path string) error

func generatePDFAtomically(outputPath string, generator pdfGenerator) error {
	return generatePDFWithNormalizer(outputPath, generator, normalizePdfFile)
}

func generatePDFWithNormalizer(outputPath string, generator pdfGenerator, normalizer pdfNormalizer) error {
	temporaryOutputPattern := "." + strings.TrimSuffix(filepath.Base(outputPath), filepath.Ext(outputPath)) + ".tmp-*" + filepath.Ext(outputPath)
	temporaryFile, err := os.CreateTemp(filepath.Dir(outputPath), temporaryOutputPattern)
	if err != nil {
		return fmt.Errorf("create temporary PDF output: %w", err)
	}
	temporaryOutputPath := temporaryFile.Name()
	defer os.Remove(temporaryOutputPath)
	if err := temporaryFile.Close(); err != nil {
		return fmt.Errorf("close temporary PDF output: %w", err)
	}
	if err := generator(temporaryOutputPath); err != nil {
		return fmt.Errorf("generate temporary PDF: %w", err)
	}
	if err := normalizer(temporaryOutputPath); err != nil {
		return fmt.Errorf("normalize temporary PDF: %w", err)
	}
	if err := os.Rename(temporaryOutputPath, outputPath); err != nil {
		return fmt.Errorf("publish generated PDF: %w", err)
	}
	return nil
}

func generateSinglePDF(source, output, font, layoutName string, toc bool) bool {
	layout, err := layoutProfileByName(layoutName)
	if err != nil {
		fmt.Fprintf(os.Stderr, "%s✗ %s%s\n", Red, err, NoColor)
		return false
	}
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
	fmt.Printf("  Generating %s [%s]... ", filepath.Base(output), layout.Name)
	if _, err := exec.LookPath("pandoc"); err == nil {
		if err := generatePDFAtomically(outputPath, func(temporaryOutputPath string) error {
			return generatePDFNative(sourcePath, temporaryOutputPath, font, layout, toc)
		}); err == nil {
			fmt.Printf("%s✓ (%s)%s\n", Green, getFileSize(outputPath), NoColor)
			return true
		}
	}
	if _, err := exec.LookPath("docker"); err == nil {
		if err := generatePDFAtomically(outputPath, func(temporaryOutputPath string) error {
			return generatePDFDocker(sourcePath, temporaryOutputPath, font, layout, toc)
		}); err == nil {
			fmt.Printf("%s✓ Docker (%s)%s\n", Green, getFileSize(outputPath), NoColor)
			return true
		}
	}
	fmt.Printf("%s✗ Failed%s\n", Red, NoColor)
	return false
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
