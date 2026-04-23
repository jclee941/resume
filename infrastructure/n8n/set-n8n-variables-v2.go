package main

import (
	"fmt"
	"os"
	"os/exec"
)

func main() {
	fmt.Println("=== Setting n8n Variables ===")
	fmt.Println()

	// Delete existing entries
	deleteCmd := `docker exec n8n-postgres psql -U n8n -d n8n -c "
DELETE FROM variables WHERE key IN ('JOB_SERVER_URL', 'JOB_SERVER_ADMIN_TOKEN');
"`

	cmd1 := exec.Command("ssh", "-o", "StrictHostKeyChecking=no", "root@192.168.50.110", deleteCmd)
	out1, err1 := cmd1.CombinedOutput()
	if err1 != nil {
		fmt.Fprintf(os.Stderr, "Delete error: %v\n", err1)
		fmt.Fprintf(os.Stderr, "Output: %s\n", string(out1))
		os.Exit(1)
	}

	// Insert new entries
	insertCmd := `docker exec n8n-postgres psql -U n8n -d n8n -c "
INSERT INTO variables (id, key, type, value) VALUES 
  (gen_random_uuid(), 'JOB_SERVER_URL', 'string', 'http://192.168.50.100:3456'),
  (gen_random_uuid(), 'JOB_SERVER_ADMIN_TOKEN', 'string', 'resume-admin-token-2024');
"`

	cmd2 := exec.Command("ssh", "-o", "StrictHostKeyChecking=no", "root@192.168.50.110", insertCmd)
	out2, err2 := cmd2.CombinedOutput()
	if err2 != nil {
		fmt.Fprintf(os.Stderr, "Insert error: %v\n", err2)
		fmt.Fprintf(os.Stderr, "Output: %s\n", string(out2))
		os.Exit(1)
	}

	fmt.Println("✅ Variables set successfully")
}
