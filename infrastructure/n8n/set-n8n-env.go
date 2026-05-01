package main

import (
	"flag"
	"fmt"
	"os"
	"os/exec"
	"strings"
)

func main() {
	// Define flags with defaults matching original script
	host := flag.String("host", "192.168.50.110", "SSH host to connect to")
	dbUser := flag.String("db-user", "n8n", "PostgreSQL database user")
	dbName := flag.String("db-name", "n8n", "PostgreSQL database name")
	jobServerURL := flag.String("job-server-url", "http://192.168.50.100:3456", "Job server URL")
	adminToken := flag.String("admin-token", "resume-admin-token-2024", "Job server admin token")

	flag.Parse()

	fmt.Println("=== Setting n8n Environment Variables ===")
	fmt.Println()
	fmt.Println("Setting:")
	fmt.Printf("  JOB_SERVER_URL=%s\n", *jobServerURL)
	fmt.Printf("  JOB_SERVER_ADMIN_TOKEN=%s\n", *adminToken)
	fmt.Println()

	// Build the SQL query
	sql := fmt.Sprintf(`docker exec n8n-postgres psql -U %s -d %s -c "
INSERT INTO credentials_entity (name, type, nodesAccess, data, updatedAt, createdAt)
VALUES 
  ('JOB_SERVER_URL', 'variables', '[]', '{\"value\": \"$(echo %s | sed 's/\\/\\\\\\//g')\"}', NOW(), NOW()),
  ('JOB_SERVER_ADMIN_TOKEN', 'variables', '[]', '{\"value\": \"$(echo %s | sed 's/\\/\\\\\\//g')\"}', NOW(), NOW())
ON CONFLICT (name) DO UPDATE SET 
  data = EXCLUDED.data,
  updatedAt = NOW();
"`, *dbUser, *dbName, *jobServerURL, *adminToken)

	// Escape special characters for shell embedding
	sql = escapeForShell(sql)

	// Build SSH command
	sshCmd := exec.Command("ssh", "-o", "StrictHostKeyChecking=no", fmt.Sprintf("root@%s", *host), sql)

	output, err := sshCmd.CombinedOutput()
	if err != nil {
		fmt.Fprintf(os.Stderr, "SSH command failed: %v\nOutput: %s\n", err, output)
		os.Exit(1)
	}

	// Check for psql errors in output
	outputStr := string(output)
	if strings.Contains(outputStr, "ERROR") || strings.Contains(outputStr, "FATAL") {
		fmt.Fprintf(os.Stderr, "psql error detected:\n%s\n", outputStr)
		os.Exit(1)
	}

	fmt.Println("✅ Environment variables set in n8n database")
	fmt.Println()
	fmt.Println("Note: You may need to restart n8n for changes to take effect:")
	fmt.Println("  docker restart n8n")

	os.Exit(0)
}

// escapeForShell escapes single quotes and backslashes for shell embedding
func escapeForShell(s string) string {
	var builder strings.Builder
	for _, c := range s {
		switch c {
		case '\\':
			builder.WriteString("\\\\")
		case '"':
			builder.WriteString("\\\"")
		case '\'':
			builder.WriteString("'\\''")
		default:
			builder.WriteRune(c)
		}
	}
	return builder.String()
}
