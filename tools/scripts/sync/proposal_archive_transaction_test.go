package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestApplyApprovedProposalsRestoresSSoTWhenArchivePreflightFails(t *testing.T) {
	// Given
	root, originalResume := writeProposalRepository(t)
	first := writeStrictApprovedProposal(t, root, "a.proposal.json", originalResume, strictSkillChange("Go"))
	second := writeStrictApprovedProposal(t, root, "b.proposal.json", originalResume, strictSkillChange("Python"))
	if err := os.MkdirAll(filepath.Join(root, appliedDir, filepath.Base(second)), 0o755); err != nil {
		t.Fatalf("create conflicting archive target: %v", err)
	}

	// When
	_, err := applyApprovedProposals(root, func(string) error { return nil })

	// Then
	if err == nil {
		t.Fatal("expected archive failure")
	}
	assertResumeUnchanged(t, root, originalResume)
	for _, proposal := range []string{first, second} {
		if _, err := os.Stat(proposal); err != nil {
			t.Fatalf("proposal should remain pending after rollback: %v", err)
		}
	}
}
