package main

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestApplyProposalRejectsDuplicateSkillAlreadyInSSoT(t *testing.T) {
	// Given
	resume := map[string]any{
		"skills": map[string]any{
			"backend": map[string]any{"items": []any{map[string]any{"name": "Go", "level": "advanced"}}},
		},
	}
	proposal := approvedProposal{Proposal: Proposal{AllowedChanges: []ProposalChange{{
		Target:        ProposalTarget{Path: "/skills/backend/items/-", Operation: "add"},
		ProposedValue: []byte(`{"name":"Go","level":"beginner"}`),
	}}}}

	// When
	err := applyProposal(resume, proposal)

	// Then
	if err == nil || !strings.Contains(err.Error(), "duplicate") {
		t.Fatalf("error = %v, want duplicate addition rejection", err)
	}
}

func TestApplyApprovedProposalsRejectsDuplicateAddsWithinApprovedBatch(t *testing.T) {
	// Given
	root, originalResume := writeProposalRepository(t)
	first := writeStrictApprovedProposal(t, root, "first.proposal.json", originalResume, strictSkillChange("Go"))
	second := writeStrictApprovedProposal(t, root, "second.proposal.json", originalResume, strictSkillChange("Go"))

	// When
	_, err := applyApprovedProposals(root, func(string) error { return nil })

	// Then
	if err == nil || !strings.Contains(err.Error(), "duplicate") {
		t.Fatalf("error = %v, want duplicate addition rejection", err)
	}
	assertResumeUnchanged(t, root, originalResume)
	for _, proposalPath := range []string{first, second} {
		if _, statErr := os.Stat(proposalPath); statErr != nil {
			t.Fatalf("proposal should remain approved: %v", statErr)
		}
	}
}

func TestApplyApprovedProposalsValidatesStagedSSoTBeforePublication(t *testing.T) {
	// Given
	root, originalResume := writeProposalRepository(t)
	writeStrictApprovedProposal(t, root, "one.proposal.json", originalResume, strictSkillChange("Go"))

	// When
	applied, err := applyApprovedProposals(root, func(validationRoot string) error {
		if validationRoot == root {
			return errors.New("SSoT published before validation")
		}
		staged, readErr := readJSONObject(filepath.Join(validationRoot, resumePath))
		if readErr != nil {
			return readErr
		}
		items := staged["skills"].(map[string]any)["backend"].(map[string]any)["items"].([]any)
		if len(items) != 1 {
			return errors.New("staged SSoT did not include approved proposal")
		}
		return nil
	})

	// Then
	if err != nil {
		t.Fatalf("apply approved proposals: %v", err)
	}
	if !applied {
		t.Fatal("applied = false, want true")
	}
}

func TestApplyApprovedProposalsRecoversAnInterruptedSSoTPublication(t *testing.T) {
	// Given
	root, originalResume := writeProposalRepository(t)
	writeStrictApprovedProposal(t, root, "one.proposal.json", originalResume, strictSkillChange("Go"))
	published := map[string]any{
		"skills": map[string]any{
			"backend": map[string]any{"items": []any{map[string]any{"name": "Go"}}},
		},
	}
	if err := writeJSONObject(filepath.Join(root, resumePath), published); err != nil {
		t.Fatalf("simulate published SSoT: %v", err)
	}
	originalJSON, err := json.Marshal(originalResume)
	if err != nil {
		t.Fatalf("marshal original SSoT: %v", err)
	}
	journalPath := filepath.Join(root, "packages/data/proposals/.apply-proposals.transaction.json")
	journal := map[string]any{
		"originalResume": base64.StdEncoding.EncodeToString(originalJSON),
		"proposalPaths":  []any{filepath.ToSlash(filepath.Join(proposalDir, "one.proposal.json"))},
	}
	if err := writeJSONObject(journalPath, journal); err != nil {
		t.Fatalf("write interrupted transaction journal: %v", err)
	}

	// When
	applied, err := applyApprovedProposals(root, func(string) error { return nil })

	// Then
	if err != nil {
		t.Fatalf("recover interrupted transaction: %v", err)
	}
	if !applied {
		t.Fatal("applied = false, want recovered transaction to apply")
	}
	updated, readErr := readJSONObject(filepath.Join(root, resumePath))
	if readErr != nil {
		t.Fatalf("read recovered SSoT: %v", readErr)
	}
	items := updated["skills"].(map[string]any)["backend"].(map[string]any)["items"].([]any)
	if len(items) != 1 {
		t.Fatalf("recovered skill count = %d, want 1", len(items))
	}
	if _, statErr := os.Stat(journalPath); !errors.Is(statErr, os.ErrNotExist) {
		t.Fatalf("transaction journal should be removed: %v", statErr)
	}
}
