package main

import (
	"bytes"
	"fmt"
	"os/exec"
	"strings"
)

func validateCanonicalResume(root string) error {
	cmd := exec.Command("node", "tools/scripts/utils/validate-resume-data.js", resumePath)
	cmd.Dir = root
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("canonical schema validation: %s", strings.TrimSpace(stderr.String()))
	}
	return nil
}
