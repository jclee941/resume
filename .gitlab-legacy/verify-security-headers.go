//go:build verify_security_headers

package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"
)

const (
	defaultPortfolioURL = "https://resume.jclee.me"
	defaultTimeoutSec   = 30
	defaultHSTSMinAge   = 31536000
	defaultUserAgent    = "Mozilla/5.0 (GitLabCI VerifyDeployment; +https://gitlab.jclee.me)"
)

var maxAgePattern = regexp.MustCompile(`(?i)max-age\s*=\s*(\d+)`)

type SecurityHeaders struct {
	StrictTransportSecurity string `json:"strict_transport_security"`
	XContentTypeOptions     string `json:"x_content_type_options"`
	XFrameOptions           string `json:"x_frame_options"`
	ContentSecurityPolicy   string `json:"content_security_policy"`
}

type Expectations struct {
	XContentTypeOptions string
	XFrameOptions       []string
	CSPDirectives       []string
	HSTSMinMaxAge       int
	RequireHSTSPreload  bool
}

type CheckResult struct {
	Name     string `json:"name"`
	Passed   bool   `json:"passed"`
	Critical bool   `json:"critical"`
	Expected string `json:"expected,omitempty"`
	Actual   string `json:"actual,omitempty"`
	Message  string `json:"message"`
}

type Report struct {
	URL            string          `json:"url"`
	Timestamp      string          `json:"timestamp"`
	Passed         bool            `json:"passed"`
	ExitCode       int             `json:"exit_code"`
	MissingHeaders []string        `json:"missing_headers"`
	Headers        SecurityHeaders `json:"headers"`
	Checks         []CheckResult   `json:"checks"`
}

func main() {
	url := firstNonEmpty(argOrEmpty(1), strings.TrimSpace(os.Getenv("PORTFOLIO_URL")), defaultPortfolioURL)
	timeoutSec := parsePositiveInt(firstNonEmpty(argOrEmpty(2), strings.TrimSpace(os.Getenv("VERIFY_TIMEOUT"))), defaultTimeoutSec)
	expect := loadExpectations()

	headers, err := fetchHeaders(url, timeoutSec)
	if err != nil {
		report := Report{
			URL:       url,
			Timestamp: time.Now().UTC().Format(time.RFC3339),
			Passed:    false,
			ExitCode:  1,
			Checks: []CheckResult{
				{
					Name:     "headers_fetch",
					Passed:   false,
					Critical: true,
					Message:  fmt.Sprintf("failed to fetch response headers: %v", err),
				},
			},
		}
		emit(report)
		os.Exit(1)
	}

	report := validateHeaders(url, headers, expect)
	emit(report)
	os.Exit(report.ExitCode)
}

func fetchHeaders(baseURL string, timeoutSec int) (http.Header, error) {
	trimmedURL := strings.TrimRight(strings.TrimSpace(baseURL), "/") + "/"
	client := &http.Client{Timeout: time.Duration(timeoutSec) * time.Second}

	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(timeoutSec)*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodHead, trimmedURL, nil)
	if err != nil {
		return nil, fmt.Errorf("create HEAD request: %w", err)
	}
	req.Header.Set("User-Agent", defaultUserAgent)

	resp, err := client.Do(req)
	if err == nil && resp != nil {
		defer resp.Body.Close()
		return resp.Header.Clone(), nil
	}

	ctxGet, cancelGet := context.WithTimeout(context.Background(), time.Duration(timeoutSec)*time.Second)
	defer cancelGet()

	getReq, getErr := http.NewRequestWithContext(ctxGet, http.MethodGet, trimmedURL, nil)
	if getErr != nil {
		return nil, fmt.Errorf("create GET fallback request: %w", getErr)
	}
	getReq.Header.Set("User-Agent", defaultUserAgent)

	getResp, getErr := client.Do(getReq)
	if getErr != nil {
		if err != nil {
			return nil, errors.Join(err, getErr)
		}
		return nil, getErr
	}
	defer getResp.Body.Close()

	return getResp.Header.Clone(), nil
}

func validateHeaders(url string, raw http.Header, expect Expectations) Report {
	headers := SecurityHeaders{
		StrictTransportSecurity: strings.TrimSpace(raw.Get("Strict-Transport-Security")),
		XContentTypeOptions:     strings.TrimSpace(raw.Get("X-Content-Type-Options")),
		XFrameOptions:           strings.TrimSpace(raw.Get("X-Frame-Options")),
		ContentSecurityPolicy:   strings.TrimSpace(raw.Get("Content-Security-Policy")),
	}

	checks := make([]CheckResult, 0, 8)
	missing := make([]string, 0, 4)

	checks = append(checks, validateHSTS(headers.StrictTransportSecurity, expect, &missing)...)
	checks = append(checks, validateXCTO(headers.XContentTypeOptions, expect, &missing))
	checks = append(checks, validateXFO(headers.XFrameOptions, expect, &missing))
	checks = append(checks, validateCSP(headers.ContentSecurityPolicy, expect, &missing)...)

	passed := true
	for _, c := range checks {
		if c.Critical && !c.Passed {
			passed = false
			break
		}
	}

	exitCode := 0
	if !passed {
		exitCode = 1
	}

	return Report{
		URL:            url,
		Timestamp:      time.Now().UTC().Format(time.RFC3339),
		Passed:         passed,
		ExitCode:       exitCode,
		MissingHeaders: missing,
		Headers:        headers,
		Checks:         checks,
	}
}

func validateHSTS(value string, expect Expectations, missing *[]string) []CheckResult {
	results := make([]CheckResult, 0, 3)
	if value == "" {
		*missing = append(*missing, "Strict-Transport-Security")
		results = append(results, CheckResult{
			Name:     "strict_transport_security_present",
			Passed:   false,
			Critical: true,
			Expected: "header present",
			Message:  "Strict-Transport-Security header is missing",
		})
		return results
	}

	results = append(results, CheckResult{
		Name:     "strict_transport_security_present",
		Passed:   true,
		Critical: true,
		Expected: "header present",
		Actual:   value,
		Message:  "Strict-Transport-Security header is present",
	})

	match := maxAgePattern.FindStringSubmatch(value)
	if len(match) < 2 {
		results = append(results, CheckResult{
			Name:     "hsts_max_age",
			Passed:   false,
			Critical: true,
			Expected: fmt.Sprintf("max-age >= %d", expect.HSTSMinMaxAge),
			Actual:   value,
			Message:  "HSTS max-age directive missing",
		})
	} else {
		maxAge, _ := strconv.Atoi(match[1])
		passed := maxAge >= expect.HSTSMinMaxAge
		results = append(results, CheckResult{
			Name:     "hsts_max_age",
			Passed:   passed,
			Critical: true,
			Expected: fmt.Sprintf("max-age >= %d", expect.HSTSMinMaxAge),
			Actual:   fmt.Sprintf("max-age=%d", maxAge),
			Message:  ternary(passed, "HSTS max-age is acceptable", "HSTS max-age is below minimum"),
		})
	}

	if expect.RequireHSTSPreload {
		passed := containsTokenCI(value, "preload")
		results = append(results, CheckResult{
			Name:     "hsts_preload",
			Passed:   passed,
			Critical: true,
			Expected: "preload",
			Actual:   value,
			Message:  ternary(passed, "HSTS preload flag present", "HSTS preload flag missing"),
		})
	}

	return results
}

func validateXCTO(value string, expect Expectations, missing *[]string) CheckResult {
	if value == "" {
		*missing = append(*missing, "X-Content-Type-Options")
		return CheckResult{
			Name:     "x_content_type_options",
			Passed:   false,
			Critical: true,
			Expected: expect.XContentTypeOptions,
			Message:  "X-Content-Type-Options header is missing",
		}
	}

	passed := strings.EqualFold(strings.TrimSpace(value), strings.TrimSpace(expect.XContentTypeOptions))
	return CheckResult{
		Name:     "x_content_type_options",
		Passed:   passed,
		Critical: true,
		Expected: expect.XContentTypeOptions,
		Actual:   value,
		Message:  ternary(passed, "X-Content-Type-Options value is valid", "X-Content-Type-Options value is invalid"),
	}
}

func validateXFO(value string, expect Expectations, missing *[]string) CheckResult {
	if value == "" {
		*missing = append(*missing, "X-Frame-Options")
		return CheckResult{
			Name:     "x_frame_options",
			Passed:   false,
			Critical: true,
			Expected: strings.Join(expect.XFrameOptions, " OR "),
			Message:  "X-Frame-Options header is missing",
		}
	}

	normalized := strings.ToLower(strings.TrimSpace(value))
	passed := false
	for _, allowed := range expect.XFrameOptions {
		if normalized == strings.ToLower(strings.TrimSpace(allowed)) {
			passed = true
			break
		}
	}

	return CheckResult{
		Name:     "x_frame_options",
		Passed:   passed,
		Critical: true,
		Expected: strings.Join(expect.XFrameOptions, " OR "),
		Actual:   value,
		Message:  ternary(passed, "X-Frame-Options value is valid", "X-Frame-Options value is invalid"),
	}
}

func validateCSP(value string, expect Expectations, missing *[]string) []CheckResult {
	results := make([]CheckResult, 0, 2)
	if value == "" {
		*missing = append(*missing, "Content-Security-Policy")
		results = append(results, CheckResult{
			Name:     "content_security_policy_present",
			Passed:   false,
			Critical: true,
			Expected: "header present",
			Message:  "Content-Security-Policy header is missing",
		})
		return results
	}

	results = append(results, CheckResult{
		Name:     "content_security_policy_present",
		Passed:   true,
		Critical: true,
		Expected: "header present",
		Actual:   value,
		Message:  "Content-Security-Policy header is present",
	})

	missingDirectives := make([]string, 0)
	for _, directive := range expect.CSPDirectives {
		d := strings.TrimSpace(directive)
		if d == "" {
			continue
		}
		if !containsDirective(value, d) {
			missingDirectives = append(missingDirectives, d)
		}
	}

	passed := len(missingDirectives) == 0
	actual := "all expected directives present"
	if !passed {
		actual = "missing: " + strings.Join(missingDirectives, ", ")
	}

	results = append(results, CheckResult{
		Name:     "content_security_policy_directives",
		Passed:   passed,
		Critical: true,
		Expected: strings.Join(expect.CSPDirectives, ", "),
		Actual:   actual,
		Message:  ternary(passed, "CSP critical directives verified", "CSP critical directives missing"),
	})

	return results
}

func loadExpectations() Expectations {
	xcto := firstNonEmpty(strings.TrimSpace(os.Getenv("EXPECTED_X_CONTENT_TYPE_OPTIONS")), "nosniff")
	xfo := splitCSV(firstNonEmpty(strings.TrimSpace(os.Getenv("EXPECTED_X_FRAME_OPTIONS")), "DENY,SAMEORIGIN"))
	if len(xfo) == 0 {
		xfo = []string{"DENY", "SAMEORIGIN"}
	}
	cspDirectives := splitCSV(firstNonEmpty(strings.TrimSpace(os.Getenv("EXPECTED_CSP_DIRECTIVES")), "default-src,script-src,style-src,img-src,font-src,object-src,base-uri,frame-ancestors"))
	hstsMin := parsePositiveInt(strings.TrimSpace(os.Getenv("EXPECTED_HSTS_MIN_MAX_AGE")), defaultHSTSMinAge)
	requirePreload := parseBoolEnv("REQUIRE_HSTS_PRELOAD", false)

	return Expectations{
		XContentTypeOptions: xcto,
		XFrameOptions:       xfo,
		CSPDirectives:       cspDirectives,
		HSTSMinMaxAge:       hstsMin,
		RequireHSTSPreload:  requirePreload,
	}
}

func splitCSV(value string) []string {
	parts := strings.Split(value, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		trimmed := strings.TrimSpace(p)
		if trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return out
}

func emit(report Report) {
	enc := json.NewEncoder(os.Stdout)
	enc.SetIndent("", "  ")
	if err := enc.Encode(report); err != nil {
		fmt.Fprintf(os.Stderr, "failed to encode report: %v\n", err)
	}
}

func parsePositiveInt(raw string, fallback int) int {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return fallback
	}
	v, err := strconv.Atoi(raw)
	if err != nil || v <= 0 {
		return fallback
	}
	return v
}

func parseBoolEnv(name string, fallback bool) bool {
	v := strings.TrimSpace(os.Getenv(name))
	if v == "" {
		return fallback
	}
	parsed, err := strconv.ParseBool(v)
	if err != nil {
		return fallback
	}
	return parsed
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if strings.TrimSpace(v) != "" {
			return strings.TrimSpace(v)
		}
	}
	return ""
}

func containsDirective(csp, directive string) bool {
	for _, part := range strings.Split(csp, ";") {
		p := strings.TrimSpace(strings.ToLower(part))
		target := strings.ToLower(strings.TrimSpace(directive))
		if strings.HasPrefix(p, target+" ") || p == target {
			return true
		}
	}
	return false
}

func containsTokenCI(value, token string) bool {
	for _, field := range strings.Fields(strings.ToLower(value)) {
		if strings.TrimSpace(field) == strings.ToLower(strings.TrimSpace(token)) {
			return true
		}
	}
	return false
}

func argOrEmpty(index int) string {
	if len(os.Args) > index {
		return strings.TrimSpace(os.Args[index])
	}
	return ""
}

func ternary(cond bool, whenTrue, whenFalse string) string {
	if cond {
		return whenTrue
	}
	return whenFalse
}
