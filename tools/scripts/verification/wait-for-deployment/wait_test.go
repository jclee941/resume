package main

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

const expectedSHA = "0123456789abcdef0123456789abcdef01234567"

func TestWaitForDeployment_acceptsExactSHA(t *testing.T) {
	server := healthServer(t, http.StatusOK, `{"git_sha":"`+expectedSHA+`"}`)
	receipt, err := waitForDeployment(context.Background(), testConfig(server.URL, nil))
	if err != nil {
		t.Fatalf("waitForDeployment() error = %v", err)
	}
	if receipt.DeployedSHA != expectedSHA || receipt.Superseded {
		t.Fatalf("receipt = %#v", receipt)
	}
}

func TestRejectsUnknown(t *testing.T) {
	assertWaitError(t, http.StatusOK, `{"git_sha":"unknown"}`, ErrInvalidHealth)
}

func TestRejectsPrefix(t *testing.T) {
	assertWaitError(t, http.StatusOK, `{"git_sha":"01234567"}`, ErrInvalidHealth)
}

func TestRejectsHTTPFailure(t *testing.T) {
	for _, status := range []int{http.StatusForbidden, http.StatusServiceUnavailable} {
		t.Run(http.StatusText(status), func(t *testing.T) {
			assertWaitError(t, status, `{"error":"unavailable"}`, ErrHTTPStatus)
		})
	}
}

func TestRejectsMalformedHealth(t *testing.T) {
	assertWaitError(t, http.StatusOK, `{"git_sha":`, ErrInvalidHealth)
}

func TestTimeout(t *testing.T) {
	server := healthServer(t, http.StatusOK, `{"git_sha":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}`)
	config := testConfig(server.URL, nil)
	config.Timeout = 15 * time.Millisecond

	_, err := waitForDeployment(context.Background(), config)
	if !errors.Is(err, ErrTimeout) {
		t.Fatalf("waitForDeployment() error = %v, want ErrTimeout", err)
	}
}

func TestWaitForDeployment_returnsTypedSupersededMidPoll(t *testing.T) {
	server := healthServer(t, http.StatusOK, `{"git_sha":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}`)
	calls := 0
	checkTip := func(context.Context, GitSHA) error {
		calls++
		if calls > 1 {
			return &SupersededError{Expected: GitSHA(expectedSHA), Current: GitSHA("bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb")}
		}
		return nil
	}

	receipt, err := waitForDeployment(context.Background(), testConfig(server.URL, checkTip))
	if err != nil {
		t.Fatalf("waitForDeployment() error = %v", err)
	}
	if !receipt.Superseded || receipt.CurrentTip == "" {
		t.Fatalf("receipt = %#v", receipt)
	}
}

func assertWaitError(t *testing.T, status int, body string, target error) {
	t.Helper()
	server := healthServer(t, status, body)
	_, err := waitForDeployment(context.Background(), testConfig(server.URL, nil))
	if !errors.Is(err, target) {
		t.Fatalf("waitForDeployment() error = %v, want %v", err, target)
	}
}

func healthServer(t *testing.T, status int, body string) *httptest.Server {
	t.Helper()
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, _ *http.Request) {
		writer.Header().Set("Content-Type", "application/json")
		writer.WriteHeader(status)
		_, _ = writer.Write([]byte(body))
	}))
	t.Cleanup(server.Close)
	return server
}

func testConfig(baseURL string, checkTip CurrentTipCallback) WaitConfig {
	return WaitConfig{
		HealthURL:    baseURL,
		ExpectedSHA:  GitSHA(expectedSHA),
		PollInterval: time.Millisecond,
		Timeout:      100 * time.Millisecond,
		HTTPClient:   &http.Client{Timeout: time.Second},
		CheckTip:     checkTip,
	}
}
