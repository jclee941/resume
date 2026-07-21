package main

import (
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

type tipPayload struct {
	SHA    string `json:"sha"`
	Object struct {
		SHA string `json:"sha"`
	} `json:"object"`
}

func main() {
	if err := run(context.Background(), os.Args[1:], os.Stdout); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func run(ctx context.Context, args []string, output io.Writer) error {
	flags := flag.NewFlagSet("wait-for-deployment", flag.ContinueOnError)
	flags.SetOutput(io.Discard)
	healthURL := flags.String("health-url", "", "immutable deployment health endpoint")
	expectedSHA := flags.String("expected-sha", "", "40-character expected Git SHA")
	tipURL := flags.String("current-tip-url", "", "optional current branch-tip JSON endpoint")
	pollInterval := flags.Duration("poll-interval", 10*time.Second, "poll interval")
	timeout := flags.Duration("timeout", 5*time.Minute, "maximum wait")
	if err := flags.Parse(args); err != nil {
		return fmt.Errorf("parse flags: %w", err)
	}
	if *healthURL == "" || !fullSHA.MatchString(*expectedSHA) {
		return errors.New("--health-url and a 40-character --expected-sha are required")
	}
	client := &http.Client{Timeout: 30 * time.Second}
	var checkTip CurrentTipCallback
	if *tipURL != "" {
		checkTip = currentTipCallback(client, *tipURL, os.Getenv("GITHUB_TOKEN"))
	}
	receipt, err := waitForDeployment(ctx, WaitConfig{
		HealthURL:    *healthURL,
		ExpectedSHA:  GitSHA(*expectedSHA),
		PollInterval: *pollInterval,
		Timeout:      *timeout,
		HTTPClient:   client,
		CheckTip:     checkTip,
	})
	if err != nil {
		return err
	}
	if err := json.NewEncoder(output).Encode(receipt); err != nil {
		return fmt.Errorf("encode receipt: %w", err)
	}
	return nil
}

func currentTipCallback(client *http.Client, tipURL, token string) CurrentTipCallback {
	return func(ctx context.Context, expected GitSHA) error {
		request, err := http.NewRequestWithContext(ctx, http.MethodGet, tipURL, nil)
		if err != nil {
			return fmt.Errorf("create tip request: %w", err)
		}
		request.Header.Set("Accept", "application/vnd.github+json")
		request.Header.Set("User-Agent", "wait-for-deployment/1.0")
		if token != "" {
			request.Header.Set("Authorization", "Bearer "+token)
		}
		response, err := client.Do(request)
		if err != nil {
			return fmt.Errorf("request tip: %w", err)
		}
		defer response.Body.Close()
		if response.StatusCode != http.StatusOK {
			return fmt.Errorf("tip status %d: %w", response.StatusCode, ErrHTTPStatus)
		}
		var payload tipPayload
		if err := json.NewDecoder(io.LimitReader(response.Body, 1<<20)).Decode(&payload); err != nil {
			return fmt.Errorf("decode tip: %w", err)
		}
		current := payload.SHA
		if current == "" {
			current = payload.Object.SHA
		}
		if !fullSHA.MatchString(current) {
			return fmt.Errorf("tip SHA %q: %w", current, ErrInvalidHealth)
		}
		if GitSHA(current) != expected {
			return &SupersededError{Expected: expected, Current: GitSHA(current)}
		}
		return nil
	}
}
