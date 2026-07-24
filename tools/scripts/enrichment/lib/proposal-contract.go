package lib

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"sort"
	"strings"
	"time"
)

var proposalHashFields = []string{
	"allowedChanges", "confidence", "createdAt", "currentValue", "evidence", "id", "masterRevision",
	"notes", "proposedValue", "rejectedChanges", "source", "sourceRefs", "status", "target", "version",
}

func newProposal(source, id string, target ProposalTarget, value any, evidence string, resume map[string]any) (Proposal, error) {
	proposedValue, err := json.Marshal(value)
	if err != nil {
		return Proposal{}, fmt.Errorf("marshal proposed value: %w", err)
	}
	masterRevision, err := hashProposalValue(resume)
	if err != nil {
		return Proposal{}, err
	}
	target.ResumePath = ResumePath
	sourceRecord := ProposalSource{Crawler: "enrichment", Platform: source, JobID: id}
	proposal := Proposal{
		Version: 1, ID: id, Status: "pending", CreatedAt: time.Now().UTC().Format(time.RFC3339Nano),
		Source: sourceRecord, Target: target, ProposedValue: proposedValue, CurrentValue: nil, Confidence: 0,
		Evidence: []ProposalEvidence{{Type: "enrichment", Text: evidence}}, Notes: "Human review is required before applying to SSoT.",
		MasterRevision: masterRevision, SourceRefs: []SourceRef{{Type: "enrichment", Crawler: sourceRecord.Crawler, Platform: source, JobID: id}},
		AllowedChanges: []ProposalChange{{Target: target, ProposedValue: proposedValue}}, RejectedChanges: []ProposalChange{},
	}
	proposalHash, err := hashProposal(proposal)
	if err != nil {
		return Proposal{}, err
	}
	proposal.ProposalHash = proposalHash
	return proposal, nil
}

func hashProposal(proposal Proposal) (string, error) {
	encoded, err := json.Marshal(proposal)
	if err != nil {
		return "", err
	}
	var document map[string]any
	if err := json.Unmarshal(encoded, &document); err != nil {
		return "", err
	}
	payload := make(map[string]any, len(proposalHashFields))
	for _, field := range proposalHashFields {
		payload[field] = document[field]
	}
	return hashProposalValue(payload)
}

func hashProposalValue(value any) (string, error) {
	canonical, err := canonicalProposalJSON(value)
	if err != nil {
		return "", err
	}
	sum := sha256.Sum256(canonical)
	return hex.EncodeToString(sum[:]), nil
}

func canonicalProposalJSON(value any) ([]byte, error) {
	var output bytes.Buffer
	if err := writeCanonicalProposalJSON(&output, value); err != nil {
		return nil, err
	}
	return output.Bytes(), nil
}

func writeCanonicalProposalJSON(output *bytes.Buffer, value any) error {
	switch typed := value.(type) {
	case nil, bool, float64:
		encoded, err := json.Marshal(typed)
		if err != nil {
			return err
		}
		output.Write(encoded)
	case string:
		if err := writeProposalJSONString(output, typed); err != nil {
			return err
		}
	case []any:
		output.WriteByte('[')
		for index, item := range typed {
			if index > 0 {
				output.WriteByte(',')
			}
			if err := writeCanonicalProposalJSON(output, item); err != nil {
				return err
			}
		}
		output.WriteByte(']')
	case map[string]any:
		keys := make([]string, 0, len(typed))
		for key := range typed {
			keys = append(keys, key)
		}
		sort.Strings(keys)
		output.WriteByte('{')
		for index, key := range keys {
			if index > 0 {
				output.WriteByte(',')
			}
			if err := writeProposalJSONString(output, key); err != nil {
				return err
			}
			output.WriteByte(':')
			if err := writeCanonicalProposalJSON(output, typed[key]); err != nil {
				return err
			}
		}
		output.WriteByte('}')
	default:
		return fmt.Errorf("unsupported canonical JSON value %T", value)
	}
	return nil
}

func writeProposalJSONString(output *bytes.Buffer, value string) error {
	var encoded bytes.Buffer
	encoder := json.NewEncoder(&encoded)
	encoder.SetEscapeHTML(false)
	if err := encoder.Encode(value); err != nil {
		return err
	}
	output.WriteString(strings.TrimSuffix(encoded.String(), "\n"))
	return nil
}
