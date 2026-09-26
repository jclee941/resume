package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

func resolveRepoRoot() (string, error) {
	cwd, err := os.Getwd()
	if err != nil {
		return "", err
	}
	// If already at repo root (or below tools/scripts), walk up until we find a marker
	dir := cwd
	for {
		if _, err := os.Stat(filepath.Join(dir, "package.json")); err == nil {
			return dir, nil
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}
	return cwd, nil
}

func sshMkdir(host, user, keyPath, remoteDir string, dryRun bool) error {
	cmdStr := fmt.Sprintf("mkdir -p %s", remoteDir)
	return sshRun(host, user, keyPath, cmdStr, dryRun)
}

func scpFile(localPath, host, user, keyPath, remotePath string, dryRun bool) error {
	if dryRun {
		infof("[dry-run] would scp %s → %s:%s", localPath, host, remotePath)
		return nil
	}
	cmd := exec.Command("scp", "-i", keyPath, "-o", "StrictHostKeyChecking=no", "-o", "UserKnownHostsFile=/dev/null", localPath, fmt.Sprintf("%s@%s:%s", user, host, remotePath))
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

func sshRun(host, user, keyPath, command string, dryRun bool) error {
	if dryRun {
		infof("[dry-run] would ssh %s@%s '%s'", user, host, command)
		return nil
	}
	cmd := exec.Command("ssh", "-i", keyPath, "-o", "StrictHostKeyChecking=no", "-o", "UserKnownHostsFile=/dev/null", fmt.Sprintf("%s@%s", user, host), command)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

func sshOutput(host, user, keyPath, command string) (string, error) {
	cmd := exec.Command("ssh", "-i", keyPath, "-o", "StrictHostKeyChecking=no", "-o", "UserKnownHostsFile=/dev/null", fmt.Sprintf("%s@%s", user, host), command)
	out, err := cmd.CombinedOutput()
	return string(out), err
}

func copyComposeAdjusted(sourcePath, host, user, keyPath, remotePath string, dryRun bool) error {
	data, err := os.ReadFile(sourcePath)
	if err != nil {
		return err
	}
	// Rewrite relative volume paths from ../configs/ to ./configs/
	adjusted := strings.ReplaceAll(string(data), "../configs/", "./configs/")
	// Also rewrite the reference comment about deployment path
	adjusted = strings.ReplaceAll(adjusted, "docker-compose.monitoring.yml", "docker-compose.yml")

	tmpFile, err := os.CreateTemp("", "docker-compose-*.yml")
	if err != nil {
		return err
	}
	defer os.Remove(tmpFile.Name())

	if _, err := tmpFile.WriteString(adjusted); err != nil {
		tmpFile.Close()
		return err
	}
	tmpFile.Close()

	return scpFile(tmpFile.Name(), host, user, keyPath, remotePath, dryRun)
}

func printHeader(host, remoteDir string) {
	fmt.Printf("%sMonitoring Stack Deployment%s\n", colorBlue, colorReset)
	fmt.Printf("target host: %s\n", host)
	fmt.Printf("remote dir:  %s\n\n", remoteDir)
}

func infof(format string, args ...any) {
	fmt.Printf("%s[INFO]%s %s\n", colorBlue, colorReset, fmt.Sprintf(format, args...))
}

func okf(format string, args ...any) {
	fmt.Printf("%s[OK]%s   %s\n", colorGreen, colorReset, fmt.Sprintf(format, args...))
}

func warnf(format string, args ...any) {
	fmt.Printf("%s[WARN]%s %s\n", colorYellow, colorReset, fmt.Sprintf(format, args...))
}

func fatalf(format string, args ...any) {
	fmt.Printf("%s[FATAL]%s %s\n", colorRed, colorReset, fmt.Sprintf(format, args...))
	os.Exit(1)
}
