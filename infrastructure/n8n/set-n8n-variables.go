package main

import (
	"fmt"
	"os"
	"os/exec"
)

func main() {
	fmt.Println("=== Setting n8n Variables ===")
	fmt.Println()

	psqlCmd := `docker exec n8n-postgres psql -U n8n -d n8n -c "
INSERT INTO variables (id, key, type, value) VALUES 
  (gen_random_uuid(), 'JOB_SERVER_URL', 'string', 'http://192.168.50.100:3456'),
  (gen_random_uuid(), 'JOB_SERVER_ADMIN_TOKEN', 'string', 'resume-admin-token-2024')
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value;
"`

	cmd := exec.Command("ssh", "-o", "StrictHostKeyChecking=no", "root@192.168.50.110", psqlCmd)
	out, err := cmd.CombinedOutput()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		fmt.Fprintf(os.Stderr, "Output: %s\n", string(out))
		os.Exit(1)
	}

	fmt.Println("✅ Variables set successfully")
}
