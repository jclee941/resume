package main

import (
	"fmt"
	"os"
	"os/exec"
)

func checkPrerequisites() error {
	// Check Docker
	if _, err := exec.LookPath("docker"); err != nil {
		return fmt.Errorf("docker not found in PATH")
	}

	// Check curl
	if _, err := exec.LookPath("curl"); err != nil {
		return fmt.Errorf("curl not found in PATH")
	}

	// Check jq
	if _, err := exec.LookPath("jq"); err != nil {
		return fmt.Errorf("jq not found in PATH")
	}

	// Check if .gitlab-ci.yml exists
	if _, err := os.Stat(".gitlab-ci.yml"); os.IsNotExist(err) {
		return fmt.Errorf(".gitlab-ci.yml not found in current directory")
	}

	return nil
}
