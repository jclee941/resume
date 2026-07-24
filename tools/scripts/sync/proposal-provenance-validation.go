package main

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"reflect"
	"sort"
	"strings"
)

var hashedProposalFields = []string{
	"allowedChanges",
	"confidence",
	"createdAt",
	"currentValue",
	"evidence",
	"id",
	"masterRevision",
	"notes",
	"proposedValue",
	"rejectedChanges",
	"source",
	"sourceRefs",
	"status",
	"target",
	"version",
}

func validateApprovedProposal(proposal approvedProposal, masterRevision string) error {
	if proposal.MasterRevision != masterRevision {
		return fmt.Errorf("proposal %s: master revision mismatch", proposal.ID)
	}
	actualHash, err := proposalHash(proposal)
	if err != nil {
		return fmt.Errorf("proposal %s: hash payload: %w", proposal.ID, err)
	}
	if proposal.ProposalHash != actualHash {
		return fmt.Errorf("proposal %s: proposal hash mismatch", proposal.ID)
	}
	if len(proposal.SourceRefs) == 0 || len(proposal.AllowedChanges) == 0 {
		return fmt.Errorf("proposal %s: source references and allowed changes are required", proposal.ID)
	}
	for _, sourceRef := range proposal.SourceRefs {
		if (sourceRef.Type != "crawler-job" && sourceRef.Type != "enrichment") || sourceRef.Crawler == "" || sourceRef.Platform == "" || sourceRef.JobID == "" {
			return fmt.Errorf("proposal %s: invalid source reference", proposal.ID)
		}
	}
	if len(proposal.AllowedChanges) != 1 || !sameProposalChange(proposal, proposal.AllowedChanges[0]) {
		return fmt.Errorf("proposal %s: allowed changes must exactly match the reviewed change", proposal.ID)
	}
	for _, change := range proposal.AllowedChanges {
		if change.Target.ResumePath != resumePath {
			return fmt.Errorf("proposal %s: unsupported resume path %q", proposal.ID, change.Target.ResumePath)
		}
		if change.Target.Path == "" || (change.Target.Operation != "add" && change.Target.Operation != "replace") {
			return fmt.Errorf("proposal %s: invalid allowed change target", proposal.ID)
		}
		if !json.Valid(change.ProposedValue) {
			return fmt.Errorf("proposal %s: invalid allowed change value", proposal.ID)
		}
	}
	return nil
}

func sameProposalChange(proposal approvedProposal, change ProposalChange) bool {
	if proposal.Target != change.Target {
		return false
	}
	var proposedValue any
	var allowedValue any
	if json.Unmarshal(proposal.ProposedValue, &proposedValue) != nil || json.Unmarshal(change.ProposedValue, &allowedValue) != nil {
		return false
	}
	return reflect.DeepEqual(proposedValue, allowedValue)
}

func proposalHash(proposal approvedProposal) (string, error) {
	payload := make(map[string]any, len(hashedProposalFields))
	for _, field := range hashedProposalFields {
		value, ok := proposal.raw[field]
		if !ok {
			return "", fmt.Errorf("missing %s", field)
		}
		payload[field] = value
	}
	return hashJSONObject(payload)
}

func hashJSONObject(value map[string]any) (string, error) {
	canonical, err := canonicalJSON(value)
	if err != nil {
		return "", err
	}
	sum := sha256.Sum256(canonical)
	return hex.EncodeToString(sum[:]), nil
}

func canonicalJSON(value any) ([]byte, error) {
	var output bytes.Buffer
	if err := writeCanonicalJSON(&output, value); err != nil {
		return nil, err
	}
	return output.Bytes(), nil
}

func writeCanonicalJSON(output *bytes.Buffer, value any) error {
	switch typed := value.(type) {
	case nil, bool, float64:
		encoded, err := json.Marshal(typed)
		if err != nil {
			return err
		}
		output.Write(encoded)
	case string:
		if err := writeJSONString(output, typed); err != nil {
			return err
		}
	case []any:
		output.WriteByte('[')
		for index, item := range typed {
			if index > 0 {
				output.WriteByte(',')
			}
			if err := writeCanonicalJSON(output, item); err != nil {
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
			if err := writeJSONString(output, key); err != nil {
				return err
			}
			output.WriteByte(':')
			if err := writeCanonicalJSON(output, typed[key]); err != nil {
				return err
			}
		}
		output.WriteByte('}')
	default:
		return fmt.Errorf("unsupported canonical JSON value %T", value)
	}
	return nil
}

func writeJSONString(output *bytes.Buffer, value string) error {
	var encoded bytes.Buffer
	encoder := json.NewEncoder(&encoded)
	encoder.SetEscapeHTML(false)
	if err := encoder.Encode(value); err != nil {
		return err
	}
	output.WriteString(strings.TrimSuffix(encoded.String(), "\n"))
	return nil
}
