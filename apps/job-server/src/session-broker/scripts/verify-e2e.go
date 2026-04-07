package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"
)
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

func runVerifyE2E() int {
	v := &verifier{cfg: loadConfig(), client: &http.Client{Timeout: 15 * time.Second}}
	return v.run()
}

func (v *verifier) run() int {
	defer v.stopServer()
	fmt.Println("🔍 Session Broker E2E Verification")
	fmt.Println("================================")
	fmt.Println()
	v.ensureServiceReady()
	v.testHealthCheck()
	v.testSessionStatus()
	v.testSessionRenewal()
	v.testErrorHandling()
	v.testN8NWebhook()
	v.testTelegramNotification()
	passed, failed, skipped, criticalFailed := 0, 0, 0, false
	for _, r := range v.results {
		switch r.status {
		case "passed":
			passed++
			fmt.Printf("✓ %s\n", r.message)
		case "skipped":
			skipped++
			fmt.Printf("⚠ %s\n", r.message)
		default:
			failed++
			fmt.Printf("✗ %s\n", r.message)
			criticalFailed = criticalFailed || r.critical
		}
	}
	status := "READY FOR PRODUCTION"
	if criticalFailed {
		status = "NOT READY"
	}
	fmt.Println()
	fmt.Printf("Results: %d/%d passed, %d failed, %d skipped\n", passed, len(v.results), failed, skipped)
	fmt.Printf("Status: %s\n", status)
	if len(v.recommendations) > 0 {
		fmt.Println()
		fmt.Println("Recommendations:")
		for _, rec := range v.recommendations {
			fmt.Printf("- %s\n", rec)
		}
	}
	if criticalFailed {
		return 1
	}
	return 0
}

func (v *verifier) testHealthCheck() {
	fmt.Println("→ Testing health check endpoint...")
	body, status, err := v.request("GET", "/api/session/health", nil, true)
	if err != nil {
		v.fail("health-endpoint", true, "Health check endpoint failed: %v", err)
		v.recommend("Verify JOB_SERVER_ADMIN_TOKEN/ADMIN_TOKEN and /api/session/health route availability")
		return
	}
	if status != http.StatusOK {
		v.fail("health-endpoint", true, "Health check endpoint returned HTTP %d", status)
		return
	}
	var payload struct {
		Status    string                    `json:"status"`
		Platforms map[string]map[string]any `json:"platforms"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		v.fail("health-endpoint", true, "Health check response was not valid JSON: %v", err)
		return
	}
	if payload.Status != "healthy" {
		v.fail("health-status", true, "Health check status is %q (expected healthy)", payload.Status)
		v.recommend("Refresh or configure a valid Wanted session before production rollout")
	} else {
		v.pass("health-status", true, "Health check returns healthy status")
	}
	if _, ok := payload.Platforms["wanted"]; !ok {
		v.fail("health-platform", true, "Wanted platform is missing from health check response")
	} else {
		v.pass("health-platform", true, "Wanted platform is listed in health check")
	}
}

func (v *verifier) testSessionStatus() {
	fmt.Println("→ Testing session status endpoint...")
	body, status, err := v.request("GET", "/api/session/wanted/status", nil, true)
	if err != nil {
		v.fail("session-status", true, "Session status endpoint failed: %v", err)
		return
	}
	if status != http.StatusOK {
		v.fail("session-status", true, "Session status endpoint returned HTTP %d", status)
		return
	}
	var payload map[string]any
	if err := json.Unmarshal(body, &payload); err != nil {
		v.fail("session-status", true, "Session status response was not valid JSON: %v", err)
		return
	}
	_, hasValid := payload["valid"]
	_, hasExpiresAt := payload["expiresAt"]
	_, hasRenewedAt := payload["renewedAt"]
	if !hasValid || !hasExpiresAt || !hasRenewedAt {
		v.fail("session-status", true, "Session status response structure is invalid")
		return
	}
	v.pass("session-status", true, "Session status endpoint accessible with expected response structure")
}

func (v *verifier) testSessionRenewal() {
	fmt.Println("→ Testing session renewal...")
	body, status, err := v.request("POST", "/api/session/wanted/renew", map[string]any{}, true)
	if err != nil {
		v.fail("session-renewal", false, "Session renewal request failed: %v", err)
		return
	}
	if status == http.StatusOK {
		var payload map[string]any
		if err := json.Unmarshal(body, &payload); err == nil {
			if success, _ := payload["success"].(bool); success {
				v.pass("session-renewal", false, "Session renewal works successfully")
				return
			}
		}
		v.fail("session-renewal", false, "Session renewal returned HTTP 200 without success confirmation")
		return
	}
	if status == http.StatusBadRequest && looksLikeRenewalSkip(strings.ToLower(string(body))) {
		v.skip("session-renewal", false, "Session renewal skipped (no credentials or manual intervention required)")
		return
	}
	v.fail("session-renewal", false, "Session renewal returned HTTP %d: %s", status, compact(string(body)))
	v.recommend("Configure Wanted renewal prerequisites or inspect renewal flow errors before enabling automated renewal")
}

func (v *verifier) testErrorHandling() {
	fmt.Println("→ Testing error handling...")
	_, status, err := v.requestWithToken("GET", "/api/session/wanted/status", nil, "invalid-token")
	if err != nil || status != http.StatusUnauthorized {
		v.fail("invalid-auth", true, "Invalid authentication did not return HTTP 401")
		return
	}
	v.pass("invalid-auth", true, "Invalid authentication is rejected with HTTP 401")
	_, status, err = v.request("GET", "/api/session/invalid/status", nil, true)
	if err != nil {
		v.fail("invalid-platform", true, "Invalid platform request failed unexpectedly: %v", err)
		return
	}
	if status != http.StatusBadRequest {
		v.fail("invalid-platform", true, "Invalid platform did not return HTTP 400")
		return
	}
	v.pass("invalid-platform", true, "Invalid platform is handled gracefully with HTTP 400")
}

func (v *verifier) testN8NWebhook() {
	fmt.Println("→ Testing n8n webhook integration...")
	if v.cfg.n8nWebhookURL == "" {
		v.skip("n8n", false, "n8n webhook integration skipped (N8N_WEBHOOK_URL not configured)")
		return
	}
	body, status, err := v.rawJSONRequest(v.cfg.n8nWebhookURL, map[string]any{"event": "session-broker.e2e", "source": "verify-e2e.go", "timestamp": time.Now().UTC().Format(time.RFC3339)})
	if err != nil {
		v.fail("n8n", false, "n8n webhook integration failed: %v", err)
		v.recommend("Verify N8N_WEBHOOK_URL routing and webhook availability")
		return
	}
	if status < 200 || status >= 300 {
		v.fail("n8n", false, "n8n webhook returned HTTP %d: %s", status, compact(string(body)))
		return
	}
	v.pass("n8n", false, "n8n webhook integration functional")
}

func (v *verifier) testTelegramNotification() {
	fmt.Println("→ Testing Telegram notification delivery...")
	if v.cfg.telegramToken == "" || v.cfg.telegramChatID == "" {
		v.skip("telegram", false, "Telegram notification test skipped (TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID not configured)")
		return
	}
	url := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", v.cfg.telegramToken)
	body, status, err := v.rawJSONRequest(url, map[string]any{"chat_id": v.cfg.telegramChatID, "text": fmt.Sprintf("Session Broker E2E verification passed at %s", time.Now().UTC().Format(time.RFC3339))})
	if err != nil {
		v.fail("telegram", false, "Telegram notification failed: %v", err)
		v.recommend("Verify TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, and bot delivery permissions")
		return
	}
	if status < 200 || status >= 300 || !strings.Contains(string(body), `"ok":true`) {
		v.fail("telegram", false, "Telegram API did not confirm delivery: HTTP %d %s", status, compact(string(body)))
		return
	}
	v.pass("telegram", false, "Telegram notifications accepted by Telegram API")
}
func main() {
	os.Exit(runVerifyE2E())
}
