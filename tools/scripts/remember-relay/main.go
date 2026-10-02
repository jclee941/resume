// Command remember-relay is a signed request forwarder for the Remember platform.
//
// Remember's Cloudflare WAF returns 403 to every request from Cloudflare's IP ranges, so the
// resume Worker cannot reach Remember directly. This relay runs on a residential host (behind a
// Cloudflare Tunnel) and forwards HMAC-signed requests from the Worker to rememberapp.co.kr,
// returning the response verbatim. It is single-purpose: only rememberapp.co.kr hosts are
// allowed, and every request must carry a valid HMAC-SHA256 signature of its body.
package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

type relayRequest struct {
	Method  string      `json:"method"`
	URL     string      `json:"url"`
	Headers [][2]string `json:"headers"`
	Body    *string     `json:"body"`
}

type relayResponse struct {
	Status  int         `json:"status"`
	Headers [][2]string `json:"headers"`
	Body    string      `json:"body"`
}

var skipRequestHeaders = map[string]bool{"host": true, "content-length": true}

func main() {
	secret := os.Getenv("RELAY_SECRET")
	if secret == "" {
		fmt.Fprintln(os.Stderr, "RELAY_SECRET is required")
		os.Exit(1)
	}
	port := os.Getenv("RELAY_PORT")
	if port == "" {
		port = "8789"
	}
	client := &http.Client{Timeout: 30 * time.Second}

	http.HandleFunc("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		fmt.Fprintln(w, "ok")
	})
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		handle(w, r, secret, client)
	})

	fmt.Printf("remember-relay listening on :%s\n", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func handle(w http.ResponseWriter, r *http.Request, secret string, client *http.Client) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	raw, err := io.ReadAll(io.LimitReader(r.Body, 8<<20))
	if err != nil {
		http.Error(w, "read error", http.StatusBadRequest)
		return
	}
	if !validSignature(raw, r.Header.Get("X-Relay-Signature"), secret) {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}
	var req relayRequest
	if err := json.Unmarshal(raw, &req); err != nil {
		http.Error(w, "bad envelope", http.StatusBadRequest)
		return
	}
	if !allowedTarget(req.URL) {
		http.Error(w, "target not allowed", http.StatusForbidden)
		return
	}
	reply, err := forward(client, req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(reply)
}

func forward(client *http.Client, req relayRequest) (*relayResponse, error) {
	var body io.Reader
	if req.Body != nil {
		body = strings.NewReader(*req.Body)
	}
	method := req.Method
	if method == "" {
		method = http.MethodGet
	}
	outbound, err := http.NewRequest(method, req.URL, body)
	if err != nil {
		return nil, err
	}
	for _, pair := range req.Headers {
		if skipRequestHeaders[strings.ToLower(pair[0])] {
			continue
		}
		outbound.Header.Add(pair[0], pair[1])
	}
	resp, err := client.Do(outbound)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	payload, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	headers := [][2]string{}
	for key, values := range resp.Header {
		for _, value := range values {
			headers = append(headers, [2]string{key, value})
		}
	}
	return &relayResponse{Status: resp.StatusCode, Headers: headers, Body: string(payload)}, nil
}

func allowedTarget(raw string) bool {
	return strings.HasPrefix(raw, "https://") && hostMatches(raw)
}

func hostMatches(raw string) bool {
	rest := strings.TrimPrefix(raw, "https://")
	host := rest
	if i := strings.IndexAny(rest, "/?#"); i >= 0 {
		host = rest[:i]
	}
	host = strings.ToLower(host)
	return host == "rememberapp.co.kr" || strings.HasSuffix(host, ".rememberapp.co.kr")
}

func validSignature(body []byte, signature, secret string) bool {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	expected := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(expected), []byte(signature))
}
