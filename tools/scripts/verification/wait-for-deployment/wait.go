package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"time"
)

var (
	ErrHTTPStatus    = errors.New("deployment health HTTP status")
	ErrInvalidHealth = errors.New("invalid deployment health")
	ErrTimeout       = errors.New("deployment wait timeout")
	fullSHA          = regexp.MustCompile(`^[0-9a-f]{40}$`)
)

type GitSHA string

type SupersededError struct {
	Expected GitSHA
	Current  GitSHA
}

func (e *SupersededError) Error() string {
	return fmt.Sprintf("deployment %s superseded by %s", e.Expected, e.Current)
}

type CurrentTipCallback func(context.Context, GitSHA) error

type WaitConfig struct {
	HealthURL    string
	ExpectedSHA  GitSHA
	PollInterval time.Duration
	Timeout      time.Duration
	HTTPClient   *http.Client
	CheckTip     CurrentTipCallback
}

type WaitReceipt struct {
	Superseded  bool   `json:"superseded"`
	ExpectedSHA GitSHA `json:"expected_sha"`
	DeployedSHA GitSHA `json:"deployed_sha,omitempty"`
	CurrentTip  GitSHA `json:"current_tip,omitempty"`
	Attempts    int    `json:"attempts"`
}

type healthPayload struct {
	GitSHA string `json:"git_sha"`
}

func waitForDeployment(parent context.Context, config WaitConfig) (WaitReceipt, error) {
	receipt := WaitReceipt{ExpectedSHA: config.ExpectedSHA}
	if !fullSHA.MatchString(string(config.ExpectedSHA)) {
		return receipt, fmt.Errorf("expected SHA %q: %w", config.ExpectedSHA, ErrInvalidHealth)
	}
	ctx, cancel := context.WithTimeout(parent, config.Timeout)
	defer cancel()

	for {
		if config.CheckTip != nil {
			if err := config.CheckTip(ctx, config.ExpectedSHA); err != nil {
				var superseded *SupersededError
				if errors.As(err, &superseded) {
					receipt.Superseded = true
					receipt.CurrentTip = superseded.Current
					return receipt, nil
				}
				return receipt, fmt.Errorf("check current tip: %w", err)
			}
		}

		receipt.Attempts++
		deployedSHA, err := fetchHealth(ctx, config.HTTPClient, config.HealthURL)
		if err != nil {
			// The HTTP round-trip can fail because the poll context's deadline
			// expired mid-request (e.g. a slow health endpoint), racing with the
			// ctx.Done() case below. Surface that as ErrTimeout instead of a raw
			// "context deadline exceeded" so callers get a consistent, wrapped
			// error regardless of which point in the loop the deadline hit.
			if ctx.Err() != nil {
				return receipt, fmt.Errorf("expected %s after %d attempts: %w", config.ExpectedSHA, receipt.Attempts, ErrTimeout)
			}
			return receipt, err
		}
		if deployedSHA == config.ExpectedSHA {
			receipt.DeployedSHA = deployedSHA
			return receipt, nil
		}

		timer := time.NewTimer(config.PollInterval)
		select {
		case <-ctx.Done():
			if !timer.Stop() {
				<-timer.C
			}
			return receipt, fmt.Errorf("expected %s after %d attempts: %w", config.ExpectedSHA, receipt.Attempts, ErrTimeout)
		case <-timer.C:
		}
	}
}

func fetchHealth(ctx context.Context, client *http.Client, healthURL string) (GitSHA, error) {
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, healthURL, nil)
	if err != nil {
		return "", fmt.Errorf("create health request: %w", err)
	}
	request.Header.Set("Accept", "application/json")
	request.Header.Set("User-Agent", "wait-for-deployment/1.0")
	response, err := client.Do(request)
	if err != nil {
		return "", fmt.Errorf("request health: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return "", fmt.Errorf("status %d: %w", response.StatusCode, ErrHTTPStatus)
	}
	var payload healthPayload
	decoder := json.NewDecoder(io.LimitReader(response.Body, 1<<20))
	if err := decoder.Decode(&payload); err != nil {
		return "", fmt.Errorf("decode health: %w", ErrInvalidHealth)
	}
	if !fullSHA.MatchString(payload.GitSHA) {
		return "", fmt.Errorf("git_sha %q: %w", payload.GitSHA, ErrInvalidHealth)
	}
	return GitSHA(payload.GitSHA), nil
}
