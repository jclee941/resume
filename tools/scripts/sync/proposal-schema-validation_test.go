package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestValidateStagedProposalUsesAuthoritativeSchema(t *testing.T) {
	root := t.TempDir()
	repositoryRoot, err := repoRoot()
	if err != nil {
		t.Fatalf("resolve repository root: %v", err)
	}
	if err := os.Symlink(filepath.Join(repositoryRoot, "tools"), filepath.Join(root, "tools")); err != nil {
		t.Fatalf("link validation tools: %v", err)
	}
	resumeDirectory := filepath.Join(root, filepath.Dir(resumePath))
	if err := os.MkdirAll(resumeDirectory, 0o755); err != nil {
		t.Fatalf("create resume directory: %v", err)
	}
	resumeDocument := []byte(`{"certifications":[{"date":null}]}`)
	if err := os.WriteFile(filepath.Join(root, resumePath), resumeDocument, 0o644); err != nil {
		t.Fatalf("write resume fixture: %v", err)
	}
	schema := []byte(`{
  "type":"object",
  "required":["certifications"],
  "properties":{
    "certifications":{
      "type":"array",
      "items":{
        "type":"object",
        "required":["date"],
        "properties":{"date":{"type":["string","null"]}}
      }
    }
  }
}`)
	if err := os.WriteFile(filepath.Join(resumeDirectory, "resume_schema.json"), schema, 0o644); err != nil {
		t.Fatalf("write schema fixture: %v", err)
	}

	resume := map[string]any{
		"certifications": []any{map[string]any{"date": nil}},
	}
	if err := validateStagedProposal(root, resume, validateCanonicalResume); err != nil {
		t.Fatalf("validate staged proposal: %v", err)
	}
}
