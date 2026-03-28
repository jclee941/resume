// Resume Portfolio - Enhanced Deployment Verification
// Expanded verification with 15+ checks across 5 categories
//
// Categories:
//   1. Service Health (3 checks)
//   2. Security Headers (4 checks)
//   3. Content Integrity (3 checks)
//   4. Performance Metrics (3 checks)
//   5. API Endpoints (3 checks)
//
// Usage: ./verify-deployment [--quick|--full] [--json]

package main

import (
	"bufio"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"
)

// ANSI color codes
const (
	Red     = "\033[0;31m"
	Green   = "\033[0;32m"
	Yellow  = "\033[1;33m"
	Blue    = "\033[0;34m"
	Cyan    = "\033[0;36m"
	NoColor = "\033[0m"
)

// Configuration
var (
	portfolioURL    = getEnv("PORTFOLIO_URL", "https://resume.jclee.me")
	jobDashboardURL = getEnv("JOB_DASHBOARD_URL", "https://resume.jclee.me/job")
	mode            = "full"
	outputFormat    = "text"
	reportFile      = getEnv("REPORT_FILE", "verification-report.txt")
)

// Counters
var (
	passCount  = 0
	failCount  = 0
	warnCount  = 0
	totalCount = 0
	results    []Result
)

// Result represents a single check result
type Result struct {
	Status   string `json:"status"`
	Category string `json:"category"`
	Check    string `json:"check"`
	Message  string `json:"message"`
}

func main() {
	// Parse flags
	flag.StringVar(&mode, "mode", "full", "Verification mode: quick or full")
	jsonFlag := flag.Bool("json", false, "Output results as JSON")
	flag.Parse()

	if *jsonFlag {
		outputFormat = "json"
	}

	// Handle positional arguments
	if len(flag.Args()) > 0 {
		arg := flag.Args()[0]
		if arg == "--quick" || arg == "quick" {
			mode = "quick"
		} else if arg == "--full" || arg == "full" {
			mode = "full"
		}
	}
	if len(flag.Args()) > 1 {
		arg := flag.Args()[1]
		if arg == "--json" || arg == "json" {
			outputFormat = "json"
		}
	}

	// Header
	if outputFormat == "text" {
		fmt.Printf("%s━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━%s\n", Blue, NoColor)
		fmt.Printf("%sResume Portfolio - Enhanced Deployment Verification v2%s\n", Blue, NoColor)
		fmt.Printf("%s━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━%s\n", Blue, NoColor)
		fmt.Printf("Target: %s%s%s\n", Cyan, portfolioURL, NoColor)
		fmt.Printf("Mode: %s%s%s\n", Cyan, mode, NoColor)
		fmt.Printf("Time: %s%s%s\n", Cyan, time.Now().Format("2006-01-02 15:04:05 MST"), NoColor)
	}

	// Run checks
	checkServiceHealth()
	checkSecurityHeaders()
	checkContentIntegrity()
	checkPerformance()
	checkAPIEndpoints()

	// Summary
	if outputFormat == "text" {
		printSummary()
	} else {
		printJSON()
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func logResult(status, category, check, message string) {
	totalCount++
	results = append(results, Result{status, category, check, message})

	if outputFormat != "text" {
		return
	}

	switch status {
	case "pass":
		passCount++
		fmt.Printf("%s✓%s [%s] %s: %s\n", Green, NoColor, category, check, message)
	case "fail":
		failCount++
		fmt.Printf("%s✗%s [%s] %s: %s\n", Red, NoColor, category, check, message)
	case "warn":
		warnCount++
		fmt.Printf("%s⚠%s [%s] %s: %s\n", Yellow, NoColor, category, check, message)
	}
}

// CATEGORY 1: SERVICE HEALTH
func checkServiceHealth() {
	if outputFormat == "text" {
		fmt.Printf("\n%s━━━ [1/5] Service Health ━━━%s\n", Cyan, NoColor)
	}

	// 1.1 Portfolio Health Endpoint
	resp, err := http.Get(portfolioURL + "/health")
	if err == nil && resp.StatusCode == 200 {
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()

		var health map[string]interface{}
		if err := json.Unmarshal(body, &health); err == nil {
			status, _ := health["status"].(string)
			version, _ := health["version"].(string)
			deployedAt, _ := health["deployed_at"].(string)

			if status == "healthy" {
				logResult("pass", "HEALTH", "Portfolio", fmt.Sprintf("v%s, deployed: %s", version, deployedAt[:min(19, len(deployedAt))]))

				// Check deployment age
				if deployedAt != "" && deployedAt != "unknown" {
					if t, err := time.Parse(time.RFC3339, deployedAt); err == nil {
						ageHours := int(time.Since(t).Hours())
						if ageHours > 168 {
							logResult("warn", "HEALTH", "Deployment Age", fmt.Sprintf("%dh old (>7 days)", ageHours))
						}
					}
				}
			} else {
				logResult("fail", "HEALTH", "Portfolio", fmt.Sprintf("Status: %s (expected: healthy)", status))
			}
		} else {
			logResult("pass", "HEALTH", "Portfolio", "Health endpoint accessible")
		}
	} else {
		if resp != nil {
			resp.Body.Close()
		}
		logResult("fail", "HEALTH", "Portfolio", "Health endpoint unreachable")
	}

	// 1.2 Job Dashboard Health
	resp, err = http.Get(jobDashboardURL + "/api/health")
	if err == nil && resp.StatusCode == 200 {
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()

		var health map[string]interface{}
		if err := json.Unmarshal(body, &health); err == nil {
			status, _ := health["status"].(string)
			version, _ := health["version"].(string)
			dbStatus, _ := health["database"].(string)

			if status == "ok" {
				logResult("pass", "HEALTH", "Job Dashboard", fmt.Sprintf("v%s, DB: %s", version, dbStatus))
			} else {
				logResult("fail", "HEALTH", "Job Dashboard", fmt.Sprintf("Status: %s", status))
			}
		}
	} else {
		if resp != nil {
			resp.Body.Close()
		}
		logResult("warn", "HEALTH", "Job Dashboard", "Health endpoint unreachable (may be optional)")
	}

	// 1.3 HTTP Response Time
	start := time.Now()
	resp, err = http.Get(portfolioURL + "/")
	if err == nil {
		resp.Body.Close()
		responseMs := int(time.Since(start).Milliseconds())

		if responseMs < 500 {
			logResult("pass", "HEALTH", "Response Time", fmt.Sprintf("%dms (<500ms)", responseMs))
		} else if responseMs < 1000 {
			logResult("warn", "HEALTH", "Response Time", fmt.Sprintf("%dms (500-1000ms)", responseMs))
		} else {
			logResult("fail", "HEALTH", "Response Time", fmt.Sprintf("%dms (>1000ms)", responseMs))
		}
	} else {
		logResult("fail", "HEALTH", "Response Time", "Request failed")
	}
}

// CATEGORY 2: SECURITY HEADERS
func checkSecurityHeaders() {
	if outputFormat == "text" {
		fmt.Printf("\n%s━━━ [2/5] Security Headers ━━━%s\n", Cyan, NoColor)
	}

	resp, err := http.Head(portfolioURL + "/")
	if err != nil {
		logResult("fail", "SECURITY", "Headers", "Could not fetch headers")
		return
	}
	defer resp.Body.Close()

	headers := resp.Header

	// 2.1 Content Security Policy
	if csp := headers.Get("Content-Security-Policy"); csp != "" {
		if strings.Contains(csp, "sha256") {
			logResult("pass", "SECURITY", "CSP", "Strict (SHA-256 hashes)")
		} else if strings.Contains(csp, "unsafe-inline") {
			logResult("warn", "SECURITY", "CSP", "Uses unsafe-inline")
		} else {
			logResult("pass", "SECURITY", "CSP", "Present")
		}
	} else {
		logResult("fail", "SECURITY", "CSP", "Missing")
	}

	// 2.2 HSTS
	if hsts := headers.Get("Strict-Transport-Security"); hsts != "" {
		if strings.Contains(hsts, "preload") {
			logResult("pass", "SECURITY", "HSTS", "With preload")
		} else {
			logResult("warn", "SECURITY", "HSTS", "Without preload")
		}
	} else {
		logResult("fail", "SECURITY", "HSTS", "Missing")
	}

	// 2.3 X-Content-Type-Options
	if xcto := headers.Get("X-Content-Type-Options"); strings.Contains(strings.ToLower(xcto), "nosniff") {
		logResult("pass", "SECURITY", "X-Content-Type-Options", "nosniff")
	} else {
		logResult("fail", "SECURITY", "X-Content-Type-Options", "Missing or incorrect")
	}

	// 2.4 X-Frame-Options
	if xfo := headers.Get("X-Frame-Options"); xfo != "" {
		logResult("pass", "SECURITY", "X-Frame-Options", xfo)
	} else {
		logResult("warn", "SECURITY", "X-Frame-Options", "Missing (CSP frame-ancestors may cover)")
	}
}

// CATEGORY 3: CONTENT INTEGRITY
func checkContentIntegrity() {
	if outputFormat == "text" {
		fmt.Printf("\n%s━━━ [3/5] Content Integrity ━━━%s\n", Cyan, NoColor)
	}

	resp, err := http.Get(portfolioURL + "/")
	if err != nil {
		logResult("fail", "CONTENT", "HTML", "Could not fetch page")
		return
	}
	body, _ := io.ReadAll(resp.Body)
	resp.Body.Close()
	html := string(body)

	// 3.1 Page Title
	titleRegex := regexp.MustCompile(`<title>([^<]+)</title>`)
	if matches := titleRegex.FindStringSubmatch(html); len(matches) > 1 {
		title := strings.TrimSpace(matches[1])
		if len(title) > 10 {
			logResult("pass", "CONTENT", "Title", title[:min(50, len(title))]+"...")
		} else {
			logResult("warn", "CONTENT", "Title", "Too short or missing")
		}
	} else {
		logResult("fail", "CONTENT", "Title", "Missing")
	}

	// 3.2 Open Graph Meta Tags
	ogCount := 0
	if strings.Contains(html, `property="og:title"`) {
		ogCount++
	}
	if strings.Contains(html, `property="og:description"`) {
		ogCount++
	}
	if strings.Contains(html, `property="og:image"`) {
		ogCount++
	}
	if strings.Contains(html, `property="og:url"`) {
		ogCount++
	}

	if ogCount >= 4 {
		logResult("pass", "CONTENT", "Open Graph", fmt.Sprintf("%d/4 tags", ogCount))
	} else if ogCount >= 2 {
		logResult("warn", "CONTENT", "Open Graph", fmt.Sprintf("%d/4 tags", ogCount))
	} else {
		logResult("fail", "CONTENT", "Open Graph", fmt.Sprintf("%d/4 tags", ogCount))
	}

	// 3.3 OG Image Accessibility
	resp, err = http.Head(portfolioURL + "/og-image.webp")
	if err == nil && resp.StatusCode == 200 {
		if size := resp.Header.Get("Content-Length"); size != "" {
			if bytes, err := strconv.Atoi(size); err == nil {
				kb := bytes / 1024
				logResult("pass", "CONTENT", "OG Image", fmt.Sprintf("Accessible (%dKB)", kb))
			} else {
				logResult("pass", "CONTENT", "OG Image", "Accessible")
			}
		} else {
			logResult("pass", "CONTENT", "OG Image", "Accessible")
		}
		resp.Body.Close()
	} else {
		if resp != nil {
			resp.Body.Close()
		}
		logResult("fail", "CONTENT", "OG Image", "Not accessible")
	}
}

// CATEGORY 4: PERFORMANCE METRICS
func checkPerformance() {
	if outputFormat == "text" {
		fmt.Printf("\n%s━━━ [4/5] Performance Metrics ━━━%s\n", Cyan, NoColor)
	}

	// 4.1 Prometheus Metrics Endpoint
	resp, err := http.Get(portfolioURL + "/metrics")
	if err == nil && resp.StatusCode == 200 {
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		metrics := string(body)

		metricCount := 0
		if strings.Contains(metrics, "http_requests_total") {
			metricCount++
		}
		if strings.Contains(metrics, "http_response_time") {
			metricCount++
		}
		if strings.Contains(metrics, "vitals_received") {
			metricCount++
		}

		if metricCount >= 2 {
			// Extract request count
			reqTotal := "N/A"
			if match := regexp.MustCompile(`http_requests_total\{[^}]+\}\s+(\d+)`).FindStringSubmatch(metrics); len(match) > 1 {
				reqTotal = match[1]
			}
			logResult("pass", "PERF", "Metrics Endpoint", fmt.Sprintf("%d metrics, %s total requests", metricCount, reqTotal))
		} else {
			logResult("warn", "PERF", "Metrics Endpoint", fmt.Sprintf("Only %d/3 metrics found", metricCount))
		}
	} else {
		if resp != nil {
			resp.Body.Close()
		}
		logResult("fail", "PERF", "Metrics Endpoint", "Not accessible")
	}

	// 4.2 Gzip/Brotli Compression
	req, _ := http.NewRequest("HEAD", portfolioURL+"/", nil)
	req.Header.Set("Accept-Encoding", "gzip, br")
	resp, err = http.DefaultClient.Do(req)
	if err == nil {
		encoding := resp.Header.Get("Content-Encoding")
		resp.Body.Close()

		if strings.Contains(strings.ToLower(encoding), "br") {
			logResult("pass", "PERF", "Compression", "Brotli")
		} else if strings.Contains(strings.ToLower(encoding), "gzip") {
			logResult("pass", "PERF", "Compression", "Gzip")
		} else {
			logResult("warn", "PERF", "Compression", "None detected")
		}
	} else {
		logResult("warn", "PERF", "Compression", "Could not check")
	}

	// 4.3 Cache Headers
	resp, err = http.Head(portfolioURL + "/")
	if err == nil {
		cacheControl := resp.Header.Get("Cache-Control")
		resp.Body.Close()

		if cacheControl != "" && strings.Contains(strings.ToLower(cacheControl), "max-age") {
			logResult("pass", "PERF", "Cache-Control", cacheControl)
		} else {
			logResult("warn", "PERF", "Cache-Control", "Not set")
		}
	} else {
		logResult("warn", "PERF", "Cache-Control", "Could not check")
	}
}

// CATEGORY 5: API ENDPOINTS
func checkAPIEndpoints() {
	if outputFormat == "text" {
		fmt.Printf("\n%s━━━ [5/5] API Endpoints ━━━%s\n", Cyan, NoColor)
	}

	// 5.1 Web Vitals Endpoint
	vitalsData := fmt.Sprintf(`{"lcp":1250,"fid":50,"cls":0.05,"url":"/","timestamp":%d}`, time.Now().UnixMilli())
	resp, err := http.Post(portfolioURL+"/api/vitals", "application/json", strings.NewReader(vitalsData))
	if err == nil {
		statusCode := resp.StatusCode
		resp.Body.Close()

		if statusCode == 200 {
			logResult("pass", "API", "Vitals Endpoint", fmt.Sprintf("HTTP %d", statusCode))
		} else {
			logResult("warn", "API", "Vitals Endpoint", fmt.Sprintf("HTTP %d", statusCode))
		}
	} else {
		logResult("fail", "API", "Vitals Endpoint", "Not responding")
	}

	// 5.2 Robots.txt
	resp, err = http.Get(portfolioURL + "/robots.txt")
	if err == nil && resp.StatusCode == 200 {
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		content := strings.ToLower(string(body))

		if strings.Contains(content, "user-agent") {
			logResult("pass", "API", "robots.txt", "Present and valid")
		} else {
			logResult("warn", "API", "robots.txt", "Missing or invalid")
		}
	} else {
		if resp != nil {
			resp.Body.Close()
		}
		logResult("warn", "API", "robots.txt", "Missing or invalid")
	}

	// 5.3 Sitemap
	resp, err = http.Get(portfolioURL + "/sitemap.xml")
	if err == nil && resp.StatusCode == 200 {
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		content := string(body)

		if strings.Contains(strings.ToLower(content), "<urlset") {
			urlCount := strings.Count(content, "<url>")
			logResult("pass", "API", "sitemap.xml", fmt.Sprintf("%d URLs", urlCount))
		} else {
			logResult("warn", "API", "sitemap.xml", "Missing or invalid")
		}
	} else {
		if resp != nil {
			resp.Body.Close()
		}
		logResult("warn", "API", "sitemap.xml", "Missing or invalid")
	}
}

func printSummary() {
	fmt.Printf("\n%s━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━%s\n", Blue, NoColor)
	fmt.Printf("%sVerification Summary%s\n", Blue, NoColor)
	fmt.Printf("%s━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━%s\n", Blue, NoColor)

	score := 0
	if totalCount > 0 {
		score = passCount * 100 / totalCount
	}

	fmt.Printf("%s✓ Passed:   %d/%d%s\n", Green, passCount, totalCount, NoColor)
	if warnCount > 0 {
		fmt.Printf("%s⚠ Warnings: %d%s\n", Yellow, warnCount, NoColor)
	}
	if failCount > 0 {
		fmt.Printf("%s✗ Failed:   %d/%d%s\n", Red, failCount, totalCount, NoColor)
	}
	fmt.Printf("Score: %s%d%%%s\n", Cyan, score, NoColor)
	fmt.Println()

	// Generate report file for CI artifacts
	file, err := os.Create(reportFile)
	if err == nil {
		defer file.Close()
		writer := bufio.NewWriter(file)
		fmt.Fprintln(writer, "Resume Portfolio Verification Report")
		fmt.Fprintln(writer, "=====================================")
		fmt.Fprintf(writer, "Time: %s\n", time.Now().Format("2006-01-02 15:04:05 MST"))
		fmt.Fprintf(writer, "Target: %s\n", portfolioURL)
		fmt.Fprintln(writer)
		fmt.Fprintln(writer, "Results:")
		fmt.Fprintf(writer, "  Passed:   %d/%d\n", passCount, totalCount)
		fmt.Fprintf(writer, "  Warnings: %d\n", warnCount)
		fmt.Fprintf(writer, "  Failed:   %d/%d\n", failCount, totalCount)
		fmt.Fprintf(writer, "  Score:    %d%%\n", score)
		writer.Flush()
		fmt.Printf("Report saved: %s%s%s\n", Cyan, reportFile, NoColor)
	}

	if failCount == 0 {
		fmt.Printf("%s🎉 All critical checks passed!%s\n", Green, NoColor)
		os.Exit(0)
	} else {
		fmt.Printf("%s⚠ Deployment verification failed%s\n", Red, NoColor)
		os.Exit(1)
	}
}

func printJSON() {
	output := struct {
		Results []Result `json:"results"`
		Summary struct {
			Passed   int `json:"passed"`
			Failed   int `json:"failed"`
			Warnings int `json:"warnings"`
			Total    int `json:"total"`
			Score    int `json:"score"`
		} `json:"summary"`
	}{
		Results: results,
	}
	output.Summary.Passed = passCount
	output.Summary.Failed = failCount
	output.Summary.Warnings = warnCount
	output.Summary.Total = totalCount
	if totalCount > 0 {
		output.Summary.Score = passCount * 100 / totalCount
	}

	encoder := json.NewEncoder(os.Stdout)
	encoder.SetIndent("", "  ")
	encoder.Encode(output)

	if failCount > 0 {
		os.Exit(1)
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
