//go:build merge_ulw

// ULW Master Merge Script
// Run this to merge ULW work to master
package main

import (
	"fmt"
	"log"
	"os"
	"os/exec"
)

func main() {
	fmt.Println("=== ULW Master Merge ===")
	fmt.Println("")

	// 1. Fetch latest
	fmt.Println("1. Fetching latest changes...")
	if err := runGit("git", "fetch", "origin"); err != nil {
		log.Fatalf("Failed to fetch origin: %v", err)
	}

	// 2. Checkout master
	fmt.Println("2. Checking out master...")
	if err := runGit("git", "checkout", "master"); err != nil {
		log.Fatalf("Failed to checkout master: %v", err)
	}

	// 3. Merge ULW branch
	fmt.Println("3. Merging test/ci-trigger to master...")
	commitMsg := `Merge ULW testing branch to master

feat(automation): add independent resume auto-apply & sync automation
- Session manager with content validation
- Auto-apply cron with OneID API refresh
- Profile sync for Wanted/JobKorea
- Manual cookie import helper for JobKorea

test(portfolio-worker): update test to expect queue handler
- Fixed entry.test.js for Cloudflare Queue compatibility

ULTRAWORK: Complete automation pipeline for job applications`
	if err := runGit("git", "merge", "test/ci-trigger", "--no-ff", "-m", commitMsg); err != nil {
		log.Fatalf("Failed to merge test/ci-trigger: %v", err)
	}

	// 4. Push to origin
	fmt.Println("4. Pushing to origin...")
	if err := runGit("git", "push", "origin", "master"); err != nil {
		log.Fatalf("Failed to push to origin: %v", err)
	}

	fmt.Println("")
	fmt.Println("✅ ULW merge complete!")
	fmt.Println("")
	fmt.Println("Commits merged:")
	if err := runGit("git", "log", "--oneline", "-3"); err != nil {
		log.Fatalf("Failed to show commit log: %v", err)
	}
}

func runGit(name string, args ...string) error {
	cmd := exec.Command(name, args...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		// Print empty line for cleaner output after error
		fmt.Println()
		return err
	}
	return nil
}
