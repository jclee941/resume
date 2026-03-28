// validate-migrations.go — CI validation for D1 migration files
// Ensures all migration SQL files are syntactically valid
package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
)

const migrationsDir = "infrastructure/database/migrations"

func main() {
	fmt.Println("🔍 Validating D1 migration files...")

	// Check migrations directory exists
	if _, err := os.Stat(migrationsDir); os.IsNotExist(err) {
		fmt.Printf("❌ Migrations directory not found: %s\n", migrationsDir)
		os.Exit(1)
	}

	// Collect all .sql files
	sqlFiles, err := findSQLFiles(migrationsDir)
	if err != nil {
		fmt.Printf("❌ Error finding SQL files: %v\n", err)
		os.Exit(1)
	}

	if len(sqlFiles) == 0 {
		fmt.Printf("⚠️  No migration files found in %s\n", migrationsDir)
		os.Exit(0)
	}

	errors := 0

	// Validate naming convention and check each file
	upFiles := make(map[int]string) // sequence number -> file path

	namingRegex := regexp.MustCompile(`^[0-9]{4}_[a-z][a-z0-9_]*\.(down\.)?sql$`)
	for _, file := range sqlFiles {
		basename := filepath.Base(file)

		// Validate naming convention
		if !namingRegex.MatchString(basename) {
			fmt.Printf("❌ Invalid naming convention: %s\n", basename)
			fmt.Printf("   Expected: NNNN_description.sql or NNNN_description.down.sql\n")
			errors++
			continue
		}

		// Check file is not empty
		info, err := os.Stat(file)
		if err != nil || info.Size() == 0 {
			fmt.Printf("❌ Empty migration file: %s\n", basename)
			errors++
			continue
		}

		// Check for common SQL syntax issues
		// 1. Unclosed parentheses
		if !checkParentheses(file) {
			errors++
		}

		// 2. Verify each up migration has a corresponding down migration
		upMigrationRegex := regexp.MustCompile(`^[0-9]{4}_.*\.sql$`)
		downMigrationRegex := regexp.MustCompile(`\.down\.sql$`)
		if upMigrationRegex.MatchString(basename) && !downMigrationRegex.MatchString(basename) {
			downFile := strings.TrimSuffix(file, ".sql") + ".down.sql"
			if _, err := os.Stat(downFile); os.IsNotExist(err) {
				fmt.Printf("⚠️  Missing down migration for: %s\n", basename)
			}
		}

		// 3. Check for dangerous patterns in up migrations
		if !downMigrationRegex.MatchString(basename) {
			if hasDangerousDropTable(file) {
				fmt.Printf("⚠️  DROP TABLE without IF EXISTS in: %s\n", basename)
			}
		}

		fmt.Printf("✅ %s\n", basename)

		// Track up migration sequence numbers
		if !downMigrationRegex.MatchString(basename) {
			seqNum := extractSeqNum(basename)
			if seqNum > 0 {
				upFiles[seqNum] = basename
			}
		}
	}

	// Validate migration sequence has no gaps
	prevNum := -1
	for seqNum := range upFiles {
		if prevNum >= 0 && seqNum != prevNum+1 {
			fmt.Printf("⚠️  Gap in migration sequence: %d → %d\n", prevNum, seqNum)
		}
		prevNum = seqNum
	}

	fmt.Println()
	if errors > 0 {
		fmt.Printf("❌ Validation failed with %d error(s)\n", errors)
		os.Exit(1)
	} else {
		fmt.Printf("✅ All %d migration files validated successfully\n", len(sqlFiles))
		os.Exit(0)
	}
}

func findSQLFiles(dir string) ([]string, error) {
	var files []string
	err := filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() && strings.HasSuffix(path, ".sql") {
			files = append(files, path)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	// Sort files
	for i := 0; i < len(files)-1; i++ {
		for j := i + 1; j < len(files); j++ {
			if files[i] > files[j] {
				files[i], files[j] = files[j], files[i]
			}
		}
	}
	return files, nil
}

func checkParentheses(file string) bool {
	// Use grep to count parentheses since we can't read binary safely
	cmd := exec.Command("tr", "-cd", "()")
	fileArg := file
	cmd.Args = append(cmd.Args, "<", fileArg)

	openCmd := exec.Command("sh", "-c", "tr -cd '(' < "+file)
	openOut, _ := openCmd.Output()
	openParens := len(string(openOut))

	closeCmd := exec.Command("sh", "-c", "tr -cd ')' < "+file)
	closeOut, _ := closeCmd.Output()
	closeParens := len(string(closeOut))

	if openParens != closeParens {
		basename := filepath.Base(file)
		fmt.Printf("❌ Mismatched parentheses in %s (open=%d, close=%d)\n", basename, openParens, closeParens)
		return false
	}
	return true
}

func hasDangerousDropTable(file string) bool {
	// Check for DROP TABLE without IF EXISTS
	cmd := exec.Command("grep", "-qiE", `^\s*DROP\s+TABLE\s`, file)
	err := cmd.Run()
	if err != nil {
		return false // No DROP TABLE found
	}

	// Now check if IF EXISTS is present
	ifCmd := exec.Command("grep", "-qiE", `^\s*DROP\s+TABLE\s+IF\s+EXISTS`, file)
	ifErr := ifCmd.Run()
	if ifErr != nil {
		// DROP TABLE without IF EXISTS found
		return true
	}
	return false
}

func extractSeqNum(basename string) int {
	re := regexp.MustCompile(`^([0-9]+)`)
	matches := re.FindStringSubmatch(basename)
	if len(matches) < 2 {
		return 0
	}
	var num int
	fmt.Sscanf(matches[1], "%d", &num)
	return num
}
