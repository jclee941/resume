package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

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
