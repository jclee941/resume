//go:build smoke_test

package main

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"strings"
)

func fetchStatusCode(client *http.Client, method, url string, body []byte) int {
	_, code, err := request(client, method, url, body)
	if err != nil {
		return 0
	}
	return code
}

func request(client *http.Client, method, url string, body []byte) ([]byte, int, error) {
	var reader io.Reader
	if body != nil {
		reader = bytes.NewReader(body)
	}
	req, err := http.NewRequest(method, url, reader)
	if err != nil {
		return nil, 0, err
	}
	if method == http.MethodPost {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer resp.Body.Close()

	respBody, readErr := io.ReadAll(resp.Body)
	if readErr != nil {
		return nil, resp.StatusCode, readErr
	}
	return respBody, resp.StatusCode, nil
}

func requestHeaders(client *http.Client, url string) (int, http.Header, error) {
	req, err := http.NewRequest(http.MethodHead, url, nil)
	if err != nil {
		return 0, nil, err
	}
	resp, err := client.Do(req)
	if err != nil {
		return 0, nil, err
	}
	defer resp.Body.Close()
	return resp.StatusCode, resp.Header, nil
}

func parseHealth(payload []byte) (string, string) {
	status := "unknown"
	version := "unknown"
	target := struct {
		Status  string `json:"status"`
		Version string `json:"version"`
	}{}
	if err := json.Unmarshal(payload, &target); err != nil {
		return status, version
	}
	if target.Status != "" {
		status = target.Status
	}
	if target.Version != "" {
		version = target.Version
	}
	return status, version
}

func headerExists(headers http.Header, key string) bool {
	value := headers.Get(key)
	return strings.TrimSpace(value) != ""
}
