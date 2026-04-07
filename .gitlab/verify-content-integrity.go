//go:build verify_content_integrity

package main

import (
	"bufio"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"errors"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

const (
	defaultURL = "https://resume.jclee.me"
	defaultUA  = "Mozilla/5.0 (GitLabCI VerifyDeployment; +https://gitlab.jclee.me)"
)

var (
	titlePattern = regexp.MustCompile(`(?is)<title>(.*?)</title>`)
	hashPattern  = regexp.MustCompile(`^[a-fA-F0-9]{64}$`)
)

type config struct {
	url      string
	timeout  int
	ua       string
	filePath string
	expected string
	manifest string
	baseDir  string
}

func main() {
	cfg := parseFlags()

	switch {
	case cfg.manifest != "":
		if err := verifyManifest(cfg.manifest, cfg.baseDir); err != nil {
			fmt.Fprintf(os.Stderr, "❌ Manifest verification failed: %v\n", err)
			os.Exit(1)
		}
		fmt.Println("✅ Manifest verification complete")
		return
	case cfg.filePath != "" || cfg.expected != "":
		if cfg.filePath == "" || cfg.expected == "" {
			fmt.Fprintln(os.Stderr, "❌ both --file and --sha256 are required for single-file verification")
			os.Exit(1)
		}
		ok, actual, err := verifyFileHash(cfg.filePath, cfg.expected)
		if err != nil {
			fmt.Fprintf(os.Stderr, "❌ Hash verification error: %v\n", err)
			os.Exit(1)
		}
		if !ok {
			fmt.Fprintf(os.Stderr, "❌ Hash mismatch for %s\n  expected: %s\n  actual:   %s\n", cfg.filePath, strings.ToLower(cfg.expected), actual)
			os.Exit(1)
		}
		fmt.Printf("✅ Hash verified: %s\n", cfg.filePath)
		return
	default:
		if err := checkContentMarkers(cfg.url, cfg.timeout, cfg.ua); err != nil {
			fmt.Fprintf(os.Stderr, "❌ Content integrity check failed: %v\n", err)
			os.Exit(1)
		}
	}
}

func parseFlags() config {
	var cfg config
	flag.StringVar(&cfg.url, "url", defaultURL, "portfolio URL to validate")
	flag.IntVar(&cfg.timeout, "timeout", 30, "request timeout in seconds")
	flag.StringVar(&cfg.ua, "ua", defaultUA, "user-agent for HTTP checks")
	flag.StringVar(&cfg.filePath, "file", "", "single file to verify")
	flag.StringVar(&cfg.expected, "sha256", "", "expected SHA256 hex for --file")
	flag.StringVar(&cfg.manifest, "manifest", "", "manifest file path (<sha256> <path>)")
	flag.StringVar(&cfg.baseDir, "base-dir", "", "base directory to resolve relative manifest paths")
	flag.Parse()
	return cfg
}

func verifyManifest(manifestPath, baseDir string) error {
	f, err := os.Open(manifestPath)
	if err != nil {
		return fmt.Errorf("open manifest: %w", err)
	}
	defer f.Close()

	if baseDir == "" {
		baseDir = filepath.Dir(manifestPath)
	}

	scanner := bufio.NewScanner(f)
	lineNo := 0
	checked := 0

	for scanner.Scan() {
		lineNo++
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		expected, filePath, err := parseManifestLine(line)
		if err != nil {
			return fmt.Errorf("line %d: %w", lineNo, err)
		}

		resolvedPath := filePath
		if !filepath.IsAbs(resolvedPath) {
			resolvedPath = filepath.Join(baseDir, resolvedPath)
		}

		ok, actual, err := verifyFileHash(resolvedPath, expected)
		if err != nil {
			return fmt.Errorf("line %d (%s): %w", lineNo, filePath, err)
		}
		if !ok {
			return fmt.Errorf("line %d (%s): hash mismatch (expected %s, actual %s)", lineNo, filePath, strings.ToLower(expected), actual)
		}

		checked++
		fmt.Printf("✅ %s\n", filePath)
	}

	if err := scanner.Err(); err != nil {
		return fmt.Errorf("read manifest: %w", err)
	}
	if checked == 0 {
		return errors.New("no verifiable entries found in manifest")
	}

	fmt.Printf("✅ Verified %d file(s) from manifest\n", checked)
	return nil
}

func parseManifestLine(line string) (expectedHash string, filePath string, err error) {
	fields := strings.Fields(line)
	if len(fields) < 2 {
		return "", "", errors.New("invalid format, expected '<sha256> <path>'")
	}

	h := fields[0]
	if !hashPattern.MatchString(h) {
		return "", "", errors.New("invalid SHA256 (must be 64 hex characters)")
	}

	path := strings.TrimSpace(line[len(h):])
	path = strings.TrimLeft(path, " \t")
	path = strings.TrimPrefix(path, "*")
	path = strings.TrimSpace(path)
	if path == "" {
		return "", "", errors.New("missing file path")
	}

	return h, path, nil
}

func verifyFileHash(filePath, expectedHex string) (bool, string, error) {
	expected, err := hex.DecodeString(strings.ToLower(strings.TrimSpace(expectedHex)))
	if err != nil || len(expected) != sha256.Size {
		return false, "", fmt.Errorf("invalid expected SHA256 hex")
	}

	actual, err := streamSHA256(filePath)
	if err != nil {
		return false, "", err
	}

	actualHex := hex.EncodeToString(actual)
	matched := subtle.ConstantTimeCompare(actual, expected) == 1
	return matched, actualHex, nil
}

func streamSHA256(filePath string) ([]byte, error) {
	f, err := os.Open(filePath)
	if err != nil {
		return nil, fmt.Errorf("open file: %w", err)
	}
	defer f.Close()

	h := sha256.New()
	if _, err := io.Copy(h, f); err != nil {
		return nil, fmt.Errorf("hash file stream: %w", err)
	}

	return h.Sum(nil), nil
}

func checkContentMarkers(baseURL string, timeoutSeconds int, userAgent string) error {
	fmt.Println("📄 Checking Content Integrity...")

	client := &http.Client{Timeout: time.Duration(timeoutSeconds) * time.Second}

	html, err := fetchBody(client, strings.TrimRight(baseURL, "/")+"/", userAgent)
	if err != nil {
		return fmt.Errorf("fetch HTML: %w", err)
	}

	fmt.Println("  Checking Page Title...")
	title := extractTitle(html)
	if len(title) > 10 {
		display := title
		if len(display) > 50 {
			display = display[:50] + "..."
		}
		fmt.Printf("✅ Page Title: %s\n", display)
	} else {
		fmt.Println("⚠️  Page Title: Too short or missing (non-blocking)")
	}

	fmt.Println("  Checking Open Graph Meta Tags...")
	ogCount := 0
	for _, marker := range []string{
		`property="og:title"`,
		`property="og:description"`,
		`property="og:image"`,
		`property="og:url"`,
	} {
		if strings.Contains(html, marker) {
			ogCount++
		}
	}

	switch {
	case ogCount >= 4:
		fmt.Printf("✅ Open Graph: %d/4 tags\n", ogCount)
	case ogCount >= 2:
		fmt.Printf("⚠️  Open Graph: %d/4 tags\n", ogCount)
	default:
		fmt.Printf("⚠️  Open Graph: %d/4 tags (non-blocking)\n", ogCount)
	}

	fmt.Println("  Checking OG Image Accessibility...")
	imgURL := strings.TrimRight(baseURL, "/") + "/og-image.webp"
	imgReq, err := http.NewRequest(http.MethodHead, imgURL, nil)
	if err != nil {
		return fmt.Errorf("build OG image request: %w", err)
	}
	imgReq.Header.Set("User-Agent", userAgent)

	resp, err := client.Do(imgReq)
	if err != nil {
		return fmt.Errorf("request OG image: %w", err)
	}
	_ = resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("OG image not accessible (status %d)", resp.StatusCode)
	}

	lengthKB := max(int64(0), resp.ContentLength/1024)
	fmt.Printf("✅ OG Image: Accessible (%dKB)\n", lengthKB)

	fmt.Println("✅ Content integrity verification complete")
	return nil
}

func fetchBody(client *http.Client, url, userAgent string) (string, error) {
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("User-Agent", userAgent)

	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("unexpected status: %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	return string(body), nil
}

func extractTitle(html string) string {
	matches := titlePattern.FindStringSubmatch(html)
	if len(matches) < 2 {
		return ""
	}
	return strings.TrimSpace(matches[1])
}
