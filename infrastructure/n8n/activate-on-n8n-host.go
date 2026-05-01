// activate-on-n8n-host.go - Run this ON the n8n host (192.168.50.110)
//
// Usage:
//
//	cp infrastructure/n8n/activate-on-n8n-host.go root@192.168.50.110:/tmp/
//	ssh root@192.168.50.110 'go run /tmp/activate-on-n8n-host.go'
//
// Or build and run:
//
//	go build -o activate-on-n8n-host infrastructure/n8n/activate-on-n8n-host.go
//	./activate-on-n8n-host
package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"regexp"
	"strings"
)

const (
	workflowURL  = "https://raw.githubusercontent.com/qws941/resume/master/infrastructure/n8n/job-auto-apply-workflow.json"
	workflowFile = "/tmp/job-auto-apply-workflow.json"
	n8nAPI       = "http://localhost:5678/api/v1/workflows"
)

var (
	flagN8nHost = flag.String("host", "localhost:5678", "n8n host address")
	flagDryRun  = flag.Bool("dry-run", false, "skip activation (download + import only)")
	flagVerbose = flag.Bool("v", false, "verbose output")
)

func main() {
	flag.Parse()

	fmt.Println("=== n8n Auto-Apply Activation (On-Host) ===")
	fmt.Println()

	if err := downloadWorkflow(); err != nil {
		fmt.Fprintf(os.Stderr, "❌ Failed to download workflow: %v\n", err)
		os.Exit(1)
	}
	fmt.Println("✅ Workflow downloaded")
	fmt.Println()

	workflowID, err := importWorkflow()
	if err != nil {
		fmt.Fprintf(os.Stderr, "❌ Import failed:\n%v\n", err)
		os.Exit(1)
	}
	fmt.Println()

	if *flagDryRun {
		fmt.Println("[DRY-RUN] Skipping activation")
		os.Exit(0)
	}

	if err := activateWorkflow(workflowID); err != nil {
		fmt.Fprintf(os.Stderr, "❌ Activation failed:\n%v\n", err)
		os.Exit(1)
	}

	// Cleanup
	os.Remove(workflowFile)
}

func downloadWorkflow() error {
	fmt.Println("[1/3] Downloading workflow...")

	if *flagVerbose {
		fmt.Printf("     URL: %s\n", workflowURL)
		fmt.Printf("     Dest: %s\n", workflowFile)
	}

	cmd := exec.Command("curl", "-sL", workflowURL, "-o", workflowFile)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("curl exited %v: %s", err, string(out))
	}

	if *flagVerbose {
		fmt.Printf("     Download complete\n")
	}
	return nil
}

func importWorkflow() (string, error) {
	fmt.Println("[2/3] Importing to n8n...")

	apiURL := fmt.Sprintf("http://%s/api/v1/workflows", *flagN8nHost)
	if *flagVerbose {
		fmt.Printf("     POST %s\n", apiURL)
	}

	cmd := exec.Command("curl", "-s", "-X", "POST", apiURL,
		"-H", "Content-Type: application/json",
		"-d", "@"+workflowFile)
	out, err := cmd.CombinedOutput()
	response := string(out)

	if err != nil && response == "" {
		return "", fmt.Errorf("curl error: %v", err)
	}

	if *flagVerbose {
		fmt.Printf("     Response: %s\n", response)
	}

	// Check if import succeeded
	if strings.Contains(response, `"id"`) {
		workflowID := extractWorkflowID(response)
		if workflowID == "" {
			return "", fmt.Errorf("could not parse workflow ID from response: %s", response)
		}
		fmt.Printf("✅ Workflow imported: %s\n", workflowID)
		return workflowID, nil
	}

	// Check if already exists
	if strings.Contains(response, "already exists") {
		workflowID := "DRHg9pwanv4pHGxV"
		fmt.Printf("⚠️  Workflow already exists: %s\n", workflowID)
		return workflowID, nil
	}

	return "", fmt.Errorf("import failed: %s", response)
}

func extractWorkflowID(response string) string {
	// Match "id":"VALUE" or "id": "VALUE"
	re := regexp.MustCompile(`"id"[:\s]+"([^"]+)"`)
	matches := re.FindStringSubmatch(response)
	if len(matches) >= 2 {
		return matches[1]
	}
	return ""
}

func activateWorkflow(workflowID string) error {
	fmt.Println("[3/3] Activating workflow...")

	apiURL := fmt.Sprintf("http://%s/api/v1/workflows/%s", *flagN8nHost, workflowID)
	if *flagVerbose {
		fmt.Printf("     PATCH %s\n", apiURL)
	}

	cmd := exec.Command("curl", "-s", "-X", "PATCH", apiURL,
		"-H", "Content-Type: application/json",
		"-d", `{"active":true}`)
	out, err := cmd.CombinedOutput()
	response := string(out)

	if err != nil && response == "" {
		return fmt.Errorf("curl error: %v", err)
	}

	if *flagVerbose {
		fmt.Printf("     Response: %s\n", response)
	}

	if strings.Contains(response, `"active":true`) {
		fmt.Println("✅ Workflow activated!")
		fmt.Println()
		fmt.Println("=== SUCCESS ===")
		fmt.Printf("Workflow ID: %s\n", workflowID)
		fmt.Println("Status: Active ✅")
		fmt.Println("Schedule: Daily at 9:00 AM KST")
		fmt.Println()
		fmt.Println("The auto-apply system is now running!")
		fmt.Println("Next run: Tomorrow at 9:00 AM KST")
		fmt.Println()
		fmt.Printf("Monitor at: http://192.168.50.110:5678/workflow/%s\n", workflowID)
		return nil
	}

	return fmt.Errorf("activation failed: %s", response)
}

// httpImportWorkflow imports workflow via net/http (alternative, no curl needed)
func httpImportWorkflow() (string, error) {
	data, err := os.ReadFile(workflowFile)
	if err != nil {
		return "", fmt.Errorf("failed to read workflow file: %w", err)
	}

	apiURL := fmt.Sprintf("http://%s/api/v1/workflows", *flagN8nHost)
	resp, err := http.Post(apiURL, "application/json", bytes.NewReader(data))
	if err != nil {
		return "", fmt.Errorf("POST failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response: %w", err)
	}

	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", fmt.Errorf("JSON parse failed: %w", err)
	}

	if id, ok := result["id"].(string); ok {
		return id, nil
	}

	if strings.Contains(string(body), "already exists") {
		return "DRHg9pwanv4pHGxV", nil
	}

	return "", fmt.Errorf("unexpected response: %s", string(body))
}
