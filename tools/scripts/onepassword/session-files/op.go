package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os/exec"
	"strings"
)

type documentListEntry struct {
	Title string `json:"title"`
}

func documentExists(ctx context.Context, vault, title string) (bool, error) {
	output, err := runOp(ctx, nil, "document", "list", "--vault", vault, "--format", "json")
	if err != nil {
		return false, err
	}
	var docs []documentListEntry
	if err := json.Unmarshal(output, &docs); err != nil {
		return false, fmt.Errorf("parse 1Password document list: %w", err)
	}
	for _, doc := range docs {
		if doc.Title == title {
			return true, nil
		}
	}
	return false, nil
}

func ensureSignedIn(ctx context.Context) error {
	return runOpDiscard(ctx, nil, "account", "list")
}

func runOpDiscard(ctx context.Context, stdin io.Reader, args ...string) error {
	_, err := runOp(ctx, stdin, args...)
	return err
}

func runOp(ctx context.Context, stdin io.Reader, args ...string) ([]byte, error) {
	cmd := exec.CommandContext(ctx, "op", args...)
	cmd.Stdin = stdin
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	output, err := cmd.Output()
	if err != nil {
		message := strings.TrimSpace(stderr.String())
		if message == "" {
			message = err.Error()
		}
		return nil, errors.New(message)
	}
	return output, nil
}
