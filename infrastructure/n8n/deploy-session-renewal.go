// Deploy session renewal workflow to n8n
package main

import (
	"flag"
	"fmt"
	"io"
	"os"
	"os/exec"
)

const (
	defaultWorkflowFile = "/home/jclee/dev/resume/infrastructure/n8n/session-renewal-workflow.json"
	defaultSSHHost      = "root@192.168.50.110"
	defaultN8nContainer = "n8n"
)

var (
	workflowFile string
	sshHost      string
	n8nContainer string
)

func main() {
	flag.StringVar(&workflowFile, "workflow", defaultWorkflowFile, "Path to workflow JSON file")
	flag.StringVar(&sshHost, "host", defaultSSHHost, "SSH target host")
	flag.StringVar(&n8nContainer, "container", defaultN8nContainer, "Docker container name for n8n")
	flag.Parse()

	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "❌ Error: %v\n", err)
		os.Exit(1)
	}
}

func run() error {
	fmt.Println("=== Deploying Session Renewal Workflow ===")
	fmt.Println()

	// Step 1: Import workflow
	fmt.Println("[1/3] Importing session renewal workflow...")
	if err := importWorkflow(); err != nil {
		return fmt.Errorf("workflow import failed: %w", err)
	}
	fmt.Println("✅ Workflow imported")
	fmt.Println()

	// Step 2: Publish workflow
	fmt.Println("[2/3] Publishing workflow...")
	if err := publishWorkflow(); err != nil {
		return fmt.Errorf("workflow publish failed: %w", err)
	}
	fmt.Println("✅ Workflow published")
	fmt.Println()

	// Step 3: Restart n8n
	fmt.Println("[3/3] Restarting n8n...")
	if err := restartN8n(); err != nil {
		return fmt.Errorf("n8n restart failed: %w", err)
	}
	fmt.Println("✅ n8n restarted")
	fmt.Println()

	// Summary
	fmt.Println("==========================================")
	fmt.Println("  Session Renewal Workflow Deployed!")
	fmt.Println("==========================================")
	fmt.Println()
	fmt.Println("Schedule: Daily at 8:00 AM KST")
	fmt.Println("Purpose: Renew Wanted session before auto-apply")
	fmt.Println()
	fmt.Println("Timeline:")
	fmt.Println("  8:00 AM - Session Renewal")
	fmt.Println("  9:00 AM - Auto-Apply (if session valid)")
	fmt.Println()

	return nil
}

func sshCmd(args ...string) *exec.Cmd {
	sshArgs := []string{"-o", "StrictHostKeyChecking=no", sshHost}
	sshArgs = append(sshArgs, args...)
	cmd := exec.Command("ssh", sshArgs...)
	return cmd
}

func importWorkflow() error {
	// Verify workflow file exists
	f, err := os.Open(workflowFile)
	if err != nil {
		return fmt.Errorf("failed to open workflow file: %w", err)
	}
	defer f.Close()

	// Build remote command
	remoteCmd := fmt.Sprintf(
		"docker exec -i %s sh -c 'cat > /tmp/session-renewal.json && n8n import:workflow --input=/tmp/session-renewal.json'",
		n8nContainer,
	)

	sshCmd := sshCmd("sh", "-c", remoteCmd)
	sshCmd.Stdin = f
	sshCmd.Stdout = os.Stdout
	sshCmd.Stderr = os.Stderr

	if err := sshCmd.Run(); err != nil {
		return fmt.Errorf("ssh command failed: %w", err)
	}

	return nil
}

func publishWorkflow() error {
	cmd := sshCmd("docker", "exec", n8nContainer, "n8n", "publish:workflow", "--id=session-renewal-wanted")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("publish command failed: %w", err)
	}

	return nil
}

func restartN8n() error {
	cmd := sshCmd("docker", "restart", n8nContainer)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("restart command failed: %w", err)
	}

	return nil
}

// copyBuffer handles efficient file copying for the pipe
func copyBuffer(dst io.Writer, src io.Reader) error {
	buf := make([]byte, 4096)
	_, err := io.CopyBuffer(dst, src, buf)
	return err
}
