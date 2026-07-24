package main

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestApplyApprovedProposalWhenRevisionAndHashMatch(t *testing.T) {
	// Given
	resume := map[string]any{
		"skills": map[string]any{
			"backend": map[string]any{"items": []any{}},
		},
	}
	proposal := approvedProposalFromJSON(t, `{
		"id": "proposal-go",
		"status": "approved",
		"masterRevision": "matching-revision",
		"proposalHash": "matching-hash",
		"sourceRefs": [{"type": "crawler-job", "platform": "wanted", "jobId": "wanted-123", "url": "https://example.test/jobs/123"}],
		"target": {"path": "/skills/backend/items/-", "operation": "add"},
		"proposedValue": {"name": "Top-level value"},
		"allowedChanges": [{
			"target": {"path": "/skills/backend/items/-", "operation": "add"},
			"proposedValue": {"name": "Go"}
		}],
		"rejectedChanges": []
	}`)

	// When
	err := applyProposal(resume, proposal)

	// Then
	if err != nil {
		t.Fatalf("apply proposal: %v", err)
	}
	items := resume["skills"].(map[string]any)["backend"].(map[string]any)["items"].([]any)
	if got := items[0].(map[string]any)["name"]; got != "Go" {
		t.Fatalf("applied value = %q, want allowed value %q", got, "Go")
	}
}

func TestValidateApprovedProposalRejectsStaleMasterRevision(t *testing.T) {
	// Given
	proposal := approvedProposalFromJSON(t, `{
		"id": "proposal-stale",
		"status": "approved",
		"masterRevision": "revision-before-master-change",
		"proposalHash": "hash",
		"sourceRefs": [{"type": "crawler-job", "crawler": "crawler", "platform": "wanted", "jobId": "wanted-123", "url": "https://example.test/jobs/123"}],
		"allowedChanges": [{"target": {"resumePath": "packages/data/resumes/master/resume_data.json", "path": "/skills/backend/items/-", "operation": "add"}, "proposedValue": {"name": "Go"}}],
		"rejectedChanges": []
	}`)

	// When
	err := validateApprovedProposal(proposal, "revision-after-master-change")

	// Then
	if err == nil {
		t.Fatal("expected stale master revision rejection")
	}
}

func TestValidateApprovedProposalRejectsTamperedHash(t *testing.T) {
	// Given
	proposal := approvedProposalFromJSON(t, `{
		"id": "proposal-tampered",
		"status": "approved",
		"version": 1,
		"createdAt": "2026-07-23T00:00:00.000Z",
		"source": {"crawler": "crawler", "platform": "wanted", "jobId": "wanted-123", "jobTitle": "Engineer", "company": "Example Co", "url": "https://example.test/jobs/123"},
		"masterRevision": "matching-revision",
		"proposalHash": "tampered-hash",
		"sourceRefs": [{"type": "crawler-job", "crawler": "crawler", "platform": "wanted", "jobId": "wanted-123", "url": "https://example.test/jobs/123"}],
		"target": {"resumePath": "packages/data/resumes/master/resume_data.json", "path": "/skills/backend/items/-", "operation": "add"},
		"proposedValue": {"name": "Go"},
		"currentValue": null,
		"confidence": 0.8,
		"evidence": [],
		"notes": "unchanged",
		"allowedChanges": [{"target": {"resumePath": "packages/data/resumes/master/resume_data.json", "path": "/skills/backend/items/-", "operation": "add"}, "proposedValue": {"name": "Go"}}],
		"rejectedChanges": []
	}`)

	// When
	err := validateApprovedProposal(proposal, "matching-revision")

	// Then
	if err == nil || !strings.Contains(err.Error(), "proposal hash mismatch") {
		t.Fatalf("error = %v, want proposal hash mismatch", err)
	}
}

func TestValidateApprovedProposalRejectsHiddenAllowedChange(t *testing.T) {
	// Given
	proposal := approvedProposalFromJSON(t, `{
		"id": "proposal-hidden-change",
		"status": "approved",
		"version": 1,
		"createdAt": "2026-07-23T00:00:00.000Z",
		"source": {"crawler": "crawler", "platform": "wanted", "jobId": "wanted-123"},
		"masterRevision": "matching-revision",
		"proposalHash": "",
		"sourceRefs": [{"type": "crawler-job", "crawler": "crawler", "platform": "wanted", "jobId": "wanted-123"}],
		"target": {"resumePath": "packages/data/resumes/master/resume_data.json", "path": "/skills/backend/items/-", "operation": "add"},
		"proposedValue": {"name": "Go"},
		"currentValue": null,
		"confidence": 0.8,
		"evidence": [],
		"notes": "reviewed one skill",
		"allowedChanges": [
			{"target": {"resumePath": "packages/data/resumes/master/resume_data.json", "path": "/skills/backend/items/-", "operation": "add"}, "proposedValue": {"name": "Go"}},
			{"target": {"resumePath": "packages/data/resumes/master/resume_data.json", "path": "/summary/profileStatement", "operation": "replace"}, "proposedValue": "hidden replacement"}
		],
		"rejectedChanges": []
	}`)
	validHash, err := proposalHash(proposal)
	if err != nil {
		t.Fatalf("hash proposal: %v", err)
	}
	proposal.ProposalHash = validHash

	// When
	err = validateApprovedProposal(proposal, "matching-revision")

	// Then
	if err == nil || !strings.Contains(err.Error(), "exactly match") {
		t.Fatalf("error = %v, want hidden allowed change rejection", err)
	}
}

func TestValidateApprovedProposalRejectsPendingHashPromotedToApproved(t *testing.T) {
	// Given
	pending := `{
		"id": "proposal-status-tamper",
		"status": "pending",
		"version": 1,
		"createdAt": "2026-07-23T00:00:00.000Z",
		"source": {"crawler": "crawler", "platform": "wanted", "jobId": "wanted-123"},
		"masterRevision": "matching-revision",
		"proposalHash": "",
		"sourceRefs": [{"type": "crawler-job", "crawler": "crawler", "platform": "wanted", "jobId": "wanted-123"}],
		"target": {"resumePath": "packages/data/resumes/master/resume_data.json", "path": "/skills/backend/items/-", "operation": "add"},
		"proposedValue": {"name": "Go"},
		"currentValue": null,
		"confidence": 0.8,
		"evidence": [],
		"notes": "pending review",
		"allowedChanges": [{"target": {"resumePath": "packages/data/resumes/master/resume_data.json", "path": "/skills/backend/items/-", "operation": "add"}, "proposedValue": {"name": "Go"}}],
		"rejectedChanges": []
	}`
	proposal := approvedProposalFromJSON(t, pending)
	pendingHash, err := proposalHash(proposal)
	if err != nil {
		t.Fatalf("hash pending proposal: %v", err)
	}
	pendingDocument := map[string]any{}
	if err := json.Unmarshal([]byte(pending), &pendingDocument); err != nil {
		t.Fatalf("decode pending proposal: %v", err)
	}
	pendingDocument["status"] = "approved"
	pendingDocument["proposalHash"] = pendingHash
	promoted, err := json.Marshal(pendingDocument)
	if err != nil {
		t.Fatalf("encode promoted proposal: %v", err)
	}
	proposal = approvedProposalFromJSON(t, string(promoted))

	// When
	err = validateApprovedProposal(proposal, "matching-revision")

	// Then
	if err == nil || !strings.Contains(err.Error(), "proposal hash mismatch") {
		t.Fatalf("error = %v, want promoted status hash rejection", err)
	}
}

func approvedProposalFromJSON(t *testing.T, value string) approvedProposal {
	t.Helper()

	var proposal approvedProposal
	if err := json.Unmarshal([]byte(value), &proposal); err != nil {
		t.Fatalf("decode proposal fixture: %v", err)
	}
	if err := json.Unmarshal([]byte(value), &proposal.raw); err != nil {
		t.Fatalf("decode proposal hash fixture: %v", err)
	}
	return proposal
}
