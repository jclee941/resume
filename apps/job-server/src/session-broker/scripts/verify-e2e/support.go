package main

import (
	"bytes"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

type config struct {
	serverURL, adminToken, telegramToken, telegramChatID, automationWebhookURL, jobServerRoot string
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
		serverURL:            strings.TrimRight(firstNonEmpty(os.Getenv("JOB_SERVER_URL"), "http://localhost:3456"), "/"),
		adminToken:           firstNonEmpty(os.Getenv("JOB_SERVER_ADMIN_TOKEN"), os.Getenv("ADMIN_TOKEN")),
		telegramToken:        strings.TrimSpace(os.Getenv("TELEGRAM_BOT_TOKEN")),
		telegramChatID:       strings.TrimSpace(os.Getenv("TELEGRAM_CHAT_ID")),
		automationWebhookURL: firstNonEmpty(os.Getenv("AUTOMATION_WEBHOOK_URL"), os.Getenv("WEBHOOK_URL")),
		jobServerRoot:        filepath.Clean(filepath.Join(filepath.Dir(file), "..", "..", "..", "..")),
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
