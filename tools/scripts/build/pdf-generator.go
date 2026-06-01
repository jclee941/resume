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
	"bytes"
	"crypto/md5"
	"encoding/hex"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
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
	"master":    {"packages/data/resumes/master/resume_master.md", "packages/data/resumes/master/resume_final.pdf", fontNanum},
	"final":     {"packages/data/resumes/master/resume_master.md", "packages/data/resumes/master/resume_final.pdf", fontNanum},
	"toss":      {"packages/data/resumes/applications/toss/toss_devops_engineer_resume.md", "packages/data/resumes/applications/toss/toss_devops_engineer_resume.pdf", fontNoto},
	"general":   {"packages/data/resumes/generated/resume_general.md", "packages/data/resumes/generated/resume_general.pdf", fontNanum},
	"technical": {"packages/data/resumes/generated/resume_technical.md", "packages/data/resumes/generated/resume_technical.pdf", fontNanum},
	"security":  {"packages/data/resumes/generated/resume_security.md", "packages/data/resumes/generated/resume_security.pdf", fontNanum},
	"short":     {"packages/data/resumes/generated/resume_short.md", "packages/data/resumes/generated/resume_short.pdf", fontNanum},
}

// Doc variants: source|output
type DocVariant struct {
	Source string
	Output string
}

var docVariants = map[string]DocVariant{
	"nextrade_arch": {"packages/data/resumes/technical/nextrade/ARCHITECTURE_COMPACT.md", "packages/data/resumes/technical/nextrade/exports/ARCHITECTURE_COMPACT.pdf"},
	"nextrade_dr":   {"packages/data/resumes/technical/nextrade/DR_PLAN_COMPACT.md", "packages/data/resumes/technical/nextrade/exports/DR_PLAN_COMPACT.pdf"},
	"nextrade_soc":  {"packages/data/resumes/technical/nextrade/SOC_RUNBOOK_COMPACT.md", "packages/data/resumes/technical/nextrade/exports/SOC_RUNBOOK_COMPACT.pdf"},
}

func main() {
	// Initialize paths
	var err error
	scriptDir, err = os.Getwd()
	if err != nil {
		fmt.Fprintf(os.Stderr, "%s✗ Failed to get working directory: %v%s\n", Red, err, NoColor)
		os.Exit(1)
	}
	projectRoot, err = findProjectRoot(scriptDir)
	if err != nil {
		fmt.Fprintf(os.Stderr, "%s✗ Failed to find project root: %v%s\n", Red, err, NoColor)
		os.Exit(1)
	}

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

func findProjectRoot(startDir string) (string, error) {
	dir, err := filepath.Abs(startDir)
	if err != nil {
		return "", err
	}

	for {
		packageJSON := filepath.Join(dir, "package.json")
		if _, err := os.Stat(packageJSON); err == nil {
			return dir, nil
		}

		parent := filepath.Dir(dir)
		if parent == dir {
			return "", fmt.Errorf("package.json not found from %s", startDir)
		}
		dir = parent
	}
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

func generatePDFNative(source, output, font string, toc bool) error {
	args := []string{
		source,
		"-o", output,
		"--pdf-engine=xelatex",
		"-V", fmt.Sprintf("mainfont=%s", font),
		"-V", fmt.Sprintf("CJKmainfont=%s", font),
		"-V", fmt.Sprintf("sansfont=%s", font),
		"-V", fmt.Sprintf("monofont=%s", font),
		"-V", fmt.Sprintf("geometry:margin=%s", margin),
		"-V", fmt.Sprintf("fontsize=%s", fontSize),
		"-V", fmt.Sprintf("linestretch=%s", lineStretch),
		"-V", "colorlinks:true",
		"-V", "linkcolor:blue",
		"-V", "urlcolor:blue",
		"--metadata", fmt.Sprintf("title=Resume - Jaecheol Lee"),
		"--metadata", fmt.Sprintf("author=Jaecheol Lee"),
		"--metadata", "lang=ko-KR",
		"--lua-filter", "tools/scripts/build/strip-emoji.lua",
	}
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

	epoch := sourceDateEpoch(source)
	args := []string{
		"run", "--rm",
		"-e", "FORCE_SOURCE_DATE=1",
		"-e", fmt.Sprintf("SOURCE_DATE_EPOCH=%d", epoch),
		"-v", fmt.Sprintf("%s:/data", projectRoot),
		"-w", "/data",
		"pandoc/latex:latest",
		relSource,
		"-o", relOutput,
		"--pdf-engine=xelatex",
		"-V", fmt.Sprintf("mainfont=%s", font),
		"-V", fmt.Sprintf("CJKmainfont=%s", font),
		"-V", fmt.Sprintf("sansfont=%s", font),
		"-V", fmt.Sprintf("monofont=%s", font),
		"-V", fmt.Sprintf("geometry:margin=%s", margin),
		"-V", fmt.Sprintf("fontsize=%s", fontSize),
		"-V", fmt.Sprintf("linestretch=%s", lineStretch),
		"--metadata", fmt.Sprintf("title=Resume - Jaecheol Lee"),
		"--metadata", fmt.Sprintf("author=Jaecheol Lee"),
		"--metadata", "lang=ko-KR",
		"--lua-filter", "tools/scripts/build/strip-emoji.lua",
	}
	if toc {
		args = append(args, "--toc", "--toc-depth=3", "--number-sections")
	}

	cmd := exec.Command("docker", args...)
	cmd.Env = deterministicEnv(source)
	return cmd.Run()
}

func formatOutputPath(output string) string {
	if strings.Contains(output, "%") {
		return fmt.Sprintf(output, version)
	}
	return output
}

// deterministicEnv returns the process environment augmented with
// FORCE_SOURCE_DATE=1 and a stable SOURCE_DATE_EPOCH so pandoc/xelatex emit
// fixed CreationDate/ModDate. The epoch is the source file's last git commit
// time (stable across machines); it falls back to the file mtime, then to a
// fixed constant, so the build never depends on wall-clock time.
func deterministicEnv(source string) []string {
	epoch := sourceDateEpoch(source)
	env := os.Environ()
	env = append(env, "FORCE_SOURCE_DATE=1")
	env = append(env, "SOURCE_DATE_EPOCH="+strconv.FormatInt(epoch, 10))
	return env
}

// sourceDateEpoch resolves a stable Unix timestamp for the source file:
// git commit time first, then file mtime, then a fixed fallback constant.
func sourceDateEpoch(source string) int64 {
	abs := source
	if !filepath.IsAbs(abs) {
		abs = filepath.Join(projectRoot, source)
	}
	cmd := exec.Command("git", "log", "-1", "--format=%ct", "--", abs)
	cmd.Dir = projectRoot
	if out, err := cmd.Output(); err == nil {
		if ts, perr := strconv.ParseInt(strings.TrimSpace(string(out)), 10, 64); perr == nil && ts > 0 {
			return ts
		}
	}
	if info, err := os.Stat(abs); err == nil {
		return info.ModTime().Unix()
	}
	return 1704067200 // 2024-01-01T00:00:00Z fixed fallback
}

// pdfIDPattern matches the PDF trailer /ID array: /ID[<hex><hex>].
// xelatex emits a random pair on every run, which is the sole remaining source
// of non-determinism once FORCE_SOURCE_DATE fixes the timestamps.
var pdfIDPattern = regexp.MustCompile(`/ID\s*\[\s*<[0-9A-Fa-f]+>\s*<[0-9A-Fa-f]+>\s*\]`)

// normalizePdfID rewrites the PDF trailer /ID to a content-derived deterministic
// value so two builds of identical content produce identical bytes. The ID is
// the MD5 of the PDF with that /ID array stripped, so different content still
// yields a different ID (no constant-collision that would mask real changes).
//
// Only the TRAILER /ID is touched: the last /ID match that occurs at or after
// the last `trailer` keyword (or, for cross-reference streams, the last match
// in the file). This avoids corrupting any /ID-looking bytes inside content or
// object streams. Returns the input unchanged when no trailer /ID is present.
func normalizePdfID(pdf []byte) []byte {
	matches := pdfIDPattern.FindAllIndex(pdf, -1)
	if len(matches) == 0 {
		return pdf
	}
	// Prefer a match after the last `trailer` keyword; otherwise (xref-stream
	// PDFs have no `trailer` keyword) fall back to the last match in the file,
	// which is the cross-reference stream's /ID.
	trailerIdx := bytes.LastIndex(pdf, []byte("trailer"))
	loc := matches[len(matches)-1]
	if trailerIdx >= 0 {
		for _, m := range matches {
			if m[0] >= trailerIdx {
				loc = m
				break
			}
		}
	}
	withoutID := make([]byte, 0, len(pdf))
	withoutID = append(withoutID, pdf[:loc[0]]...)
	withoutID = append(withoutID, pdf[loc[1]:]...)
	sum := md5.Sum(withoutID)
	id := strings.ToUpper(hex.EncodeToString(sum[:]))
	replacement := fmt.Sprintf("/ID [<%s><%s>]", id, id)
	out := make([]byte, 0, loc[0]+len(replacement)+(len(pdf)-loc[1]))
	out = append(out, pdf[:loc[0]]...)
	out = append(out, []byte(replacement)...)
	out = append(out, pdf[loc[1]:]...)
	return out
}

// normalizePdfFile reads, normalizes the /ID of, and rewrites a PDF in place.
func normalizePdfFile(path string) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	return os.WriteFile(path, normalizePdfID(data), 0644)
}

func generateSinglePDF(source, output, font string, toc bool) bool {
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
		if err := generatePDFNative(sourcePath, outputPath, font, toc); err == nil {
			if normErr := normalizePdfFile(outputPath); normErr != nil {
				fmt.Printf("%s\u26a0 generated but /ID normalize failed: %s%s\n", Yellow, normErr, NoColor)
			}
			size := getFileSize(outputPath)
			fmt.Printf("%s\u2713 (%s)%s\n", Green, size, NoColor)
			return true
		}
	}

	// Fallback to Docker
	if _, err := exec.LookPath("docker"); err == nil {
		if err := generatePDFDocker(sourcePath, outputPath, font, toc); err == nil {
			if normErr := normalizePdfFile(outputPath); normErr != nil {
				fmt.Printf("%s\u26a0 generated but /ID normalize failed: %s%s\n", Yellow, normErr, NoColor)
			}
			size := getFileSize(outputPath)
			fmt.Printf("%s\u2713 Docker (%s)%s\n", Green, size, NoColor)
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
		output := formatOutputPath(variant.Output)
		if generateSinglePDF(source, output, variant.Font, false) {
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
		if generateSinglePDF(variant.Source, variant.Output, fontNanum, true) {
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
		exportsDir := filepath.Join(projectRoot, "packages", "data", "resumes", "technical", "nextrade", "exports")
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
		output := formatOutputPath(v.Output)
		if generateSinglePDF(v.Source, output, v.Font, false) {
			os.Exit(0)
		}
		os.Exit(1)
	}

	// Check doc variants
	if v, ok := docVariants[variant]; ok {
		if generateSinglePDF(v.Source, v.Output, fontNanum, true) {
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
