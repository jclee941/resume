package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestApplyApprovedProposalsAppliesReviewedChangeInTempRepository(t *testing.T) {
	// Given
	root, originalResume := writeProposalRepository(t)
	writeStrictApprovedProposal(t, root, "one.proposal.json", originalResume, strictSkillChange("Go"))

	// When
	_, err := applyApprovedProposals(root, func(string) error { return nil })

	// Then
	if err != nil {
		t.Fatalf("apply approved proposals: %v", err)
	}
	updatedResume, err := readJSONObject(filepath.Join(root, resumePath))
	if err != nil {
		t.Fatalf("read updated resume: %v", err)
	}
	items := updatedResume["skills"].(map[string]any)["backend"].(map[string]any)["items"].([]any)
	if got := items[0].(map[string]any)["name"]; got != "Go" {
		t.Fatalf("applied skill = %q, want Go", got)
	}
	if _, err := os.Stat(filepath.Join(root, appliedDir, "one.proposal.json")); err != nil {
		t.Fatalf("archived proposal: %v", err)
	}
}

func TestApplyApprovedProposalsPreservesTempRepositoryWhenProposalHasHiddenChange(t *testing.T) {
	// Given
	root, originalResume := writeProposalRepository(t)
	changes := []any{
		strictSkillChange("Go"),
		map[string]any{
			"target":        map[string]any{"resumePath": resumePath, "path": "/summary/profileStatement", "operation": "replace"},
			"proposedValue": "hidden replacement",
		},
	}
	proposalPath := writeStrictApprovedProposal(t, root, "tampered.proposal.json", originalResume, changes...)

	// When
	_, err := applyApprovedProposals(root, func(string) error { return nil })

	// Then
	if err == nil {
		t.Fatal("expected hidden change rejection")
	}
	if _, err := os.Stat(proposalPath); err != nil {
		t.Fatalf("proposal should remain for review: %v", err)
	}
	assertResumeUnchanged(t, root, originalResume)
}

func TestArchiveProposalsRestoresPriorMovesWhenLaterMoveFails(t *testing.T) {
	// Given
	root := t.TempDir()
	approved := filepath.Join(root, proposalDir)
	if err := os.MkdirAll(approved, 0o755); err != nil {
		t.Fatalf("create approved dir: %v", err)
	}
	first := filepath.Join(approved, "a.proposal.json")
	second := filepath.Join(approved, "b.proposal.json")
	for _, path := range []string{first, second} {
		if err := os.WriteFile(path, []byte("{}\n"), 0o644); err != nil {
			t.Fatalf("write proposal fixture: %v", err)
		}
	}
	if err := os.MkdirAll(filepath.Join(root, appliedDir, filepath.Base(second)), 0o755); err != nil {
		t.Fatalf("create conflicting archive target: %v", err)
	}

	// When
	err := archiveProposals(root, []approvedProposal{{filePath: first}, {filePath: second}})

	// Then
	if err == nil {
		t.Fatal("expected archive error")
	}
	if _, err := os.Stat(first); err != nil {
		t.Fatalf("first proposal should be restored: %v", err)
	}
}

func writeProposalRepository(t *testing.T) (string, map[string]any) {
	t.Helper()

	root := t.TempDir()
	resume := map[string]any{
		"skills": map[string]any{
			"backend": map[string]any{"items": []any{}},
		},
	}
	path := filepath.Join(root, resumePath)
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatalf("create resume directory: %v", err)
	}
	if err := writeJSONObject(path, resume); err != nil {
		t.Fatalf("write resume fixture: %v", err)
	}
	return root, resume
}

func strictSkillChange(name string) map[string]any {
	return map[string]any{
		"target":        map[string]any{"resumePath": resumePath, "path": "/skills/backend/items/-", "operation": "add"},
		"proposedValue": map[string]any{"name": name},
	}
}

func writeStrictApprovedProposal(t *testing.T, root, filename string, resume map[string]any, changes ...any) string {
	t.Helper()

	masterRevision, err := hashJSONObject(resume)
	if err != nil {
		t.Fatalf("hash resume: %v", err)
	}
	document := map[string]any{
		"id":              filename,
		"status":          "approved",
		"version":         float64(1),
		"createdAt":       "2026-07-23T00:00:00.000Z",
		"source":          map[string]any{"crawler": "test", "platform": "test", "jobId": filename},
		"masterRevision":  masterRevision,
		"proposalHash":    "",
		"sourceRefs":      []any{map[string]any{"type": "crawler-job", "crawler": "test", "platform": "test", "jobId": filename}},
		"target":          changes[0].(map[string]any)["target"],
		"proposedValue":   changes[0].(map[string]any)["proposedValue"],
		"currentValue":    nil,
		"confidence":      0.8,
		"evidence":        []any{},
		"notes":           "test proposal",
		"allowedChanges":  changes,
		"rejectedChanges": []any{},
	}
	encoded, err := json.Marshal(document)
	if err != nil {
		t.Fatalf("marshal proposal fixture: %v", err)
	}
	proposal := approvedProposalFromJSON(t, string(encoded))
	proposalHash, err := proposalHash(proposal)
	if err != nil {
		t.Fatalf("hash proposal fixture: %v", err)
	}
	document["proposalHash"] = proposalHash
	encoded, err = json.Marshal(document)
	if err != nil {
		t.Fatalf("marshal hashed proposal fixture: %v", err)
	}
	path := filepath.Join(root, proposalDir, filename)
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatalf("create proposal dir: %v", err)
	}
	if err := os.WriteFile(path, encoded, 0o644); err != nil {
		t.Fatalf("write proposal fixture: %v", err)
	}
	return path
}

func assertResumeUnchanged(t *testing.T, root string, want map[string]any) {
	t.Helper()

	got, err := readJSONObject(filepath.Join(root, resumePath))
	if err != nil {
		t.Fatalf("read resume after failed apply: %v", err)
	}
	if !mapsEqual(got, want) {
		t.Fatalf("resume changed after failed apply: got %#v, want %#v", got, want)
	}
}

func mapsEqual(first, second map[string]any) bool {
	firstJSON, _ := json.Marshal(first)
	secondJSON, _ := json.Marshal(second)
	return string(firstJSON) == string(secondJSON)
}
