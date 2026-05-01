// Auto-apply runner - runs directly on resume host, bypassing n8n
package main

import (
	"bufio"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
	"time"
)

const (
	logFile   = "/home/jclee/.opencode/logs/auto-apply.log"
	lockFile  = "/tmp/auto-apply.lock"
	resumeDir = "/home/jclee/dev/resume"
)

func main() {
	fmt.Println("=== Auto-Apply Direct Runner ===")
	fmt.Printf("Started at: %s\n", time.Now().Format(time.RFC3339))

	// Create log directory
	logDir := filepath.Dir(logFile)
	if err := os.MkdirAll(logDir, 0755); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to create log directory: %v\n", err)
		os.Exit(1)
	}

	// Check lock
	if err := checkLock(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	// Create lock
	if err := writeLock(); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to create lock file: %v\n", err)
		os.Exit(1)
	}

	// Cleanup on exit
	defer os.Remove(lockFile)

	// Run auto-apply
	exitCode := runAutoApply()
	if exitCode != 0 {
		fmt.Fprintf(os.Stderr, "❌ Auto-apply failed with exit code %d at %s\n", exitCode, time.Now().Format(time.RFC3339))
		os.Exit(exitCode)
	}

	fmt.Printf("✅ Auto-apply completed successfully at %s\n", time.Now().Format(time.RFC3339))
	os.Exit(0)
}

func checkLock() error {
	if _, err := os.Stat(lockFile); os.IsNotExist(err) {
		return nil
	}

	file, err := os.Open(lockFile)
	if err != nil {
		return nil // Can't read lock, proceed
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	if scanner.Scan() {
		pid := strings.TrimSpace(scanner.Text())
		if pid == "" {
			return nil
		}

		// Check if process is running by sending signal 0
		err = syscall.Kill(pidToInt(pid), 0)
		if err == nil {
			return fmt.Errorf("Another instance is running (PID: %s)", pid)
		}
	}

	return nil
}

func pidToInt(s string) int {
	var pid int
	for _, c := range s {
		if c >= '0' && c <= '9' {
			pid = pid*10 + int(c-'0')
		}
	}
	return pid
}

func writeLock() error {
	file, err := os.OpenFile(lockFile, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0644)
	if err != nil {
		return err
	}
	defer file.Close()

	_, err = fmt.Fprintf(file, "%d", os.Getpid())
	return err
}

func runAutoApply() int {
	cmd := exec.Command("node", "src/auto-apply/cli.js", "apply", "--max=5")
	cmd.Dir = filepath.Join(resumeDir, "apps/job-server")

	// Set up pipes for stdout/stderr
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to create stdout pipe: %v\n", err)
		return 1
	}
	stderr, err := cmd.StderrPipe()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to create stderr pipe: %v\n", err)
		return 1
	}

	// Open log file for appending
	logFh, err := os.OpenFile(logFile, os.O_WRONLY|os.O_CREATE|os.O_APPEND, 0644)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to open log file: %v\n", err)
		return 1
	}
	defer logFh.Close()

	// Start command
	if err := cmd.Start(); err != nil {
		fmt.Fprintf(os.Stderr, "failed to start node: %v\n", err)
		return 1
	}

	// Tee stdout
	go func() {
		scanner := bufio.NewScanner(stdout)
		for scanner.Scan() {
			line := scanner.Text() + "\n"
			os.Stdout.WriteString(line)
			logFh.WriteString(line)
		}
	}()

	// Tee stderr
	go func() {
		scanner := bufio.NewScanner(stderr)
		for scanner.Scan() {
			line := scanner.Text() + "\n"
			os.Stderr.WriteString(line)
			logFh.WriteString(line)
		}
	}()

	// Wait for command
	err = cmd.Wait()
	if err == nil {
		return 0
	}

	if exitErr, ok := err.(*exec.ExitError); ok {
		return exitErr.ExitCode()
	}
	return 1
}
