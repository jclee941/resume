// Package lib provides shared utilities for resume enrichment providers.
package lib

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

const (
	ResumePath     = "packages/data/resumes/master/resume_data.json"
	ProposalDir    = "packages/data/proposals"
	ApprovedSubdir = "approved"
)

// Proposal represents a proposed change to the resume SSoT.
type Proposal struct {
	Version         int                `json:"version"`
	ID              string             `json:"id"`
	Status          string             `json:"status"`
	CreatedAt       string             `json:"createdAt"`
	Source          ProposalSource     `json:"source"`
	Target          ProposalTarget     `json:"target"`
	ProposedValue   json.RawMessage    `json:"proposedValue"`
	CurrentValue    any                `json:"currentValue"`
	Confidence      float64            `json:"confidence"`
	Evidence        []ProposalEvidence `json:"evidence"`
	Notes           string             `json:"notes"`
	MasterRevision  string             `json:"masterRevision"`
	ProposalHash    string             `json:"proposalHash"`
	SourceRefs      []SourceRef        `json:"sourceRefs"`
	AllowedChanges  []ProposalChange   `json:"allowedChanges"`
	RejectedChanges []ProposalChange   `json:"rejectedChanges"`
}

type ProposalSource struct {
	Crawler  string  `json:"crawler"`
	Platform string  `json:"platform"`
	JobID    string  `json:"jobId"`
	URL      *string `json:"url"`
}

type SourceRef struct {
	Type     string  `json:"type"`
	Crawler  string  `json:"crawler"`
	Platform string  `json:"platform"`
	JobID    string  `json:"jobId"`
	URL      *string `json:"url"`
}

type ProposalEvidence struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

type ProposalChange struct {
	Target        ProposalTarget  `json:"target"`
	ProposedValue json.RawMessage `json:"proposedValue"`
}

// ProposalTarget identifies where and how to apply a proposal.
type ProposalTarget struct {
	ResumePath string `json:"resumePath"`
	Path       string `json:"path"`
	Operation  string `json:"operation"`
}

// WriteProposal writes a proposal to the pending proposals directory.
func WriteProposal(root, source, id string, target ProposalTarget, value any, evidence string) error {
	resume, err := ReadResume(root)
	if err != nil {
		return err
	}
	proposal, err := newProposal(source, id, target, value, evidence, resume)
	if err != nil {
		return err
	}

	data, err := json.MarshalIndent(proposal, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal proposal: %w", err)
	}
	data = append(data, '\n')

	pendingDir := filepath.Join(root, ProposalDir)
	if err := os.MkdirAll(pendingDir, 0o755); err != nil {
		return fmt.Errorf("create proposal dir: %w", err)
	}

	filename := fmt.Sprintf("%s-%s.proposal.json", source, id)
	path := filepath.Join(pendingDir, filename)
	if err := os.WriteFile(path, data, 0o644); err != nil {
		return fmt.Errorf("write proposal file: %w", err)
	}

	fmt.Printf("[OK] Proposal written: %s\n", path)
	return nil
}

// ReadResume reads the resume SSoT as a generic map.
func ReadResume(root string) (map[string]any, error) {
	path := filepath.Join(root, ResumePath)
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read resume: %w", err)
	}
	var resume map[string]any
	if err := json.Unmarshal(data, &resume); err != nil {
		return nil, fmt.Errorf("parse resume: %w", err)
	}
	return resume, nil
}

// ReadResumeTyped reads the resume SSoT into the provided value.
func ReadResumeTyped(root string, v any) error {
	path := filepath.Join(root, ResumePath)
	data, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("read resume: %w", err)
	}
	if err := json.Unmarshal(data, v); err != nil {
		return fmt.Errorf("parse resume: %w", err)
	}
	return nil
}

// RepoRoot returns the repository root directory using git.
func RepoRoot() (string, error) {
	wd, err := os.Getwd()
	if err != nil {
		return "", fmt.Errorf("get working directory: %w", err)
	}

	// Walk upward looking for .git
	for dir := wd; dir != "/"; dir = filepath.Dir(dir) {
		if _, err := os.Stat(filepath.Join(dir, ".git")); err == nil {
			return dir, nil
		}
	}

	// Final fallback
	return wd, nil
}

// Fatal prints an error message to stderr and exits with code 1.
func Fatal(err error) {
	fmt.Fprintf(os.Stderr, "[FATAL] %v\n", err)
	os.Exit(1)
}

// Fatalf formats and prints a message to stderr and exits with code 1.
func Fatalf(format string, args ...any) {
	fmt.Fprintf(os.Stderr, "[FATAL] "+format+"\n", args...)
	os.Exit(1)
}

// Infof prints an informational message.
func Infof(format string, args ...any) {
	fmt.Printf("[INFO] "+format+"\n", args...)
}

// Warnf prints a warning message.
func Warnf(format string, args ...any) {
	fmt.Printf("[WARN] "+format+"\n", args...)
}

// SnakeToTitle converts a snake_case string to Title Case.
func SnakeToTitle(s string) string {
	parts := strings.Split(s, "_")
	for i, p := range parts {
		if len(p) > 0 {
			parts[i] = strings.ToUpper(p[:1]) + p[1:]
		}
	}
	return strings.Join(parts, " ")
}
