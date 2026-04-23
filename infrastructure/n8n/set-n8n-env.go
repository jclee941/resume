package main

import (
	"fmt"
	"os"
	"os/exec"
)

func main() {
	fmt.Println("=== Setting n8n Environment Variables ===")
	fmt.Println()

	jobServerURL := "http://192.168.50.100:3456"
	jobServerToken := "resume-admin-token-2024"

	fmt.Println("Setting:")
	fmt.Printf("  JOB_SERVER_URL=%s\n", jobServerURL)
	fmt.Printf("  JOB_SERVER_ADMIN_TOKEN=%s\n", jobServerToken)
	fmt.Println()

	// Build the psql command string
	psqlCmd := fmt.Sprintf(`docker exec n8n-postgres psql -U n8n -d n8n -c "
INSERT INTO credentials_entity (name, type, nodesAccess, data, updatedAt, createdAt)
VALUES 
  ('JOB_SERVER_URL', 'variables', '[]', '{\"value\": \"%s\"}', NOW(), NOW()),
  ('JOB_SERVER_ADMIN_TOKEN', 'variables', '[]', '{\"value\": \"%s\"}', NOW(), NOW())
ON CONFLICT (name) DO UPDATE SET 
  data = EXCLUDED.data,
  updatedAt = NOW();
"`, jobServerURL, jobServerToken)

	cmd := exec.Command("ssh", "-o", "StrictHostKeyChecking=no", "root@192.168.50.110", psqlCmd)
	out, err := cmd.CombinedOutput()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		fmt.Fprintf(os.Stderr, "Output: %s\n", string(out))
		os.Exit(1)
	}

	fmt.Println("✅ Environment variables set in n8n database")
	fmt.Println()
	fmt.Println("Note: You may need to restart n8n for changes to take effect:")
	fmt.Println("  docker restart n8n")
}
