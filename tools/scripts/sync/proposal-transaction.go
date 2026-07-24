package main

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

const proposalTransactionPath = "packages/data/proposals/.apply-proposals.transaction.json"

type proposalTransaction struct {
	OriginalResume string   `json:"originalResume"`
	ProposalPaths  []string `json:"proposalPaths"`
}

func applyApprovedProposals(root string, validate func(string) error) (bool, error) {
	if err := recoverProposalTransaction(root); err != nil {
		return false, err
	}
	resumeFile := filepath.Join(root, resumePath)
	originalResume, err := os.ReadFile(resumeFile)
	if err != nil {
		return false, err
	}
	var resume map[string]any
	if err := json.Unmarshal(originalResume, &resume); err != nil {
		return false, err
	}
	proposals, err := readApprovedProposals(filepath.Join(root, proposalDir))
	if err != nil {
		return false, err
	}
	if len(proposals) == 0 {
		return false, nil
	}
	masterRevision, err := hashJSONObject(resume)
	if err != nil {
		return false, err
	}
	for _, proposal := range proposals {
		if err := validateApprovedProposal(proposal, masterRevision); err != nil {
			return false, err
		}
	}
	for _, proposal := range proposals {
		if err := applyProposal(resume, proposal); err != nil {
			return false, fmt.Errorf("apply %s: %w", proposal.ID, err)
		}
	}
	if err := validateStagedProposal(root, resume, validate); err != nil {
		return false, err
	}
	if err := writeProposalTransaction(root, originalResume, proposals); err != nil {
		return false, err
	}
	if err := writeJSONObject(resumeFile, resume); err != nil {
		return false, rollbackProposalTransaction(root, "write", err)
	}
	if err := archiveProposals(root, proposals); err != nil {
		return false, rollbackProposalTransaction(root, "archive", err)
	}
	if err := removeProposalTransaction(root); err != nil {
		return false, rollbackProposalTransaction(root, "commit", err)
	}
	return true, nil
}

func validateStagedProposal(root string, resume map[string]any, validate func(string) error) error {
	stagingRoot, err := os.MkdirTemp(root, ".proposal-validation-*")
	if err != nil {
		return err
	}
	defer os.RemoveAll(stagingRoot)

	stagedResume := filepath.Join(stagingRoot, resumePath)
	if err := os.MkdirAll(filepath.Dir(stagedResume), 0o755); err != nil {
		return err
	}
	if err := writeJSONObject(stagedResume, resume); err != nil {
		return err
	}
	schema, err := os.ReadFile(filepath.Join(root, resumeSchemaPath))
	if err != nil && !os.IsNotExist(err) {
		return err
	}
	if err == nil {
		if err := os.WriteFile(filepath.Join(stagingRoot, resumeSchemaPath), schema, 0o644); err != nil {
			return err
		}
	}
	if err := os.Symlink(filepath.Join(root, "tools"), filepath.Join(stagingRoot, "tools")); err != nil {
		return err
	}
	return validate(stagingRoot)
}

func writeProposalTransaction(root string, originalResume []byte, proposals []approvedProposal) error {
	paths := make([]string, 0, len(proposals))
	for _, proposal := range proposals {
		relativePath, err := filepath.Rel(root, proposal.filePath)
		if err != nil {
			return err
		}
		if relativePath == ".." || len(relativePath) > 3 && relativePath[:3] == ".."+string(filepath.Separator) {
			return fmt.Errorf("proposal path is outside repository: %s", proposal.filePath)
		}
		paths = append(paths, filepath.ToSlash(relativePath))
	}
	transaction := proposalTransaction{
		OriginalResume: base64.StdEncoding.EncodeToString(originalResume),
		ProposalPaths:  paths,
	}
	content, err := json.Marshal(transaction)
	if err != nil {
		return err
	}
	return writeFileAtomic(filepath.Join(root, proposalTransactionPath), append(content, '\n'), 0o644)
}

func recoverProposalTransaction(root string) error {
	journalPath := filepath.Join(root, proposalTransactionPath)
	journal, err := os.ReadFile(journalPath)
	if os.IsNotExist(err) {
		return nil
	}
	if err != nil {
		return err
	}
	var transaction proposalTransaction
	if err := json.Unmarshal(journal, &transaction); err != nil {
		return err
	}
	originalResume, err := base64.StdEncoding.DecodeString(transaction.OriginalResume)
	if err != nil {
		return err
	}
	if err := writeFileAtomic(filepath.Join(root, resumePath), originalResume, 0o644); err != nil {
		return fmt.Errorf("restore SSoT: %w", err)
	}
	for _, proposalPath := range transaction.ProposalPaths {
		if err := restoreArchivedProposal(root, proposalPath); err != nil {
			return err
		}
	}
	return removeProposalTransaction(root)
}

func restoreArchivedProposal(root string, proposalPath string) error {
	approvedPath := filepath.Join(root, filepath.FromSlash(proposalPath))
	archivedPath := filepath.Join(root, appliedDir, filepath.Base(proposalPath))
	if _, err := os.Lstat(approvedPath); err == nil {
		if _, err := os.Lstat(archivedPath); err == nil {
			return fmt.Errorf("proposal exists in both approved and archive: %s", proposalPath)
		} else if !os.IsNotExist(err) {
			return err
		}
		return nil
	} else if !os.IsNotExist(err) {
		return err
	}
	if _, err := os.Lstat(archivedPath); err != nil {
		return fmt.Errorf("recover %s: %w", proposalPath, err)
	}
	if err := os.MkdirAll(filepath.Dir(approvedPath), 0o755); err != nil {
		return err
	}
	return os.Rename(archivedPath, approvedPath)
}

func removeProposalTransaction(root string) error {
	journalPath := filepath.Join(root, proposalTransactionPath)
	if err := os.Remove(journalPath); err != nil && !os.IsNotExist(err) {
		return err
	}
	directory, err := os.Open(filepath.Dir(journalPath))
	if err != nil {
		return err
	}
	defer directory.Close()
	return directory.Sync()
}

func rollbackProposalTransaction(root string, stage string, cause error) error {
	if err := recoverProposalTransaction(root); err != nil {
		return fmt.Errorf("%s failed: %w; transaction recovery: %v", stage, cause, err)
	}
	return fmt.Errorf("%s failed; restored SSoT: %w", stage, cause)
}
