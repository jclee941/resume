package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestRun_writesConsumerDecisionJSON(t *testing.T) {
	repo := newPolicyRepo(t)
	base := repo.commit(t, "fix: base")
	repo.tag(t, "v1.0.0", base)
	target := repo.commit(t, "fix: publish")
	output := filepath.Join(t.TempDir(), "release-decision.json")

	err := run([]string{"--repo", repo.path, "--target", target, "--remote-tip", target, "--trigger", "manual", "--output", output})
	if err != nil {
		t.Fatal(err)
	}
	data, err := os.ReadFile(output)
	if err != nil {
		t.Fatal(err)
	}
	var decision Decision
	if err := json.Unmarshal(data, &decision); err != nil {
		t.Fatal(err)
	}
	if decision.Decision != DecisionPublish || decision.NextTag != "v1.0.1" || decision.Range != "v1.0.0.."+target {
		t.Fatalf("unexpected CLI decision: %+v", decision)
	}
}
