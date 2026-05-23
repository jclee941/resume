// Package lib provides shared utilities for resume enrichment providers.
package lib

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

// HTTPClient is a retry-aware HTTP client for enrichment providers.
type HTTPClient struct {
	Client     *http.Client
	MaxRetries int
	BaseDelay  time.Duration
	UserAgent  string
}

// NewHTTPClient creates a default HTTP client with retry configuration.
func NewHTTPClient() *HTTPClient {
	return &HTTPClient{
		Client: &http.Client{
			Timeout: 30 * time.Second,
		},
		MaxRetries: 3,
		BaseDelay:  1 * time.Second,
		UserAgent:  "resume-enrichment/1.0",
	}
}

// Get performs a GET request with retry and rate-limit handling.
func (c *HTTPClient) Get(url string, headers map[string]string) (*http.Response, error) {
	return c.doWithRetry("GET", url, nil, headers)
}

// PostJSON performs a POST request with a JSON body and retry handling.
func (c *HTTPClient) PostJSON(url string, body any, headers map[string]string) (*http.Response, error) {
	data, err := json.Marshal(body)
	if err != nil {
		return nil, fmt.Errorf("marshal body: %w", err)
	}
	if headers == nil {
		headers = make(map[string]string)
	}
	headers["Content-Type"] = "application/json"
	return c.doWithRetry("POST", url, data, headers)
}

func (c *HTTPClient) doWithRetry(method, url string, body []byte, headers map[string]string) (*http.Response, error) {
	var lastErr error
	for attempt := 0; attempt <= c.MaxRetries; attempt++ {
		if attempt > 0 {
			delay := c.BaseDelay * time.Duration(1<<attempt)
			Warnf("retry %d/%d after %v: %s %s", attempt, c.MaxRetries, delay, method, url)
			time.Sleep(delay)
		}

		req, err := http.NewRequest(method, url, bytes.NewReader(body))
		if err != nil {
			return nil, fmt.Errorf("create request: %w", err)
		}
		req.Header.Set("User-Agent", c.UserAgent)
		for k, v := range headers {
			req.Header.Set(k, v)
		}

		resp, err := c.Client.Do(req)
		if err != nil {
			lastErr = err
			continue
		}

		if resp.StatusCode == http.StatusTooManyRequests {
			retryAfter := resp.Header.Get("Retry-After")
			resp.Body.Close()
			if retryAfter != "" {
				if sec, err := time.ParseDuration(retryAfter + "s"); err == nil {
					time.Sleep(sec)
					continue
				}
			}
			lastErr = fmt.Errorf("rate limited (429)")
			continue
		}

		if resp.StatusCode >= 500 {
			resp.Body.Close()
			lastErr = fmt.Errorf("server error %d", resp.StatusCode)
			continue
		}

		return resp, nil
	}
	return nil, fmt.Errorf("max retries exceeded: %w", lastErr)
}

// ReadBody reads and closes a response body, returning the bytes.
func ReadBody(resp *http.Response) ([]byte, error) {
	defer resp.Body.Close()
	return io.ReadAll(resp.Body)
}

// DecodeJSON reads a response body and unmarshals it into v.
func DecodeJSON(resp *http.Response, v any) error {
	body, err := ReadBody(resp)
	if err != nil {
		return fmt.Errorf("read body: %w", err)
	}
	if err := json.Unmarshal(body, v); err != nil {
		return fmt.Errorf("decode JSON: %w", err)
	}
	return nil
}

// EnvOrDefault returns the environment variable value or the default.
func EnvOrDefault(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

// MustEnv returns the environment variable value or exits.
func MustEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		Fatalf("required environment variable %s is not set", key)
	}
	return v
}
