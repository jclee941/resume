package main

import "encoding/json"

type Proposal struct {
	ID              string           `json:"id"`
	Status          string           `json:"status"`
	Target          ProposalTarget   `json:"target"`
	ProposedValue   json.RawMessage  `json:"proposedValue"`
	MasterRevision  string           `json:"masterRevision"`
	ProposalHash    string           `json:"proposalHash"`
	SourceRefs      []SourceRef      `json:"sourceRefs"`
	AllowedChanges  []ProposalChange `json:"allowedChanges"`
	RejectedChanges []ProposalChange `json:"rejectedChanges"`
}

type ProposalTarget struct {
	ResumePath string `json:"resumePath"`
	Path       string `json:"path"`
	Operation  string `json:"operation"`
}

type ProposalChange struct {
	Target        ProposalTarget  `json:"target"`
	ProposedValue json.RawMessage `json:"proposedValue"`
}

type SourceRef struct {
	Type     string  `json:"type"`
	Crawler  string  `json:"crawler"`
	Platform string  `json:"platform"`
	JobID    string  `json:"jobId"`
	URL      *string `json:"url"`
}

type approvedProposal struct {
	Proposal
	filePath string
	raw      map[string]any
}
