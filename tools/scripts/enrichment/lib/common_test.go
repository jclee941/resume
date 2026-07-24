package lib

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestWriteProposalWritesSyncCompatiblePendingProposal(t *testing.T) {
	// Given
	root := t.TempDir()
	resumePath := filepath.Join(root, ResumePath)
	if err := os.MkdirAll(filepath.Dir(resumePath), 0o755); err != nil {
		t.Fatalf("create resume directory: %v", err)
	}
	if err := os.WriteFile(resumePath, []byte(`{"skills":{"backend":{"items":[]}}}`), 0o644); err != nil {
		t.Fatalf("write resume fixture: %v", err)
	}
	target := ProposalTarget{Path: "/skills/backend/items/-", Operation: "add"}
	value := map[string]any{"name": "Go", "level": "beginner"}

	// When
	err := WriteProposal(root, "skills", "go", target, value, "application evidence")

	// Then
	if err != nil {
		t.Fatalf("write proposal: %v", err)
	}
	data, err := os.ReadFile(filepath.Join(root, ProposalDir, "skills-go.proposal.json"))
	if err != nil {
		t.Fatalf("read proposal: %v", err)
	}
	var proposal map[string]any
	if err := json.Unmarshal(data, &proposal); err != nil {
		t.Fatalf("decode proposal: %v", err)
	}
	if proposal["status"] != "pending" {
		t.Fatalf("status = %v, want pending", proposal["status"])
	}
	if proposal["masterRevision"] == "" || proposal["proposalHash"] == "" {
		t.Fatalf("proposal lacks sync provenance: %#v", proposal)
	}
	allowedChanges, ok := proposal["allowedChanges"].([]any)
	if !ok || len(allowedChanges) != 1 {
		t.Fatalf("allowedChanges = %#v, want exactly one change", proposal["allowedChanges"])
	}
	proposalTarget := proposal["target"].(map[string]any)
	if proposalTarget["resumePath"] != ResumePath {
		t.Fatalf("target resumePath = %v, want %s", proposalTarget["resumePath"], ResumePath)
	}
}
