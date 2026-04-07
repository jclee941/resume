package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

type config struct {
	serverURL, adminToken, telegramToken, telegramChatID, n8nWebhookURL, jobServerRoot string
}
type result struct {
	name, status, message string
	critical              bool
}
type verifier struct {
	cfg             config
	client          *http.Client
	results         []result
	recommendations []string
	serverCmd       *exec.Cmd
	serverLogs      bytes.Buffer
}

func loadConfig() config {
	_, file, _, _ := runtime.Caller(0)
	return config{
		serverURL:      strings.TrimRight(firstNonEmpty(os.Getenv("JOB_SERVER_URL"), "http://localhost:3456"), "/"),
		adminToken:     firstNonEmpty(os.Getenv("JOB_SERVER_ADMIN_TOKEN"), os.Getenv("ADMIN_TOKEN")),
		telegramToken:  strings.TrimSpace(os.Getenv("TELEGRAM_BOT_TOKEN")),
		telegramChatID: strings.TrimSpace(os.Getenv("TELEGRAM_CHAT_ID")),
		n8nWebhookURL:  firstNonEmpty(os.Getenv("N8N_WEBHOOK_URL"), os.Getenv("N8N_URL")),
		jobServerRoot:  filepath.Clean(filepath.Join(filepath.Dir(file), "..", "..", "..")),
	}
}

func (v *verifier) ensureServiceReady() {
	fmt.Println("→ Verifying service availability...")
	if v.pingService() == nil {
		v.pass("service-start", true, "Session broker service starts without errors")
		return
	}
	if !isLocalURL(v.cfg.serverURL) {
		v.fail("service-start", true, "Session broker service is unreachable at %s", v.cfg.serverURL)
		v.recommend("Start the job server or set JOB_SERVER_URL to a reachable endpoint")
		return
	}
	cmd := exec.Command("node", "src/server/index.js")
	cmd.Dir, cmd.Stdout, cmd.Stderr = v.cfg.jobServerRoot, &v.serverLogs, &v.serverLogs
	cmd.Env = append(os.Environ(), "DASHBOARD_PORT="+portForURL(v.cfg.serverURL))
	if v.cfg.adminToken != "" && os.Getenv("ADMIN_TOKEN") == "" {
		cmd.Env = append(cmd.Env, "ADMIN_TOKEN="+v.cfg.adminToken)
	}
	if err := cmd.Start(); err != nil {
		v.fail("service-start", true, "Failed to start session broker service: %v", err)
		v.recommend("Install dependencies in apps/job-server and verify node src/server/index.js starts cleanly")
		return
	}
	v.serverCmd = cmd
	deadline := time.Now().Add(20 * time.Second)
	for time.Now().Before(deadline) {
		if v.pingService() == nil {
			v.pass("service-start", true, "Session broker service starts without errors")
			return
		}
		time.Sleep(500 * time.Millisecond)
	}
	_ = v.serverCmd.Process.Kill()
	v.fail("service-start", true, "Session broker service did not become ready within 20s")
	v.recommend("Inspect startup logs and fix server boot errors: " + compact(v.serverLogs.String()))
	_, _ = v.serverCmd.Process.Wait()
	v.serverCmd = nil
}
func (v *verifier) pingService() error {
	_, status, err := v.requestWithToken("GET", "/api/health", nil, "")
	if err != nil {
		return err
	}
	if status != http.StatusOK {
		return fmt.Errorf("unexpected status %d", status)
	}
	return nil
}
func (v *verifier) request(method, path string, payload any, auth bool) ([]byte, int, error) {
	token := ""
	if auth {
		token = v.cfg.adminToken
	}
	return v.requestWithToken(method, path, payload, token)
}
func (v *verifier) requestWithToken(method, path string, payload any, token string) ([]byte, int, error) {
	data, status, err := v.rawJSONRequestWithMethod(v.cfg.serverURL+path, method, payload, token)
	if err != nil && token == "" && strings.HasPrefix(path, "/api/session/") {
		v.recommend("Set JOB_SERVER_ADMIN_TOKEN or ADMIN_TOKEN so authenticated session broker endpoints can be verified")
	}
	return data, status, err
}
func (v *verifier) rawJSONRequest(target string, payload any) ([]byte, int, error) {
	return v.rawJSONRequestWithMethod(target, http.MethodPost, payload, "")
}
func (v *verifier) rawJSONRequestWithMethod(target, method string, payload any, token string) ([]byte, int, error) {
	var body io.Reader
	if payload != nil {
		encoded, err := json.Marshal(payload)
		if err != nil {
			return nil, 0, err
		}
		body = bytes.NewReader(encoded)
	}
	req, err := http.NewRequest(method, target, body)
	if err != nil {
		return nil, 0, err
	}
	if payload != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	resp, err := v.client.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer resp.Body.Close()
	data, readErr := io.ReadAll(resp.Body)
	return data, resp.StatusCode, readErr
}
func (v *verifier) stopServer() {
	if v.serverCmd != nil && v.serverCmd.Process != nil {
		_ = v.serverCmd.Process.Kill()
		_, _ = v.serverCmd.Process.Wait()
	}
}
func (v *verifier) pass(name string, critical bool, format string, args ...any) {
	v.results = append(v.results, result{name: name, status: "passed", critical: critical, message: fmt.Sprintf(format, args...)})
}
func (v *verifier) fail(name string, critical bool, format string, args ...any) {
	v.results = append(v.results, result{name: name, status: "failed", critical: critical, message: fmt.Sprintf(format, args...)})
}
func (v *verifier) skip(name string, critical bool, format string, args ...any) {
	v.results = append(v.results, result{name: name, status: "skipped", critical: critical, message: fmt.Sprintf(format, args...)})
}
func (v *verifier) recommend(message string) {
	for _, existing := range v.recommendations {
		if existing == message {
			return
		}
	}
	v.recommendations = append(v.recommendations, message)
}
func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}
func isLocalURL(raw string) bool {
	parsed, err := url.Parse(raw)
	if err != nil {
		return false
	}
	host := parsed.Hostname()
	return host == "localhost" || host == "127.0.0.1" || host == "0.0.0.0" || host == ""
}
func portForURL(raw string) string {
	parsed, err := url.Parse(raw)
	if err != nil {
		return "3456"
	}
	if port := parsed.Port(); port != "" {
		return port
	}
	if strings.EqualFold(parsed.Scheme, "https") {
		return "443"
	}
	return "3456"
}
func looksLikeRenewalSkip(message string) bool {
	for _, marker := range []string{"required", "manual", "profile", "credential", "login required"} {
		if strings.Contains(message, marker) {
			return true
		}
	}
	return false
}
func compact(text string) string {
	trimmed := strings.Join(strings.Fields(strings.TrimSpace(text)), " ")
	if trimmed == "" {
		return "no details available"
	}
	if len(trimmed) > 160 {
		return trimmed[:157] + "..."
	}
	return trimmed
}

func init() {
	transport := http.DefaultTransport.(*http.Transport).Clone()
	transport.DialContext = (&net.Dialer{Timeout: 5 * time.Second}).DialContext
	http.DefaultTransport = transport
}
