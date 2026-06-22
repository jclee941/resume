package main

import (
	"fmt"
	"os"
	"os/exec"
	"strings"
)

func printVersion(command, label string) {
	version := runCapture(command, []string{"--version"})
	if version == "N/A" {
		fmt.Printf("❌ %s이 설치되어 있지 않습니다\n", label)
	} else {
		fmt.Printf("✅ %s: %s\n", label, version)
	}
}

func runCapture(command string, args []string) string {
	cmd := exec.Command(command, args...)
	out, err := cmd.Output()
	if err != nil {
		return "N/A"
	}
	return strings.TrimSpace(string(out))
}

func runNodeCapture(dir string, args ...string) string {
	cmd := exec.Command("node", args...)
	cmd.Dir = dir
	cmd.Stderr = os.Stderr
	out, err := cmd.Output()
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			os.Exit(exitErr.ExitCode())
		}
		panic(err)
	}
	return string(out)
}
