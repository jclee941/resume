package main

import (
	"fmt"
	"net/http"
	"strings"
	"time"
)

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

func (v *verifier) testAutomationWebhook() {
	fmt.Println("→ Testing automation webhook integration...")
	if v.cfg.automationWebhookURL == "" {
		v.skip("automation-webhook", false, "automation webhook integration skipped (AUTOMATION_WEBHOOK_URL not configured)")
		return
	}
	body, status, err := v.rawJSONRequest(v.cfg.automationWebhookURL, map[string]any{"event": "session-broker.e2e", "source": "verify-e2e.go", "timestamp": time.Now().UTC().Format(time.RFC3339)})
	if err != nil {
		v.fail("automation-webhook", false, "automation webhook integration failed: %v", err)
		v.recommend("Verify AUTOMATION_WEBHOOK_URL routing and webhook availability")
		return
	}
	if status < 200 || status >= 300 {
		v.fail("automation-webhook", false, "automation webhook returned HTTP %d: %s", status, compact(string(body)))
		return
	}
	v.pass("automation-webhook", false, "automation webhook integration functional")
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
