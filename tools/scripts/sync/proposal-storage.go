package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

func readJSONObject(path string) (map[string]any, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var value map[string]any
	if err := json.Unmarshal(data, &value); err != nil {
		return nil, err
	}
	return value, nil
}

func writeJSONObject(path string, value map[string]any) error {
	content, err := json.MarshalIndent(value, "", "  ")
	if err != nil {
		return err
	}
	return writeFileAtomic(path, append(content, '\n'), 0o644)
}

func writeFileAtomic(path string, content []byte, mode os.FileMode) error {
	directory := filepath.Dir(path)
	temporary, err := os.CreateTemp(directory, "."+filepath.Base(path)+".tmp-*")
	if err != nil {
		return err
	}
	temporaryPath := temporary.Name()
	defer os.Remove(temporaryPath)
	defer temporary.Close()

	if err := temporary.Chmod(mode); err != nil {
		return err
	}
	if _, err := temporary.Write(content); err != nil {
		return err
	}
	if err := temporary.Sync(); err != nil {
		return err
	}
	if err := temporary.Close(); err != nil {
		return err
	}
	if err := os.Rename(temporaryPath, path); err != nil {
		return err
	}

	directoryHandle, err := os.Open(directory)
	if err != nil {
		return err
	}
	defer directoryHandle.Close()
	return directoryHandle.Sync()
}

func readApprovedProposals(dir string) ([]approvedProposal, error) {
	entries, err := os.ReadDir(dir)
	if errors.Is(err, os.ErrNotExist) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	var proposals []approvedProposal
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".proposal.json") {
			continue
		}
		path := filepath.Join(dir, entry.Name())
		data, err := os.ReadFile(path)
		if err != nil {
			return nil, err
		}
		var proposal approvedProposal
		if err := json.Unmarshal(data, &proposal); err != nil {
			return nil, err
		}
		if err := json.Unmarshal(data, &proposal.raw); err != nil {
			return nil, err
		}
		if proposal.Status != "approved" {
			return nil, fmt.Errorf("%s is not approved", path)
		}
		proposal.filePath = path
		proposals = append(proposals, proposal)
	}
	sort.Slice(proposals, func(first, second int) bool { return proposals[first].ID < proposals[second].ID })
	return proposals, nil
}

func archiveProposals(root string, proposals []approvedProposal) error {
	if err := os.MkdirAll(filepath.Join(root, appliedDir), 0o755); err != nil {
		return err
	}
	moved := make([]approvedProposal, 0, len(proposals))
	for _, proposal := range proposals {
		to := filepath.Join(root, appliedDir, filepath.Base(proposal.filePath))
		if _, err := os.Lstat(to); err == nil {
			return restoreArchivedProposals(root, moved, fmt.Errorf("archive destination exists: %s", to))
		} else if !errors.Is(err, os.ErrNotExist) {
			return restoreArchivedProposals(root, moved, err)
		}
		if err := os.Rename(proposal.filePath, to); err != nil {
			return restoreArchivedProposals(root, moved, err)
		}
		moved = append(moved, proposal)
	}
	return nil
}

func restoreArchivedProposals(root string, moved []approvedProposal, cause error) error {
	for index := len(moved) - 1; index >= 0; index-- {
		proposal := moved[index]
		archived := filepath.Join(root, appliedDir, filepath.Base(proposal.filePath))
		if err := os.Rename(archived, proposal.filePath); err != nil {
			return fmt.Errorf("archive failed: %w; restore %s: %v", cause, proposal.filePath, err)
		}
	}
	return cause
}
