package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
)

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
