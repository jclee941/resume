package main

import (
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"
)

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
