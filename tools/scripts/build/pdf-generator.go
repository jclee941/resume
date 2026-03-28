// PDF Generator - Automated resume PDF generation
// Supports multiple resume variants with Docker fallback
//
// Usage:
//   pdf-generator [variant]
//   pdf-generator all          # Generate all variants
//   pdf-generator master       # Generate master resume
//   pdf-generator nextrade     # Generate Nextrade docs

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
	Blue    = "\033[0;34m"
	NoColor = "\033[0m"
)

// Configuration
var (
	scriptDir   string
	projectRoot string
	version     string

	fontNanum   = "NanumGothic"
	fontNoto    = "Noto Serif CJK KR"
	margin      = "2cm"
	fontSize    = "11pt"
	lineStretch = "1.3"
)

// Resume variants: source|output|font
type Variant struct {
	Source string
	Output string
	Font   string
}

var resumeVariants = map[string]Variant{
	"master":    {"resumes/master/resume_master.md", "resumes/master/resume_master_v%s.pdf", fontNanum},
	"final":     {"resumes/master/resume_final.md", "resumes/master/resume_final_v%s.pdf", fontNanum},
	"toss":      {"resumes/companies/toss/toss_commerce_server_developer_platform_resume.md", "resumes/companies/toss/lee_jaecol_toss_v%s.pdf", fontNoto},
	"general":   {"resumes/generated/resume_general.md", "resumes/generated/resume_general.pdf", fontNanum},
	"technical": {"resumes/generated/resume_technical.md", "resumes/generated/resume_technical.pdf", fontNanum},
	"security":  {"resumes/generated/resume_security.md", "resumes/generated/resume_security.pdf", fontNanum},
	"short":     {"resumes/generated/resume_short.md", "resumes/generated/resume_short.pdf", fontNanum},
}

// Doc variants: source|output
type DocVariant struct {
	Source string
	Output string
}

var docVariants = map[string]DocVariant{
	"nextrade_arch": {"resumes/technical/nextrade/ARCHITECTURE_COMPACT.md", "resumes/technical/nextrade/exports/ARCHITECTURE_COMPACT.pdf"},
	"nextrade_dr":   {"resumes/technical/nextrade/DR_PLAN_COMPACT.md", "resumes/technical/nextrade/exports/DR_PLAN_COMPACT.pdf"},
	"nextrade_soc":  {"resumes/technical/nextrade/SOC_RUNBOOK_COMPACT.md", "resumes/technical/nextrade/exports/SOC_RUNBOOK_COMPACT.pdf"},
}

func main() {
	// Initialize paths
	var err error
	scriptDir, err = os.Getwd()
	if err != nil {
		fmt.Fprintf(os.Stderr, "%s✗ Failed to get working directory: %v%s\n", Red, err, NoColor)
		os.Exit(1)
	}
	projectRoot = filepath.Dir(filepath.Dir(scriptDir))

	// Get version from package.json
	version = getVersion()

	if !checkDependencies() {
		os.Exit(1)
	}

	fmt.Println()

	variant := "all"
	if len(os.Args) > 1 {
		variant = os.Args[1]
	}

	if variant == "all" {
		generateAllResumes()
	} else {
		generateVariant(variant)
	}
}

func getVersion() string {
	cmd := exec.Command("node", "-p", "require('./package.json').version")
	cmd.Dir = projectRoot
	out, err := cmd.Output()
	if err != nil {
		return "1.0.0"
	}
	return strings.TrimSpace(string(out))
}

func checkDependencies() bool {
	fmt.Printf("%sChecking dependencies...%s\n", Blue, NoColor)

	// Check for pandoc
	if _, err := exec.LookPath("pandoc"); err == nil {
		cmd := exec.Command("pandoc", "--version")
		out, _ := cmd.Output()
		lines := strings.Split(string(out), "\n")
		if len(lines) > 0 {
			fmt.Printf("%s✓ Pandoc installed: %s%s\n", Green, lines[0], NoColor)
		}
		return true
	}

	// Check for Docker as fallback
	if _, err := exec.LookPath("docker"); err == nil {
		fmt.Printf("%s⚠ Pandoc not found, will use Docker fallback%s\n", Yellow, NoColor)
		return true
	}

	fmt.Printf("%s✗ Neither Pandoc nor Docker found%s\n", Red, NoColor)
	fmt.Println()
	fmt.Println("Install Pandoc:")
	fmt.Println("  sudo yum install pandoc texlive-xetex texlive-collection-fontsrecommended")
	fmt.Println()
	fmt.Println("Or install Docker:")
	fmt.Println("  sudo yum install docker")
	fmt.Println()
	return false
}

func generatePDFNative(source, output, font string) error {
	args := []string{
		source,
		"-o", output,
		"--pdf-engine=xelatex",
		"-V", fmt.Sprintf("mainfont=%s", font),
		"-V", fmt.Sprintf("geometry:margin=%s", margin),
		"-V", fmt.Sprintf("fontsize=%s", fontSize),
		"-V", fmt.Sprintf("linestretch=%s", lineStretch),
		"-V", "colorlinks:true",
		"-V", "linkcolor:blue",
		"-V", "urlcolor:blue",
		"--toc",
		"--toc-depth=3",
		"--number-sections",
		"--metadata", fmt.Sprintf("title=Resume - Jaecheol Lee"),
		"--metadata", fmt.Sprintf("author=Jaecheol Lee"),
	}

	cmd := exec.Command("pandoc", args...)
	cmd.Dir = projectRoot
	return cmd.Run()
}

func generatePDFDocker(source, output, font string) error {
	relSource, _ := filepath.Rel(projectRoot, source)
	relOutput, _ := filepath.Rel(projectRoot, output)

	args := []string{
		"run", "--rm",
		"-v", fmt.Sprintf("%s:/data", projectRoot),
		"-w", "/data",
		"pandoc/latex:latest",
		relSource,
		"-o", relOutput,
		"--pdf-engine=xelatex",
		"-V", fmt.Sprintf("mainfont=%s", font),
		"-V", fmt.Sprintf("geometry:margin=%s", margin),
		"-V", fmt.Sprintf("fontsize=%s", fontSize),
		"-V", fmt.Sprintf("linestretch=%s", lineStretch),
		"--toc",
		"--metadata", fmt.Sprintf("title=Resume - Jaecheol Lee"),
		"--metadata", fmt.Sprintf("author=Jaecheol Lee"),
	}

	cmd := exec.Command("docker", args...)
	return cmd.Run()
}

func generateSinglePDF(source, output, font string) bool {
	sourcePath := filepath.Join(projectRoot, source)
	outputPath := filepath.Join(projectRoot, output)

	if _, err := os.Stat(sourcePath); os.IsNotExist(err) {
		fmt.Fprintf(os.Stderr, "%s✗ Source file not found: %s%s\n", Red, source, NoColor)
		return false
	}

	// Create output directory
	os.MkdirAll(filepath.Dir(outputPath), 0755)

	fmt.Printf("  Generating %s... ", filepath.Base(output))

	// Try native Pandoc first
	if _, err := exec.LookPath("pandoc"); err == nil {
		if err := generatePDFNative(sourcePath, outputPath, font); err == nil {
			size := getFileSize(outputPath)
			fmt.Printf("%s✓ (%s)%s\n", Green, size, NoColor)
			return true
		}
	}

	// Fallback to Docker
	if _, err := exec.LookPath("docker"); err == nil {
		if err := generatePDFDocker(sourcePath, outputPath, font); err == nil {
			size := getFileSize(outputPath)
			fmt.Printf("%s✓ Docker (%s)%s\n", Green, size, NoColor)
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
	} else if size < 1024*1024 {
		return fmt.Sprintf("%dKB", size/1024)
	}
	return fmt.Sprintf("%.1fMB", float64(size)/(1024*1024))
}

func generateAllResumes() {
	fmt.Printf("%s=== Resume PDF Generation ===%s\n", Blue, NoColor)
	fmt.Printf("Version: %s\n", version)
	fmt.Println()

	success := 0
	failed := 0

	// Generate resume variants
	fmt.Println("Resume variants:")
	for _, variant := range resumeVariants {
		source := variant.Source
		output := fmt.Sprintf(variant.Output, version)
		if generateSinglePDF(source, output, variant.Font) {
			success++
		} else {
			failed++
		}
	}

	fmt.Println()

	// Generate documentation variants
	fmt.Println("Technical documentation:")
	for name, variant := range docVariants {
		_ = name
		if generateSinglePDF(variant.Source, variant.Output, fontNanum) {
			success++
		} else {
			failed++
		}
	}

	fmt.Println()
	fmt.Printf("%s✓ Generated: %d%s\n", Green, success, NoColor)
	if failed > 0 {
		fmt.Printf("%s✗ Failed: %d%s\n", Red, failed, NoColor)
	}

	// Copy to apps/portfolio downloads
	downloadsDir := filepath.Join(projectRoot, "apps", "portfolio", "downloads")
	if _, err := os.Stat(downloadsDir); err == nil {
		fmt.Println()
		fmt.Println("Copying to apps/portfolio/downloads/...")
		// Copy PDFs from nextrade/exports/
		exportsDir := filepath.Join(projectRoot, "resumes", "technical", "nextrade", "exports")
		if files, err := os.ReadDir(exportsDir); err == nil {
			for _, file := range files {
				if strings.HasSuffix(file.Name(), ".pdf") {
					src := filepath.Join(exportsDir, file.Name())
					dst := filepath.Join(downloadsDir, file.Name())
					copyFile(src, dst)
				}
			}
		}
		fmt.Printf("%s✓ Web downloads updated%s\n", Green, NoColor)
	}
}

func copyFile(src, dst string) {
	data, err := os.ReadFile(src)
	if err != nil {
		return
	}
	os.WriteFile(dst, data, 0644)
}

func generateVariant(variant string) {
	fmt.Printf("%s=== Generating %s ===%s\n", Blue, variant, NoColor)
	fmt.Println()

	// Check resume variants
	if v, ok := resumeVariants[variant]; ok {
		output := fmt.Sprintf(v.Output, version)
		if generateSinglePDF(v.Source, output, v.Font) {
			os.Exit(0)
		}
		os.Exit(1)
	}

	// Check doc variants
	if v, ok := docVariants[variant]; ok {
		if generateSinglePDF(v.Source, v.Output, fontNanum) {
			os.Exit(0)
		}
		os.Exit(1)
	}

	fmt.Printf("%s✗ Unknown variant: %s%s\n", Red, variant, NoColor)
	fmt.Println()
	fmt.Println("Available variants:")
	fmt.Print("  Resumes: ")
	for name := range resumeVariants {
		fmt.Printf("%s ", name)
	}
	fmt.Println()
	fmt.Print("  Docs: ")
	for name := range docVariants {
		fmt.Printf("%s ", name)
	}
	fmt.Println()
	os.Exit(1)
}
