package main

import (
	"bufio"
	"fmt"
	"os"
	"os/exec"
	"strings"
	"time"
)

const (
	sessionName = "resume-deploy"
	windowName  = "main"
)

const (
	BLUE  = "\033[0;34m"
	GREEN = "\033[0;32m"
	RED   = "\033[0;31m"
	NC    = "\033[0m"
)

func runCommand(name string, args ...string) (string, error) {
	cmd := exec.Command(name, args...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return "", err
	}
	return string(output), nil
}

func sessionExists() bool {
	_, err := runCommand("tmux", "has-session", "-t", sessionName)
	return err == nil
}

func attachSession() {
	fmt.Printf("%s🔗 Attaching to session...%s\n", BLUE, NC)
	fmt.Println("   Press 'Ctrl+B, D' to detach")
	time.Sleep(1 * time.Second)
	cmd := exec.Command("tmux", "attach", "-t", sessionName)
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Run()
}

func streamOutput() {
	reader := bufio.NewReader(os.Stdin)
	fmt.Printf("%s📡 Streaming output (Ctrl+C to stop)...%s\n\n", BLUE, NC)

	for {
		clearCmd := exec.Command("clear")
		clearCmd.Stdout = os.Stdout
		clearCmd.Run()

		fmt.Printf("%s=== Resume Deployment Stream ===%s\n", BLUE, NC)
		fmt.Printf("Session: %s | %s\n\n", sessionName, time.Now().Format("2006-01-02 15:04:05"))

		output, _ := runCommand("tmux", "capture-pane", "-t", fmt.Sprintf("%s:%s", sessionName, windowName), "-p", "-S", "-30")
		fmt.Println(output)

		select {
		case <-time.After(2 * time.Second):
		case <-waitForInterrupt(reader):
			return
		}
	}
}

func waitForInterrupt(reader *bufio.Reader) chan struct{} {
	done := make(chan struct{})
	go func() {
		reader.ReadByte()
		close(done)
	}()
	return done
}

func getSnapshot() {
	fmt.Printf("%s📸 Current status snapshot:%s\n\n", BLUE, NC)
	output, _ := runCommand("tmux", "capture-pane", "-t", fmt.Sprintf("%s:%s", sessionName, windowName), "-p", "-S", "-50")
	fmt.Println(output)
}

func searchLogs() {
	fmt.Printf("%s🔍 Searching for errors in logs...%s\n\n", BLUE, NC)

	output, err := runCommand("tmux", "capture-pane", "-t", fmt.Sprintf("%s:%s", sessionName, windowName), "-p")
	if err != nil {
		fmt.Printf("%s❌ Failed to capture pane: %v%s\n", RED, err, NC)
		return
	}

	lines := strings.Split(output, "\n")
	var errors, warnings []string
	for _, line := range lines {
		lower := strings.ToLower(line)
		if strings.Contains(lower, "error") || strings.Contains(lower, "failed") || strings.Contains(lower, "fatal") {
			errors = append(errors, line)
		}
		if strings.Contains(lower, "warning") || strings.Contains(lower, "warn") {
			warnings = append(warnings, line)
		}
	}

	fmt.Println()
	if len(errors) > 0 {
		fmt.Printf("%sFound errors:%s\n", RED, NC)
		for _, e := range errors {
			fmt.Println(e)
		}
	} else {
		fmt.Printf("%s✅ No errors found in logs%s\n", GREEN, NC)
	}

	fmt.Println()
	if len(warnings) > 0 {
		fmt.Printf("%sWarnings found:%s\n", BLUE, NC)
		for _, w := range warnings {
			fmt.Println(w)
		}
	} else {
		fmt.Printf("%s✅ No warnings found%s\n", GREEN, NC)
	}
}

func main() {
	fmt.Printf("%s📺 Resume Deployment Monitor%s\n\n", BLUE, NC)

	if !sessionExists() {
		fmt.Printf("%s❌ Session '%s' not found%s\n\n", RED, sessionName, NC)
		fmt.Println("Start deployment with:")
		fmt.Println("   ./scripts/deployment/deploy-with-monitoring.sh")
		os.Exit(1)
	}

	fmt.Printf("%s✅ Session found: %s%s\n\n", GREEN, sessionName, NC)

	fmt.Printf("%sChoose monitoring mode:%s\n", BLUE, NC)
	fmt.Println("  1) Attach to session (interactive)")
	fmt.Println("  2) Stream output (read-only, 2-second refresh)")
	fmt.Println("  3) Get current status snapshot")
	fmt.Println("  4) Search logs for errors")
	fmt.Println()

	fmt.Print("Enter choice [1-4]: ")
	reader := bufio.NewReader(os.Stdin)
	input, _ := reader.ReadString('\n')
	choice := strings.TrimSpace(input)

	switch choice {
	case "1":
		attachSession()
	case "2":
		streamOutput()
	case "3":
		getSnapshot()
	case "4":
		searchLogs()
	default:
		fmt.Printf("%sInvalid choice%s\n", RED, NC)
		os.Exit(1)
	}
}
