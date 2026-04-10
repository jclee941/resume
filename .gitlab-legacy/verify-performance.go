//go:build verify_performance

package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"math"
	"net/http"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"
)

type Thresholds struct {
	P50 float64 `json:"p50_ms,omitempty"`
	P90 float64 `json:"p90_ms,omitempty"`
	P95 float64 `json:"p95_ms,omitempty"`
	P99 float64 `json:"p99_ms,omitempty"`
}

type Percentiles struct {
	P50 float64 `json:"p50_ms"`
	P90 float64 `json:"p90_ms"`
	P95 float64 `json:"p95_ms"`
	P99 float64 `json:"p99_ms"`
}

type EndpointResult struct {
	Endpoint       string      `json:"endpoint"`
	IterationCount int         `json:"iteration_count"`
	TimeoutSeconds int         `json:"timeout_seconds"`
	SamplesMS      []float64   `json:"samples_ms"`
	Percentiles    Percentiles `json:"percentiles"`
	AverageMS      float64     `json:"average_ms"`
	MinMS          float64     `json:"min_ms"`
	MaxMS          float64     `json:"max_ms"`
	StdDevMS       float64     `json:"stddev_ms"`
	Pass           bool        `json:"pass"`
	Failures       []string    `json:"failures,omitempty"`
}

type Report struct {
	TargetBaseURL string           `json:"target_base_url"`
	GeneratedAt   string           `json:"generated_at"`
	Iterations    int              `json:"iterations"`
	TimeoutSec    int              `json:"timeout_seconds"`
	Thresholds    Thresholds       `json:"thresholds_ms"`
	Results       []EndpointResult `json:"results"`
	OverallPass   bool             `json:"overall_pass"`
}

func envOrDefault(key, def string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return def
}

func parseFloatEnv(key string, def float64) float64 {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return def
	}
	f, err := strconv.ParseFloat(v, 64)
	if err != nil {
		return def
	}
	return f
}

func parsePositionalFallback(baseURL *string, timeoutSec *int, iterations *int) {
	args := flag.Args()
	if len(args) >= 1 && strings.TrimSpace(args[0]) != "" {
		*baseURL = args[0]
	}
	if len(args) >= 2 {
		if v, err := strconv.Atoi(args[1]); err == nil && v > 0 {
			*timeoutSec = v
		}
	}
	if len(args) >= 3 {
		if v, err := strconv.Atoi(args[2]); err == nil && v > 0 {
			*iterations = v
		}
	}
}

func parseEndpoints(raw string) []string {
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		ep := strings.TrimSpace(p)
		if ep == "" {
			continue
		}
		if !strings.HasPrefix(ep, "/") {
			ep = "/" + ep
		}
		out = append(out, ep)
	}
	if len(out) == 0 {
		return []string{"/"}
	}
	return out
}

func percentile(samples []float64, p float64) float64 {
	if len(samples) == 0 {
		return 0
	}
	if p <= 0 {
		return samples[0]
	}
	if p >= 100 {
		return samples[len(samples)-1]
	}
	idx := int(math.Ceil((p/100)*float64(len(samples)))) - 1
	idx = max(0, min(idx, len(samples)-1))
	return samples[idx]
}

func round(v float64) float64 {
	return math.Round(v*1000) / 1000
}

func stats(samples []float64) (avg, minV, maxV, stddev float64) {
	if len(samples) == 0 {
		return 0, 0, 0, 0
	}
	minV, maxV = samples[0], samples[0]
	sum := 0.0
	for _, s := range samples {
		sum += s
		if s < minV {
			minV = s
		}
		if s > maxV {
			maxV = s
		}
	}
	avg = sum / float64(len(samples))
	variance := 0.0
	for _, s := range samples {
		d := s - avg
		variance += d * d
	}
	variance = variance / float64(len(samples))
	stddev = math.Sqrt(variance)
	return round(avg), round(minV), round(maxV), round(stddev)
}

func evaluateThresholds(p Percentiles, t Thresholds) (bool, []string) {
	failures := []string{}
	if t.P50 > 0 && p.P50 > t.P50 {
		failures = append(failures, fmt.Sprintf("p50 %.3fms > %.3fms", p.P50, t.P50))
	}
	if t.P90 > 0 && p.P90 > t.P90 {
		failures = append(failures, fmt.Sprintf("p90 %.3fms > %.3fms", p.P90, t.P90))
	}
	if t.P95 > 0 && p.P95 > t.P95 {
		failures = append(failures, fmt.Sprintf("p95 %.3fms > %.3fms", p.P95, t.P95))
	}
	if t.P99 > 0 && p.P99 > t.P99 {
		failures = append(failures, fmt.Sprintf("p99 %.3fms > %.3fms", p.P99, t.P99))
	}
	return len(failures) == 0, failures
}

func main() {
	defaultURL := envOrDefault("PORTFOLIO_URL", "https://resume.jclee.me")
	defaultTimeout, _ := strconv.Atoi(envOrDefault("VERIFY_TIMEOUT", "30"))
	if defaultTimeout <= 0 {
		defaultTimeout = 30
	}
	defaultIterations, _ := strconv.Atoi(envOrDefault("VERIFY_ITERATIONS", "20"))
	if defaultIterations <= 0 {
		defaultIterations = 20
	}

	baseURL := flag.String("url", defaultURL, "Base URL to test")
	timeoutSec := flag.Int("timeout", defaultTimeout, "Request timeout in seconds")
	iterations := flag.Int("iterations", defaultIterations, "Number of iterations per endpoint")
	endpointsRaw := flag.String("endpoints", envOrDefault("VERIFY_ENDPOINTS", "/,/metrics"), "Comma-separated endpoints")
	p50Threshold := flag.Float64("threshold-p50-ms", parseFloatEnv("VERIFY_P50_THRESHOLD_MS", 0), "P50 threshold in ms (0 disables)")
	p90Threshold := flag.Float64("threshold-p90-ms", parseFloatEnv("VERIFY_P90_THRESHOLD_MS", 0), "P90 threshold in ms (0 disables)")
	p95Threshold := flag.Float64("threshold-p95-ms", parseFloatEnv("VERIFY_P95_THRESHOLD_MS", 0), "P95 threshold in ms (0 disables)")
	p99Threshold := flag.Float64("threshold-p99-ms", parseFloatEnv("VERIFY_P99_THRESHOLD_MS", 0), "P99 threshold in ms (0 disables)")
	flag.Parse()

	parsePositionalFallback(baseURL, timeoutSec, iterations)

	if *iterations <= 0 {
		fmt.Fprintln(os.Stderr, "iterations must be > 0")
		os.Exit(2)
	}
	if *timeoutSec <= 0 {
		fmt.Fprintln(os.Stderr, "timeout must be > 0")
		os.Exit(2)
	}

	t := Thresholds{P50: *p50Threshold, P90: *p90Threshold, P95: *p95Threshold, P99: *p99Threshold}
	endpoints := parseEndpoints(*endpointsRaw)
	client := &http.Client{Timeout: time.Duration(*timeoutSec) * time.Second}

	report := Report{
		TargetBaseURL: strings.TrimRight(*baseURL, "/"),
		GeneratedAt:   time.Now().UTC().Format(time.RFC3339),
		Iterations:    *iterations,
		TimeoutSec:    *timeoutSec,
		Thresholds:    t,
		Results:       make([]EndpointResult, 0, len(endpoints)),
		OverallPass:   true,
	}

	for _, ep := range endpoints {
		samples := make([]float64, 0, *iterations)
		for i := 0; i < *iterations; i++ {
			start := time.Now()
			resp, err := client.Get(report.TargetBaseURL + ep)
			elapsedMS := float64(time.Since(start).Microseconds()) / 1000
			if err != nil {
				samples = append(samples, round(elapsedMS))
				continue
			}
			_ = resp.Body.Close()
			samples = append(samples, round(elapsedMS))
		}

		sort.Float64s(samples)
		p := Percentiles{
			P50: round(percentile(samples, 50)),
			P90: round(percentile(samples, 90)),
			P95: round(percentile(samples, 95)),
			P99: round(percentile(samples, 99)),
		}
		avg, minV, maxV, stddev := stats(samples)
		pass, failures := evaluateThresholds(p, t)
		if !pass {
			report.OverallPass = false
		}

		report.Results = append(report.Results, EndpointResult{
			Endpoint:       ep,
			IterationCount: *iterations,
			TimeoutSeconds: *timeoutSec,
			SamplesMS:      samples,
			Percentiles:    p,
			AverageMS:      avg,
			MinMS:          minV,
			MaxMS:          maxV,
			StdDevMS:       stddev,
			Pass:           pass,
			Failures:       failures,
		})
	}

	enc := json.NewEncoder(os.Stdout)
	enc.SetIndent("", "  ")
	if err := enc.Encode(report); err != nil {
		fmt.Fprintf(os.Stderr, "failed to encode report: %v\n", err)
		os.Exit(2)
	}

	if !report.OverallPass {
		os.Exit(1)
	}
}
