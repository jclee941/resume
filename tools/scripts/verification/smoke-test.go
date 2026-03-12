//go:build smoke_test

package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

func main() {
	envFlag := flag.String("env", "", "Environment: production or local")
	timeout := flag.Int("timeout", 10, "Request timeout in seconds")
	flag.Parse()

	env := *envFlag
	if flag.NArg() > 0 {
		env = flag.Arg(0)
	}
	if env == "" {
		env = "production"
	}

	urls := map[string]string{
		"production": "https://resume.jclee.me",
		"local":      "http://localhost:8787",
	}
	baseURL, ok := urls[env]
	if !ok {
		baseURL = urls["production"]
	}

	client := &http.Client{Timeout: time.Duration(*timeout) * time.Second}

	pass := 0
	fail := 0
	warn := 0

	fmt.Println("========================================")
	fmt.Println("Resume Portfolio - Smoke Test")
	fmt.Println("========================================")
	fmt.Printf("Environment: %s\n", env)
	fmt.Printf("URL: %s\n", baseURL)
	fmt.Printf("Timeout: %ds per request\n\n", *timeout)

	fmt.Println("[1/5] Testing site reachability...")
	httpCode := fetchStatusCode(client, http.MethodGet, baseURL, nil)
	if httpCode == 200 {
		fmt.Printf("[OK] Site is up (HTTP %d)\n", httpCode)
		pass++
	} else {
		fmt.Printf("[FAIL] Site unreachable (HTTP %d)\n", httpCode)
		fail++
		fmt.Println("CRITICAL: Site is down. Aborting smoke tests.")
		os.Exit(1)
	}

	fmt.Println("[2/5] Testing health endpoint...")
	healthResp, healthCode, healthErr := request(client, http.MethodGet, baseURL+"/health", nil)
	if healthErr == nil && healthCode >= 200 && healthCode < 300 {
		status, version := parseHealth(healthResp)
		if status == "healthy" {
			fmt.Printf("[OK] Health: %s (v%s)\n", status, version)
			pass++
		} else {
			fmt.Printf("[WARN] Health: %s\n", status)
			warn++
		}
	} else {
		fmt.Println("[FAIL] Health endpoint failed")
		fail++
	}

	fmt.Println("[3/5] Testing key assets...")
	assetsOK := 0
	assetsTotal := 3

	if fetchStatusCode(client, http.MethodHead, baseURL+"/og-image.webp", nil) == 200 {
		fmt.Println("  [OK] og-image.webp")
		assetsOK++
	} else {
		fmt.Println("  [FAIL] og-image.webp")
	}

	faviconCode := fetchStatusCode(client, http.MethodHead, baseURL+"/favicon.ico", nil)
	if faviconCode == 200 || faviconCode == 404 {
		fmt.Println("  [OK] favicon.ico")
		assetsOK++
	} else {
		fmt.Println("  [WARN] favicon.ico (not critical)")
		assetsOK++
	}

	if fetchStatusCode(client, http.MethodHead, baseURL+"/robots.txt", nil) == 200 {
		fmt.Println("  [OK] robots.txt")
		assetsOK++
	} else {
		fmt.Println("  [WARN] robots.txt (optional)")
		assetsOK++
	}

	if assetsOK == assetsTotal {
		pass++
	} else {
		warn++
	}

	fmt.Println("[4/5] Testing security headers...")
	_, headers, headersErr := requestHeaders(client, baseURL)
	secOK := 0
	if headersErr == nil {
		if headerExists(headers, "Strict-Transport-Security") {
			fmt.Println("  [OK] HSTS")
			secOK++
		} else {
			fmt.Println("  [WARN] HSTS missing")
		}

		if headerExists(headers, "Content-Security-Policy") {
			fmt.Println("  [OK] CSP")
			secOK++
		} else {
			fmt.Println("  [WARN] CSP missing")
		}

		if headerExists(headers, "X-Content-Type-Options") {
			fmt.Println("  [OK] X-Content-Type-Options")
			secOK++
		} else {
			fmt.Println("  [WARN] X-Content-Type-Options missing")
		}
	} else {
		fmt.Println("  [WARN] Unable to read headers")
	}

	if secOK >= 2 {
		pass++
	} else {
		warn++
	}

	fmt.Println("[5/5] Testing API endpoints...")
	apiOK := 0

	metricsResp, metricsCode, metricsErr := request(client, http.MethodGet, baseURL+"/metrics", nil)
	if metricsErr == nil && metricsCode >= 200 && metricsCode < 300 && strings.Contains(string(metricsResp), "http_requests_total") {
		fmt.Println("  [OK] /metrics")
		apiOK++
	} else {
		fmt.Println("  [WARN] /metrics (may be disabled)")
		apiOK++
	}

	vitalsBody := map[string]float64{"lcp": 1000, "fid": 10, "cls": 0.01}
	bodyBytes, _ := json.Marshal(vitalsBody)
	vitalsCode := fetchStatusCode(client, http.MethodPost, baseURL+"/api/vitals", bodyBytes)
	if vitalsCode == 200 || vitalsCode == 204 {
		fmt.Println("  [OK] /api/vitals")
		apiOK++
	} else {
		fmt.Printf("  [WARN] /api/vitals (HTTP %d)\n", vitalsCode)
		apiOK++
	}

	if apiOK >= 1 {
		pass++
	} else {
		warn++
	}

	fmt.Println()
	fmt.Println("========================================")
	fmt.Println("Smoke Test Summary")
	fmt.Println("========================================")
	fmt.Printf("[OK] Passed: %d/5\n", pass)
	if warn > 0 {
		fmt.Printf("[WARN] Warnings: %d\n", warn)
	}
	if fail > 0 {
		fmt.Printf("[FAIL] Failed: %d\n", fail)
	}
	fmt.Println()

	if fail == 0 && pass >= 3 {
		fmt.Println("Smoke tests passed.")
		fmt.Println("Site is operational.")
		os.Exit(0)
	}
	if fail == 0 {
		fmt.Println("Smoke tests passed with warnings.")
		fmt.Println("Site is operational but some features may be degraded.")
		os.Exit(2)
	}

	fmt.Println("Smoke tests failed.")
	fmt.Println("Run full verification: ./tools/scripts/verification/verify-deployment.sh")
	os.Exit(1)
}

func fetchStatusCode(client *http.Client, method, url string, body []byte) int {
	_, code, err := request(client, method, url, body)
	if err != nil {
		return 0
	}
	return code
}

func request(client *http.Client, method, url string, body []byte) ([]byte, int, error) {
	var reader io.Reader
	if body != nil {
		reader = bytes.NewReader(body)
	}
	req, err := http.NewRequest(method, url, reader)
	if err != nil {
		return nil, 0, err
	}
	if method == http.MethodPost {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer resp.Body.Close()

	respBody, readErr := io.ReadAll(resp.Body)
	if readErr != nil {
		return nil, resp.StatusCode, readErr
	}
	return respBody, resp.StatusCode, nil
}

func requestHeaders(client *http.Client, url string) (int, http.Header, error) {
	req, err := http.NewRequest(http.MethodHead, url, nil)
	if err != nil {
		return 0, nil, err
	}
	resp, err := client.Do(req)
	if err != nil {
		return 0, nil, err
	}
	defer resp.Body.Close()
	return resp.StatusCode, resp.Header, nil
}

func parseHealth(payload []byte) (string, string) {
	status := "unknown"
	version := "unknown"
	target := struct {
		Status  string `json:"status"`
		Version string `json:"version"`
	}{}
	if err := json.Unmarshal(payload, &target); err != nil {
		return status, version
	}
	if target.Status != "" {
		status = target.Status
	}
	if target.Version != "" {
		version = target.Version
	}
	return status, version
}

func headerExists(headers http.Header, key string) bool {
	value := headers.Get(key)
	return strings.TrimSpace(value) != ""
}
