package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

type Proposal struct {
	ID            string          `json:"id"`
	Status        string          `json:"status"`
	Target        ProposalTarget  `json:"target"`
	ProposedValue json.RawMessage `json:"proposedValue"`
}

type ProposalTarget struct {
	Path      string `json:"path"`
	Operation string `json:"operation"`
}

const resumePath = "packages/data/resumes/master/resume_data.json"
const proposalDir = "packages/data/proposals/approved"
const appliedDir = "packages/data/proposals/applied"

func main() {
	root, err := repoRoot()
	if err != nil {
		fatal(err)
	}

	resumeFile := filepath.Join(root, resumePath)
	resume, err := readJSONObject(resumeFile)
	if err != nil {
		fatal(err)
	}

	proposals, err := readApprovedProposals(filepath.Join(root, proposalDir))
	if err != nil {
		fatal(err)
	}
	if len(proposals) == 0 {
		fmt.Println("No approved proposals to apply.")
		return
	}

	backupPath, err := backupFile(resumeFile)
	if err != nil {
		fatal(err)
	}

	for _, proposal := range proposals {
		if err := applyProposal(resume, proposal); err != nil {
			fatal(fmt.Errorf("apply %s: %w", proposal.ID, err))
		}
	}

	content, err := json.MarshalIndent(resume, "", "  ")
	if err != nil {
		fatal(err)
	}
	content = append(content, '\n')
	if err := os.WriteFile(resumeFile, content, 0o644); err != nil {
		fatal(err)
	}

	if err := validateWithSchemas(root); err != nil {
		_ = os.WriteFile(resumeFile, mustRead(backupPath), 0o644)
		fatal(fmt.Errorf("validation failed; restored backup %s: %w", backupPath, err))
	}

	if err := os.MkdirAll(filepath.Join(root, appliedDir), 0o755); err != nil {
		fatal(err)
	}
	for _, proposal := range proposals {
		from := proposal.filePath
		to := filepath.Join(root, appliedDir, filepath.Base(from))
		if err := os.Rename(from, to); err != nil {
			fatal(err)
		}
	}

	fmt.Printf("Applied %d proposal(s). Backup: %s\n", len(proposals), backupPath)
}

type approvedProposal struct {
	Proposal
	filePath string
}

func repoRoot() (string, error) {
	cmd := exec.Command("git", "rev-parse", "--show-toplevel")
	out, err := cmd.Output()
	if err != nil {
		return os.Getwd()
	}
	return strings.TrimSpace(string(out)), nil
}

func readJSONObject(path string) (map[string]any, error) {
	var value map[string]any
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(data, &value); err != nil {
		return nil, err
	}
	return value, nil
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
		if proposal.Status != "approved" {
			return nil, fmt.Errorf("%s is not approved", path)
		}
		proposal.filePath = path
		proposals = append(proposals, proposal)
	}
	sort.Slice(proposals, func(i, j int) bool { return proposals[i].ID < proposals[j].ID })
	return proposals, nil
}

func applyProposal(root map[string]any, proposal approvedProposal) error {
	var proposed any
	if err := json.Unmarshal(proposal.ProposedValue, &proposed); err != nil {
		return err
	}

	switch proposal.Target.Operation {
	case "add":
		return addAtPointer(root, proposal.Target.Path, proposed)
	case "replace":
		return replaceAtPointer(root, proposal.Target.Path, proposed)
	default:
		return fmt.Errorf("unsupported operation %q", proposal.Target.Operation)
	}
}

func addAtPointer(root map[string]any, pointer string, value any) error {
	parent, key, err := pointerParent(root, pointer)
	if err != nil {
		return err
	}
	if key == "-" {
		array, ok := parent.container.([]any)
		if !ok {
			return fmt.Errorf("target parent is not an array: %s", pointer)
		}
		array = append(array, value)
		return parent.assign(array)
	}
	object, ok := parent.container.(map[string]any)
	if !ok {
		return fmt.Errorf("target parent is not an object: %s", pointer)
	}
	object[key] = value
	return nil
}

func replaceAtPointer(root map[string]any, pointer string, value any) error {
	parent, key, err := pointerParent(root, pointer)
	if err != nil {
		return err
	}
	object, ok := parent.container.(map[string]any)
	if !ok {
		return fmt.Errorf("replace parent is not an object: %s", pointer)
	}
	object[key] = value
	return nil
}

type pointerParentRef struct {
	container any
	assign    func(any) error
}

func pointerParent(root map[string]any, pointer string) (pointerParentRef, string, error) {
	parts := strings.Split(strings.TrimPrefix(pointer, "/"), "/")
	if len(parts) == 0 || parts[0] == "" {
		return pointerParentRef{}, "", fmt.Errorf("invalid pointer %q", pointer)
	}
	for i := range parts {
		parts[i] = strings.ReplaceAll(strings.ReplaceAll(parts[i], "~1", "/"), "~0", "~")
	}

	var current any = root
	var parentObject map[string]any
	var parentKey string
	for _, part := range parts[:len(parts)-1] {
		object, ok := current.(map[string]any)
		if !ok {
			return pointerParentRef{}, "", fmt.Errorf("non-object path segment %q", part)
		}
		next, ok := object[part]
		if !ok {
			return pointerParentRef{}, "", fmt.Errorf("missing path segment %q", part)
		}
		parentObject = object
		parentKey = part
		current = next
	}

	return pointerParentRef{container: current, assign: func(value any) error {
		if parentObject == nil {
			return fmt.Errorf("cannot replace root container")
		}
		parentObject[parentKey] = value
		return nil
	}}, parts[len(parts)-1], nil
}

func backupFile(path string) (string, error) {
	backup := fmt.Sprintf("%s.backup.%s", path, time.Now().UTC().Format("20060102T150405Z"))
	return backup, os.WriteFile(backup, mustRead(path), 0o644)
}

func validateWithSchemas(root string) error {
	script := `import { readFileSync } from 'fs';
import { resumeSchema } from '@resume/schemas/resume';
const data = JSON.parse(readFileSync('packages/data/resumes/master/resume_data.json', 'utf8'));
const skills = Object.values(data.skills || {}).flatMap((category) => category.items || []);
const result = resumeSchema.safeParse({ ...data, skills });
if (!result.success) {
  console.error(result.error.message);
  process.exit(1);
}`
	cmd := exec.Command("node", "--input-type=module", "-e", script)
	cmd.Dir = root
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("@resume/schemas validation: %s", strings.TrimSpace(stderr.String()))
	}
	cmd = exec.Command("node", "tools/scripts/utils/validate-resume-data.js")
	cmd.Dir = root
	stderr.Reset()
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("canonical schema validation: %s", strings.TrimSpace(stderr.String()))
	}
	return nil
}

func mustRead(path string) []byte {
	data, err := os.ReadFile(path)
	if err != nil {
		fatal(err)
	}
	return data
}

func fatal(err error) {
	fmt.Fprintln(os.Stderr, err)
	os.Exit(1)
}
