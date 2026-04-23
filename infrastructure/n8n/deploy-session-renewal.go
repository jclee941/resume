package main

import (
	"fmt"
	"os"
	"os/exec"
)

func main() {
	fmt.Println("=== Deploying Session Renewal Workflow ===")
	fmt.Println()

	workflowFile := "/home/jclee/dev/resume/infrastructure/n8n/session-renewal-workflow.json"

	fmt.Println("[1/3] Importing session renewal workflow...")
	// cat "$WORKFLOW_FILE" | ssh ... 'docker exec -i n8n sh -c "cat > /tmp/session-renewal.json && n8n import:workflow --input=/tmp/session-renewal.json"'
	catCmd := exec.Command("cat", workflowFile)
	sshCmd := exec.Command("ssh", "-o", "StrictHostKeyChecking=no", "root@192.168.50.110",
		`docker exec -i n8n sh -c "cat > /tmp/session-renewal.json && n8n import:workflow --input=/tmp/session-renewal.json"`)

	stdin, err := sshCmd.StdinPipe()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error creating stdin pipe: %v\n", err)
		os.Exit(1)
	}

	catOut, err := catCmd.StdoutPipe()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error creating stdout pipe: %v\n", err)
		os.Exit(1)
	}

	if err := catCmd.Start(); err != nil {
		fmt.Fprintf(os.Stderr, "Error starting cat: %v\n", err)
		os.Exit(1)
	}

	go func() {
		defer stdin.Close()
		buf := make([]byte, 4096)
		for {
			n, err := catOut.Read(buf)
			if n > 0 {
				stdin.Write(buf[:n])
			}
			if err != nil {
				break
			}
		}
	}()

	out, err := sshCmd.CombinedOutput()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		fmt.Fprintf(os.Stderr, "Output: %s\n", string(out))
		os.Exit(1)
	}
	catCmd.Wait()
	fmt.Println("✅ Workflow imported")
	fmt.Println()

	fmt.Println("[2/3] Publishing workflow...")
	pubCmd := exec.Command("ssh", "-o", "StrictHostKeyChecking=no", "root@192.168.50.110",
		"docker exec n8n n8n publish:workflow --id=session-renewal-wanted")
	pubOut, err := pubCmd.CombinedOutput()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		fmt.Fprintf(os.Stderr, "Output: %s\n", string(pubOut))
		os.Exit(1)
	}
	fmt.Println("✅ Workflow published")
	fmt.Println()

	fmt.Println("[3/3] Restarting n8n...")
	restartCmd := exec.Command("ssh", "-o", "StrictHostKeyChecking=no", "root@192.168.50.110",
		"docker restart n8n")
	restartOut, err := restartCmd.CombinedOutput()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		fmt.Fprintf(os.Stderr, "Output: %s\n", string(restartOut))
		os.Exit(1)
	}
	fmt.Println("✅ n8n restarted")
	fmt.Println()

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
}
