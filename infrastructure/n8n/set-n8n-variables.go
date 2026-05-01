package main

import (
	"flag"
	"fmt"
	"os"
	"os/exec"
	"strings"
)

func main() {
	// CLI flags with defaults matching original script
	host := flag.String("host", "192.168.50.110", "SSH host to connect to")
	dbUser := flag.String("db-user", "n8n", "PostgreSQL database user")
	dbName := flag.String("db-name", "n8n", "PostgreSQL database name")
	jobServerURL := flag.String("job-server-url", "http://192.168.50.100:3456", "Job server URL")
	adminToken := flag.String("admin-token", "resume-admin-token-2024", "Job server admin token")

	flag.Parse()

	fmt.Println("=== Setting n8n Variables ===")

	// Build the SQL statement
	sql := fmt.Sprintf(`INSERT INTO variables (id, key, type, value) VALUES
	  (gen_random_uuid(), 'JOB_SERVER_URL', 'string', '%s'),
	  (gen_random_uuid(), 'JOB_SERVER_ADMIN_TOKEN', 'string', '%s')
	ON CONFLICT (key) DO UPDATE SET
	  value = EXCLUDED.value;`, *jobServerURL, *adminToken)

	// Build the psql command
	psqlCmd := fmt.Sprintf(`docker exec n8n-postgres psql -U %s -d %s -c "%s"`,
		*dbUser, *dbName, strings.ReplaceAll(sql, "\n", " "))

	// Execute SSH with the psql command
	cmd := exec.Command("ssh", "-o", "StrictHostKeyChecking=no", fmt.Sprintf("root@%s", *host), psqlCmd)
	out, err := cmd.CombinedOutput()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		fmt.Fprintf(os.Stderr, "Output: %s\n", string(out))
		os.Exit(1)
	}

	// Check for psql errors in output
	if len(out) > 0 && strings.Contains(string(out), "ERROR") {
		fmt.Fprintf(os.Stderr, "Database error: %s\n", string(out))
		os.Exit(1)
	}

	fmt.Println("✅ Variables set successfully")
	os.Exit(0)
}
