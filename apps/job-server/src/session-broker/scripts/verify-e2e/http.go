package main

import (
	"bytes"
	"encoding/json"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"
)

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
