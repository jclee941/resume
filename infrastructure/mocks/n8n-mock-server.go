package main

import (
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"sync"
	"syscall"
	"time"
)

const (
	defaultPort   = 15678
	defaultLogDir = "infrastructure/mocks/logs"
	bodyPreviewN  = 240
)

type responseEnvelope map[string]any

type workflowInfo struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Active bool   `json:"active"`
	Path   string `json:"path"`
}

type webhookLogEntry struct {
	Timestamp string            `json:"timestamp"`
	Method    string            `json:"method"`
	Path      string            `json:"path"`
	Headers   map[string]string `json:"headers"`
	Body      any               `json:"body,omitempty"`
	RawBody   string            `json:"rawBody,omitempty"`
}

type app struct {
	logger  *log.Logger
	logDir  string
	verbose bool
	mu      sync.Mutex
}

func main() {
	var (
		port    = flag.Int("port", defaultPort, "port to listen on")
		logDir  = flag.String("log-dir", defaultLogDir, "directory for webhook payload logs")
		verbose = flag.Bool("verbose", false, "log full request bodies")
	)
	flag.Parse()

	logger := log.New(os.Stdout, "", 0)
	a := &app{
		logger:  logger,
		logDir:  *logDir,
		verbose: *verbose,
	}

	if err := os.MkdirAll(a.logDir, 0o755); err != nil {
		logger.Fatalf("failed to create log directory %q: %v", a.logDir, err)
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", a.handleHealth)
	mux.HandleFunc("GET /api/workflows", a.handleWorkflows)
	mux.HandleFunc("POST /webhook/resume-deploy", a.handleWebhook)
	mux.HandleFunc("POST /webhook/automation-run-report", a.handleWebhook)

	server := &http.Server{
		Addr:    fmt.Sprintf(":%d", *port),
		Handler: a.loggingMiddleware(mux),
	}

	go func() {
		a.logger.Printf("[%s] n8n mock server started on http://localhost:%d (log-dir=%s, verbose=%t)",
			time.Now().Format(time.RFC3339), *port, a.logDir, a.verbose)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			a.logger.Fatalf("failed to start server: %v", err)
		}
	}()

	shutdownSignals := make(chan os.Signal, 1)
	signal.Notify(shutdownSignals, os.Interrupt, syscall.SIGTERM)
	<-shutdownSignals

	a.logger.Printf("[%s] shutdown signal received, stopping server...", time.Now().Format(time.RFC3339))
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		a.logger.Fatalf("graceful shutdown failed: %v", err)
	}

	a.logger.Printf("[%s] server stopped cleanly", time.Now().Format(time.RFC3339))
}

func (a *app) loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		bodyBytes := readBodyBytes(r)
		preview := makePreview(bodyBytes)

		a.logger.Printf("[%s] %s %s body=%s", time.Now().Format(time.RFC3339), r.Method, r.URL.Path, preview)
		if a.verbose && len(bodyBytes) > 0 {
			a.logger.Printf("[%s] full-body %s %s: %s", time.Now().Format(time.RFC3339), r.Method, r.URL.Path, string(bodyBytes))
		}

		r.Body = io.NopCloser(strings.NewReader(string(bodyBytes)))
		next.ServeHTTP(w, r)
	})
}

func (a *app) handleHealth(w http.ResponseWriter, _ *http.Request) {
	respondJSON(w, http.StatusOK, responseEnvelope{
		"status":  "healthy",
		"version": "mock-1.0",
	})
}

func (a *app) handleWorkflows(w http.ResponseWriter, _ *http.Request) {
	workflows := []workflowInfo{
		{ID: "resume-deploy-workflow", Name: "Resume Deploy", Active: true, Path: "resume-deploy"},
		{ID: "resume-auto-deploy-workflow", Name: "Resume Auto Deploy", Active: true, Path: "resume-auto-deploy"},
		{ID: "automation-run-report-workflow", Name: "Automation Run Report", Active: true, Path: "automation-run-report"},
	}
	respondJSON(w, http.StatusOK, workflows)
}

func (a *app) handleWebhook(w http.ResponseWriter, r *http.Request) {
	bodyBytes := readBodyBytes(r)
	if err := a.appendWebhookLog(r, bodyBytes); err != nil {
		a.logger.Printf("[%s] failed to persist webhook payload: %v", time.Now().Format(time.RFC3339), err)
		respondJSON(w, http.StatusInternalServerError, responseEnvelope{"error": "failed to persist webhook payload"})
		return
	}

	respondJSON(w, http.StatusOK, responseEnvelope{
		"executionId": "mock-123",
		"status":      "queued",
	})
}

func (a *app) appendWebhookLog(r *http.Request, body []byte) error {
	a.mu.Lock()
	defer a.mu.Unlock()

	if err := os.MkdirAll(a.logDir, 0o755); err != nil {
		return fmt.Errorf("create log dir: %w", err)
	}

	entry := webhookLogEntry{
		Timestamp: time.Now().Format(time.RFC3339),
		Method:    r.Method,
		Path:      r.URL.Path,
		Headers:   flattenHeaders(r.Header),
	}

	if len(body) > 0 {
		var bodyJSON any
		if err := json.Unmarshal(body, &bodyJSON); err == nil {
			entry.Body = bodyJSON
		} else {
			entry.RawBody = string(body)
		}
	}

	logFile := filepath.Join(a.logDir, fmt.Sprintf("n8n-webhook-%s.json", time.Now().Format("2006-01-02")))

	entries, err := readExistingEntries(logFile)
	if err != nil {
		return err
	}

	entries = append(entries, entry)
	encoded, err := json.MarshalIndent(entries, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal webhook entries: %w", err)
	}

	if err := os.WriteFile(logFile, encoded, 0o644); err != nil {
		return fmt.Errorf("write webhook log file: %w", err)
	}

	return nil
}

func readExistingEntries(path string) ([]webhookLogEntry, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return []webhookLogEntry{}, nil
		}
		return nil, fmt.Errorf("read existing log file: %w", err)
	}

	if len(data) == 0 {
		return []webhookLogEntry{}, nil
	}

	var entries []webhookLogEntry
	if err := json.Unmarshal(data, &entries); err != nil {
		return nil, fmt.Errorf("parse existing log file %q: %w", path, err)
	}

	return entries, nil
}

func flattenHeaders(headers http.Header) map[string]string {
	flat := make(map[string]string, len(headers))
	for k, values := range headers {
		flat[k] = strings.Join(values, ",")
	}
	return flat
}

func readBodyBytes(r *http.Request) []byte {
	if r == nil || r.Body == nil {
		return nil
	}
	body, err := io.ReadAll(r.Body)
	if err != nil {
		return []byte("<failed to read body>")
	}
	return body
}

func makePreview(body []byte) string {
	if len(body) == 0 {
		return "<empty>"
	}
	sanitized := strings.ReplaceAll(string(body), "\n", " ")
	sanitized = strings.ReplaceAll(sanitized, "\r", " ")
	if len(sanitized) <= bodyPreviewN {
		return sanitized
	}
	return sanitized[:bodyPreviewN] + "..."
}

func respondJSON(w http.ResponseWriter, statusCode int, payload any) {
	if w == nil {
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		log.Printf("failed to write JSON response: %v", err)
	}
}
