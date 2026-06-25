package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/jclee941/resume/tools/scripts/enrichment/lib"
)

func Test_generateProposals_preservesExistingProjectID_whenUpdatingProject(t *testing.T) {
	// Given
	root := writeResumeFixture(t, `{
	  "personalProjects": [
	    {
	      "id": "existing-project-id",
	      "name": "existing-project",
	      "period": "2024.01",
	      "description": "Original description.",
	      "technologies": ["Go"],
	      "icon": "tool",
	      "tagline": "Original",
	      "language": "Go",
	      "githubUrl": "https://github.com/example/existing-project",
	      "demoUrl": null,
	      "featured": false,
	      "displayOrder": 7
	    }
	  ]
	}`)
	proposed := []lib.ResumeProject{{
		Name:        "existing-project",
		Description: "Updated description.",
		Tagline:     "Go",
		GithubURL:   stringPtr("https://github.com/example/existing-project"),
	}}

	// When
	if err := generateProposals(root, proposed); err != nil {
		t.Fatalf("generate proposals: %v", err)
	}

	// Then
	proposedValue := readProposedProject(t, root, "github-update-existing-project.proposal.json")
	if got := proposedValue["id"]; got != "existing-project-id" {
		t.Fatalf("proposedValue.id = %v, want existing-project-id", got)
	}
}

func Test_generateProposals_assignsStableProjectID_whenAddingGitHubProject(t *testing.T) {
	// Given
	root := writeResumeFixture(t, `{
	  "personalProjects": [
	    {
	      "id": "existing-project-id",
	      "name": "existing-project",
	      "period": "2024.01",
	      "description": "Original description.",
	      "technologies": ["Go"],
	      "icon": "tool",
	      "tagline": "Original",
	      "language": "Go",
	      "githubUrl": "https://github.com/example/existing-project",
	      "demoUrl": null,
	      "featured": false,
	      "displayOrder": 7
	    }
	  ]
	}`)
	proposed := []lib.ResumeProject{{
		Name:        "My Cool_Repo!",
		Description: "Generated description.",
		Tagline:     "Go",
		GithubURL:   stringPtr("https://github.com/example/my-cool-repo"),
	}}

	// When
	if err := generateProposals(root, proposed); err != nil {
		t.Fatalf("generate proposals: %v", err)
	}

	// Then
	proposedValue := readProposedProject(t, root, "github-add-My Cool_Repo!.proposal.json")
	if got := proposedValue["id"]; got != "github-my-cool-repo" {
		t.Fatalf("proposedValue.id = %v, want github-my-cool-repo", got)
	}
}

func writeResumeFixture(t *testing.T, resumeJSON string) string {
	t.Helper()

	root := t.TempDir()
	resumePath := filepath.Join(root, lib.ResumePath)
	if err := os.MkdirAll(filepath.Dir(resumePath), 0o755); err != nil {
		t.Fatalf("create resume dir: %v", err)
	}
	if err := os.WriteFile(resumePath, []byte(resumeJSON), 0o644); err != nil {
		t.Fatalf("write resume fixture: %v", err)
	}

	return root
}

func readProposedProject(t *testing.T, root, filename string) map[string]any {
	t.Helper()

	path := filepath.Join(root, lib.ProposalDir, lib.ApprovedSubdir, filename)
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read proposal %s: %v", filename, err)
	}

	var proposal lib.Proposal
	if err := json.Unmarshal(data, &proposal); err != nil {
		t.Fatalf("parse proposal %s: %v", filename, err)
	}

	var proposedValue map[string]any
	if err := json.Unmarshal(proposal.ProposedValue, &proposedValue); err != nil {
		t.Fatalf("parse proposed value %s: %v", filename, err)
	}
	return proposedValue
}

func stringPtr(s string) *string {
	return &s
}
