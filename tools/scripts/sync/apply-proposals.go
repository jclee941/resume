package main

import (
	"fmt"
	"os"
	"os/exec"
	"strings"
)

const resumePath = "packages/data/resumes/master/resume_data.json"
const resumeSchemaPath = "packages/data/resumes/master/resume_schema.json"
const proposalDir = "packages/data/proposals/approved"
const appliedDir = "packages/data/proposals/applied"

func main() {
	root, err := repoRoot()
	if err != nil {
		fatal(err)
	}

	applied, err := applyApprovedProposals(root, validateCanonicalResume)
	if err != nil {
		fatal(err)
	}
	if !applied {
		fmt.Println("No approved proposals to apply.")
		return
	}
	fmt.Println("Applied approved proposals.")
}

func repoRoot() (string, error) {
	cmd := exec.Command("git", "rev-parse", "--show-toplevel")
	out, err := cmd.Output()
	if err != nil {
		return os.Getwd()
	}
	return strings.TrimSpace(string(out)), nil
}

func fatal(err error) {
	fmt.Fprintln(os.Stderr, err)
	os.Exit(1)
}
