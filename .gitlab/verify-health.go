package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"
)

const (
	defaultPortfolioURL = "https://resume.jclee.me"
	defaultTimeoutSec   = 30
	retries             = 5
	baseDelay           = 5 * time.Second
	userAgent           = "Mozilla/5.0 (GitLabCI VerifyDeployment; +https://gitlab.jclee.me)"
)

type HealthResponse struct {
	Status     string `json:"status"`
	Version    string `json:"version"`
	DeployedAt string `json:"deployed_at"`
}

func main() {
	log.SetFlags(0)

	portfolioURL := firstNonEmpty(argOrEmpty(1), strings.TrimSpace(os.Getenv("PORTFOLIO_URL")), defaultPortfolioURL)
	timeoutSec := parseTimeout(firstNonEmpty(argOrEmpty(2), strings.TrimSpace(os.Getenv("VERIFY_TIMEOUT"))))

	log.Printf("event=health_check_start url=%q retries=%d timeout_seconds=%d", portfolioURL, retries, timeoutSec)

	client := &http.Client{}
	healthURL := strings.TrimRight(portfolioURL, "/") + "/health"

	for attempt := 1; attempt <= retries; attempt++ {
		log.Printf("event=health_check_attempt attempt=%d total=%d", attempt, retries)

		h, err := fetchHealth(client, healthURL, timeoutSec)
		if err == nil {
			status := fallback(h.Status, "unknown")
			version := fallback(h.Version, "unknown")
			deployedAt := fallback(h.DeployedAt, "unknown")
			deployedShort := trimTimestamp(deployedAt)

			switch status {
			case "healthy":
				fmt.Printf("✅ Portfolio Health: %s (v%s, deployed: %s)\n", status, version, deployedShort)
				printDeploymentAge(deployedAt)
				os.Exit(0)
			case "degraded":
				fmt.Printf("⚠️  Portfolio Health: degraded (v%s, deployed: %s)\n", version, deployedShort)
				os.Exit(0)
			default:
				log.Printf("event=health_status_unexpected status=%q version=%q deployed_at=%q", status, version, deployedAt)
			}
		} else {
			log.Printf("event=health_check_failed attempt=%d error=%q", attempt, err.Error())
		}

		if attempt < retries {
			delay := backoffDelay(attempt)
			log.Printf("event=health_check_retry_sleep seconds=%d", int(delay.Seconds()))
			time.Sleep(delay)
		}
	}

	fmt.Printf("⚠️  Portfolio Health: Endpoint unreachable after %d attempts (non-blocking)\n", retries)
	os.Exit(0)
}

func fetchHealth(client *http.Client, healthURL string, timeoutSec int) (HealthResponse, error) {
	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(timeoutSec)*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, healthURL, nil)
	if err != nil {
		return HealthResponse{}, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", userAgent)

	started := time.Now()
	resp, err := client.Do(req)
	duration := time.Since(started)
	if err != nil {
		return HealthResponse{}, fmt.Errorf("http get: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return HealthResponse{}, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	if duration > time.Duration(timeoutSec)*time.Second {
		return HealthResponse{}, fmt.Errorf("response exceeded timeout threshold: %s", duration.Round(time.Millisecond))
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return HealthResponse{}, fmt.Errorf("read body: %w", err)
	}

	var h HealthResponse
	if err := json.Unmarshal(body, &h); err != nil {
		return HealthResponse{}, fmt.Errorf("parse json: %w", err)
	}

	return h, nil
}

func printDeploymentAge(deployedAt string) {
	if deployedAt == "unknown" || strings.TrimSpace(deployedAt) == "" {
		return
	}

	t, err := time.Parse(time.RFC3339, deployedAt)
	if err != nil {
		log.Printf("event=deployment_age_parse_failed deployed_at=%q error=%q", deployedAt, err.Error())
		return
	}

	ageHours := int(time.Since(t).Hours())
	if ageHours > 168 {
		fmt.Printf("⚠️  Deployment Age: %dh old (>7 days)\n", ageHours)
		return
	}

	fmt.Printf("✅ Deployment Age: %dh old\n", ageHours)
}

func parseTimeout(raw string) int {
	if raw == "" {
		return defaultTimeoutSec
	}
	v, err := strconv.Atoi(raw)
	if err != nil || v <= 0 {
		return defaultTimeoutSec
	}
	return v
}

func argOrEmpty(index int) string {
	if len(os.Args) > index {
		return strings.TrimSpace(os.Args[index])
	}
	return ""
}

func backoffDelay(attempt int) time.Duration {
	if attempt <= 1 {
		return baseDelay
	}
	return baseDelay * time.Duration(1<<(attempt-1))
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if strings.TrimSpace(v) != "" {
			return strings.TrimSpace(v)
		}
	}
	return ""
}

func fallback(value, def string) string {
	if strings.TrimSpace(value) == "" {
		return def
	}
	return value
}

func trimTimestamp(ts string) string {
	if len(ts) >= 19 {
		return ts[:19]
	}
	if strings.TrimSpace(ts) == "" {
		return "unknown"
	}
	return ts
}
