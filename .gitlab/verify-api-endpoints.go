//go:build verify_api_endpoints

package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"slices"
	"strconv"
	"strings"
	"sync"
	"time"
)

const (
	defaultBaseURL  = "https://resume.jclee.me"
	defaultTimeoutS = 30
)

type checkResult struct {
	Name       string `json:"name"`
	Path       string `json:"path"`
	Method     string `json:"method"`
	Expected   string `json:"expected"`
	StatusCode int    `json:"status_code,omitempty"`
	OK         bool   `json:"ok"`
	Message    string `json:"message"`
	URLCount   int    `json:"url_count,omitempty"`
	Error      string `json:"error,omitempty"`
}

type output struct {
	PortfolioURL   string        `json:"portfolio_url"`
	TimeoutSeconds int           `json:"timeout_seconds"`
	NonBlocking    bool          `json:"non_blocking"`
	CheckedAt      string        `json:"checked_at"`
	Checks         []checkResult `json:"checks"`
	Summary        struct {
		Passed int `json:"passed"`
		Total  int `json:"total"`
	} `json:"summary"`
}

func main() {
	baseURL := strings.TrimRight(readStringEnv("PORTFOLIO_URL", defaultBaseURL), "/")
	timeoutSeconds := readIntEnv("TIMEOUT", defaultTimeoutS)
	jsonMode := hasJSONMode()

	client := &http.Client{Timeout: time.Duration(timeoutSeconds) * time.Second}

	results := make([]checkResult, 3)
	var wg sync.WaitGroup
	wg.Add(3)

	go func() {
		defer wg.Done()
		results[0] = checkVitals(client, baseURL)
	}()

	go func() {
		defer wg.Done()
		results[1] = checkRobots(client, baseURL)
	}()

	go func() {
		defer wg.Done()
		results[2] = checkSitemap(client, baseURL)
	}()

	wg.Wait()

	if jsonMode {
		printJSON(baseURL, timeoutSeconds, results)
	} else {
		printText(results)
	}

	// Non-blocking by design: always exit 0 even on partial failures.
	os.Exit(0)
}

func hasJSONMode() bool {
	if slices.Contains(os.Args[1:], "--json") {
		return true
	}

	if v, ok := os.LookupEnv("JSON_OUTPUT"); ok {
		normalized := strings.ToLower(strings.TrimSpace(v))
		return normalized == "1" || normalized == "true" || normalized == "yes"
	}

	return false
}

func checkVitals(client *http.Client, baseURL string) checkResult {
	timestampMS := time.Now().Unix() * 1000
	payload := map[string]any{
		"lcp":       1250,
		"fid":       50,
		"cls":       0.05,
		"url":       "/",
		"timestamp": timestampMS,
	}
	body, _ := json.Marshal(payload)

	req, err := http.NewRequest(http.MethodPost, baseURL+"/api/vitals", bytes.NewReader(body))
	if err != nil {
		return checkResult{
			Name:     "vitals",
			Path:     "/api/vitals",
			Method:   http.MethodPost,
			Expected: "HTTP 200",
			OK:       false,
			Message:  "Vitals Endpoint: request creation failed (non-blocking)",
			Error:    err.Error(),
		}
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return checkResult{
			Name:     "vitals",
			Path:     "/api/vitals",
			Method:   http.MethodPost,
			Expected: "HTTP 200",
			OK:       false,
			Message:  "Vitals Endpoint: Not responding (non-blocking)",
			Error:    err.Error(),
		}
	}
	defer resp.Body.Close()

	ok := resp.StatusCode == http.StatusOK
	if ok {
		return checkResult{
			Name:       "vitals",
			Path:       "/api/vitals",
			Method:     http.MethodPost,
			Expected:   "HTTP 200",
			StatusCode: resp.StatusCode,
			OK:         true,
			Message:    fmt.Sprintf("Vitals Endpoint: HTTP %d", resp.StatusCode),
		}
	}

	return checkResult{
		Name:       "vitals",
		Path:       "/api/vitals",
		Method:     http.MethodPost,
		Expected:   "HTTP 200",
		StatusCode: resp.StatusCode,
		OK:         false,
		Message:    fmt.Sprintf("Vitals Endpoint: HTTP %d (non-blocking)", resp.StatusCode),
	}
}

func checkRobots(client *http.Client, baseURL string) checkResult {
	resp, err := client.Get(baseURL + "/robots.txt")
	if err != nil {
		return checkResult{
			Name:     "robots",
			Path:     "/robots.txt",
			Method:   http.MethodGet,
			Expected: "HTTP 200 + contains user-agent",
			OK:       false,
			Message:  "robots.txt: Missing or invalid (non-blocking)",
			Error:    err.Error(),
		}
	}
	defer resp.Body.Close()

	body, readErr := io.ReadAll(resp.Body)
	if readErr != nil {
		return checkResult{
			Name:       "robots",
			Path:       "/robots.txt",
			Method:     http.MethodGet,
			Expected:   "HTTP 200 + contains user-agent",
			StatusCode: resp.StatusCode,
			OK:         false,
			Message:    "robots.txt: Missing or invalid (non-blocking)",
			Error:      readErr.Error(),
		}
	}

	hasUserAgent := strings.Contains(strings.ToLower(string(body)), "user-agent")
	ok := resp.StatusCode == http.StatusOK && hasUserAgent
	if ok {
		return checkResult{
			Name:       "robots",
			Path:       "/robots.txt",
			Method:     http.MethodGet,
			Expected:   "HTTP 200 + contains user-agent",
			StatusCode: resp.StatusCode,
			OK:         true,
			Message:    "robots.txt: Present and valid",
		}
	}

	return checkResult{
		Name:       "robots",
		Path:       "/robots.txt",
		Method:     http.MethodGet,
		Expected:   "HTTP 200 + contains user-agent",
		StatusCode: resp.StatusCode,
		OK:         false,
		Message:    "robots.txt: Missing or invalid (non-blocking)",
	}
}

func checkSitemap(client *http.Client, baseURL string) checkResult {
	resp, err := client.Get(baseURL + "/sitemap.xml")
	if err != nil {
		return checkResult{
			Name:     "sitemap",
			Path:     "/sitemap.xml",
			Method:   http.MethodGet,
			Expected: "HTTP 200 + contains <urlset>",
			OK:       false,
			Message:  "sitemap.xml: Missing or invalid (non-blocking)",
			Error:    err.Error(),
		}
	}
	defer resp.Body.Close()

	body, readErr := io.ReadAll(resp.Body)
	if readErr != nil {
		return checkResult{
			Name:       "sitemap",
			Path:       "/sitemap.xml",
			Method:     http.MethodGet,
			Expected:   "HTTP 200 + contains <urlset>",
			StatusCode: resp.StatusCode,
			OK:         false,
			Message:    "sitemap.xml: Missing or invalid (non-blocking)",
			Error:      readErr.Error(),
		}
	}

	text := strings.ToLower(string(body))
	hasURLSet := strings.Contains(text, "<urlset")
	urlCount := strings.Count(text, "<url>")
	ok := resp.StatusCode == http.StatusOK && hasURLSet
	if ok {
		return checkResult{
			Name:       "sitemap",
			Path:       "/sitemap.xml",
			Method:     http.MethodGet,
			Expected:   "HTTP 200 + contains <urlset>",
			StatusCode: resp.StatusCode,
			URLCount:   urlCount,
			OK:         true,
			Message:    fmt.Sprintf("sitemap.xml: %d URLs", urlCount),
		}
	}

	return checkResult{
		Name:       "sitemap",
		Path:       "/sitemap.xml",
		Method:     http.MethodGet,
		Expected:   "HTTP 200 + contains <urlset>",
		StatusCode: resp.StatusCode,
		URLCount:   urlCount,
		OK:         false,
		Message:    "sitemap.xml: Missing or invalid (non-blocking)",
	}
}

func printText(results []checkResult) {
	fmt.Println("🔗 Checking API Endpoints...")

	for _, r := range results {
		switch r.Name {
		case "vitals":
			fmt.Println("  Checking Web Vitals Endpoint...")
		case "robots":
			fmt.Println("  Checking robots.txt...")
		case "sitemap":
			fmt.Println("  Checking sitemap.xml...")
		}

		if r.OK {
			fmt.Printf("✅ %s\n", r.Message)
		} else {
			fmt.Printf("⚠️  %s\n", r.Message)
		}
	}

	fmt.Println("✅ API endpoints verification complete")
}

func printJSON(baseURL string, timeoutSeconds int, results []checkResult) {
	out := output{
		PortfolioURL:   baseURL,
		TimeoutSeconds: timeoutSeconds,
		NonBlocking:    true,
		CheckedAt:      time.Now().UTC().Format(time.RFC3339),
		Checks:         results,
	}

	for _, r := range results {
		if r.OK {
			out.Summary.Passed++
		}
	}
	out.Summary.Total = len(results)

	enc := json.NewEncoder(os.Stdout)
	enc.SetIndent("", "  ")
	_ = enc.Encode(out)
}

func readStringEnv(key, fallback string) string {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return fallback
	}
	return v
}

func readIntEnv(key string, fallback int) int {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return fallback
	}

	parsed, err := strconv.Atoi(v)
	if err != nil || parsed <= 0 {
		return fallback
	}

	return parsed
}
