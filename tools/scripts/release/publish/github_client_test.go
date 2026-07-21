package main

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
)

type recordingRunner struct {
	name  string
	args  []string
	stdin []byte
}

func (runner *recordingRunner) Run(_ context.Context, name string, args []string, stdin []byte) ([]byte, error) {
	runner.name = name
	runner.args = append([]string(nil), args...)
	runner.stdin = append([]byte(nil), stdin...)
	return []byte(`{"id":7,"tag_name":"v1.2.3","target_commitish":"1111111111111111111111111111111111111111","body":"ok","draft":true,"assets":[]}`), nil
}

func TestGitHubClient_CreateDraftPassesUntrustedNotesOnlyAsJSONStdin(t *testing.T) {
	runner := &recordingRunner{}
	client := NewGitHubClient(runner, "owner/repo", "origin")
	body := "$(gh release delete v1.2.3); `${{ secrets.TOKEN }}`\n"

	_, err := client.CreateDraft(context.Background(), DraftRequest{Tag: tagName, TargetSHA: targetSHA, Body: body, RunCreatedTag: true})

	if err != nil {
		t.Fatal(err)
	}
	if runner.name != "gh" || strings.Contains(strings.Join(runner.args, " "), body) {
		t.Fatalf("untrusted body reached argv: %q %v", runner.name, runner.args)
	}
	var payload struct {
		Body string `json:"body"`
	}
	if err := json.Unmarshal(runner.stdin, &payload); err != nil {
		t.Fatal(err)
	}
	if payload.Body != body {
		t.Fatalf("body=%q want=%q", payload.Body, body)
	}
}
