// set-n8n-variables-v2.go
// Go equivalent of set-n8n-variables-v2.sh
// Sets n8n variables (JOB_SERVER_URL, JOB_SERVER_ADMIN_TOKEN) in the n8n-postgres database.
package main

import (
	"flag"
	"fmt"
	"os"
	"os/exec"
	"strings"
)

func main() {
	// CLI flags with sensible defaults
	host := flag.String("host", "192.168.50.110", "SSH target host")
	user := flag.String("user", "root", "SSH user")
	container := flag.String("container", "n8n-postgres", "Docker container name")
	dbUser := flag.String("db-user", "n8n", "PostgreSQL database user")
	dbName := flag.String("db-name", "n8n", "PostgreSQL database name")
	jobServerURL := flag.String("job-server-url", "http://192.168.50.100:3456", "Job server URL")
	adminToken := flag.String("admin-token", "resume-admin-token-2024", "Job server admin token")

	flag.Parse()

	fmt.Println("=== Setting n8n Variables ===")
	fmt.Println()

	// Build the DELETE SQL
	deleteSQL := fmt.Sprintf(`DELETE FROM variables WHERE key IN ('JOB_SERVER_URL', 'JOB_SERVER_ADMIN_TOKEN');`)

	// Execute DELETE via SSH + docker exec
	deleteCmd := exec.Command("ssh",
		"-o", "StrictHostKeyChecking=no",
		*user+"@"+*host,
		fmt.Sprintf("docker exec %s psql -U %s -d %s -c \"%s\"",
			*container, *dbUser, *dbName, deleteSQL))

	deleteOut, err := deleteCmd.CombinedOutput()
	if err != nil {
		fmt.Fprintf(os.Stderr, "❌ DELETE command failed: %v\nOutput: %s\n", err, string(deleteOut))
		os.Exit(1)
	}
	fmt.Println("✓ Deleted existing variables")

	// Build the INSERT SQL
	insertSQL := fmt.Sprintf(`INSERT INTO variables (id, key, type, value) VALUES
  (gen_random_uuid(), 'JOB_SERVER_URL', 'string', '%s'),
  (gen_random_uuid(), 'JOB_SERVER_ADMIN_TOKEN', 'string', '%s');`,
		*jobServerURL, *adminToken)

	// Execute INSERT via SSH + docker exec
	insertCmd := exec.Command("ssh",
		"-o", "StrictHostKeyChecking=no",
		*user+"@"+*host,
		fmt.Sprintf("docker exec %s psql -U %s -d %s -c \"%s\"",
			*container, *dbUser, *dbName, insertSQL))

	insertOut, err := insertCmd.CombinedOutput()
	if err != nil {
		fmt.Fprintf(os.Stderr, "❌ INSERT command failed: %v\nOutput: %s\n", err, string(insertOut))
		os.Exit(1)
	}
	fmt.Println("✓ Inserted new variables")

	// Clean output (remove trailing newlines for cleaner display)
	deleteOutClean := strings.TrimSpace(string(deleteOut))
	insertOutClean := strings.TrimSpace(string(insertOut))

	if deleteOutClean != "" {
		fmt.Println(deleteOutClean)
	}
	if insertOutClean != "" {
		fmt.Println(insertOutClean)
	}

	fmt.Println("✅ Variables set successfully")
	os.Exit(0)
}
