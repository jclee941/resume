package main

import (
	"bufio"
	"fmt"
	"os"
	"os/exec"
	"strings"
	"time"
)

const (
	defaultGitLabURL = "http://gitlab.jclee.me"
)

func main() {
	fmt.Println("============================================")
	fmt.Println("  GitLab OAuth Application Setup Helper")
	fmt.Println("============================================")
	fmt.Println()

	gitlabURL := getEnv("GITLAB_URL", defaultGitLabURL)

	// Step 1: Verify GitLab is accessible
	fmt.Println("[Step 1/5] Checking GitLab accessibility...")
	if err := checkGitLabAccessible(gitlabURL); err != nil {
		fmt.Printf("❌ Cannot reach GitLab at %s: %v\n", gitlabURL, err)
		os.Exit(1)
	}
	fmt.Printf("✓ GitLab is accessible at %s\n", gitlabURL)
	fmt.Println()

	// Step 2: Instructions for creating OAuth app
	printInstructions(gitlabURL)

	// Step 3: Get credentials from user
	fmt.Println("[Step 3/5] Enter OAuth Application Credentials:")
	fmt.Println()

	reader := bufio.NewReader(os.Stdin)

	fmt.Print("Application ID: ")
	appID, _ := reader.ReadString('\n')
	appID = strings.TrimSpace(appID)

	fmt.Print("Secret: ")
	secret, _ := reader.ReadString('\n')
	secret = strings.TrimSpace(secret)

	if appID == "" || secret == "" {
		fmt.Println("❌ Error: Both Application ID and Secret are required")
		os.Exit(1)
	}

	// Step 4: Test OAuth credentials
	fmt.Println()
	fmt.Println("[Step 4/5] Testing OAuth credentials...")

	if err := testOAuthCredentials(gitlabURL, appID, secret); err != nil {
		fmt.Printf("❌ OAuth test failed: %v\n", err)
		os.Exit(1)
	}
	fmt.Println("✓ OAuth credentials are valid!")

	// Step 5: Save to .env file
	fmt.Println()
	fmt.Println("[Step 5/5] Saving configuration...")

	if err := saveToEnvFile(gitlabURL, appID, secret); err != nil {
		fmt.Printf("⚠ Warning: Could not save to .env: %v\n", err)
	} else {
		fmt.Println("✓ Credentials saved to .env")
	}

	// Print next steps
	fmt.Println()
	fmt.Println("============================================")
	fmt.Println("  Next Steps: Add to 1Password")
	fmt.Println("============================================")
	fmt.Println()
	fmt.Println("Add these credentials to your 1Password vault 'homelab':")
	fmt.Println()
	fmt.Println("Item: GitLab OAuth")
	fmt.Println("  - application-id: [REDACTED - check .env file]")
	fmt.Println("  - client-secret:  [REDACTED - check .env file]")
	fmt.Println()
	fmt.Println("Item: GitLab OAuth")
	fmt.Printf("  - application-id: %s\n", appID)
	fmt.Printf("  - client-secret:  %s\n", secret)
	fmt.Println()
	fmt.Println("Then configure GitLab CI/CD variables:")
	fmt.Printf("  %s/qws941/resume/-/settings/ci_cd\n", gitlabURL)
	fmt.Println()
	fmt.Println("✅ Setup complete!")
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func checkGitLabAccessible(url string) error {
	cmd := exec.Command("curl", "-s", "-f", fmt.Sprintf("%s/api/v4/version", url))
	return cmd.Run()
}

func printInstructions(gitlabURL string) {
	fmt.Println("[Step 2/5] OAuth Application Creation Instructions:")
	fmt.Println()
	fmt.Println("1. Open your browser and go to:")
	fmt.Printf("   %s/admin/applications\n", gitlabURL)
	fmt.Println()
	fmt.Println("2. Click the 'New application' button")
	fmt.Println()
	fmt.Println("3. Fill in the application details:")
	fmt.Println("   Name:             Resume CI/CD Automation")
	fmt.Printf("   Redirect URI:     %s/oauth/token\n", gitlabURL)
	fmt.Println("   Confidential:     ✓ Check this box")
	fmt.Println()
	fmt.Println("4. Select the following scopes:")
	fmt.Println("   ☑ api              (Full API access)")
	fmt.Println()
	fmt.Println("5. Click 'Save application'")
	fmt.Println()
}

func testOAuthCredentials(gitlabURL, appID, secret string) error {
	cmd := exec.Command("curl", "-s", "-X", "POST",
		fmt.Sprintf("%s/oauth/token", gitlabURL),
		"-d", "grant_type=client_credentials",
		"-d", fmt.Sprintf("client_id=%s", appID),
		"-d", fmt.Sprintf("client_secret=%s", secret),
		"-d", "scope=api")

	output, err := cmd.Output()
	if err != nil {
		return fmt.Errorf("request failed: %v", err)
	}

	// Check if response contains access_token
	if !strings.Contains(string(output), "access_token") {
		return fmt.Errorf("invalid response: %s", string(output))
	}

	return nil
}

func saveToEnvFile(gitlabURL, appID, secret string) error {
	// Read existing .env content
	var lines []string
	var hasGitlabURL, hasAppID, hasSecret bool

	if _, err := os.Stat(".env"); err == nil {
		content, err := os.ReadFile(".env")
		if err != nil {
			return err
		}
		lines = strings.Split(string(content), "\n")

		// Check which keys exist
		for _, line := range lines {
			if strings.HasPrefix(line, "GITLAB_URL=") {
				hasGitlabURL = true
			}
			if strings.HasPrefix(line, "GITLAB_OAUTH_APP_ID=") {
				hasAppID = true
			}
			if strings.HasPrefix(line, "GITLAB_OAUTH_CLIENT_SECRET=") {
				hasSecret = true
			}
		}
	}

	// Update existing keys
	var newLines []string
	for _, line := range lines {
		switch {
		case strings.HasPrefix(line, "GITLAB_URL="):
			newLines = append(newLines, fmt.Sprintf("GITLAB_URL=%s", gitlabURL))
		case strings.HasPrefix(line, "GITLAB_OAUTH_APP_ID="):
			newLines = append(newLines, fmt.Sprintf("GITLAB_OAUTH_APP_ID=%s", appID))
		case strings.HasPrefix(line, "GITLAB_OAUTH_CLIENT_SECRET="):
			newLines = append(newLines, fmt.Sprintf("GITLAB_OAUTH_CLIENT_SECRET=%s", secret))
		default:
			newLines = append(newLines, line)
		}
	}

	// Add missing keys
	if !hasGitlabURL {
		newLines = append(newLines, fmt.Sprintf("GITLAB_URL=%s", gitlabURL))
	}
	if !hasAppID {
		newLines = append(newLines, fmt.Sprintf("GITLAB_OAUTH_APP_ID=%s", appID))
	}
	if !hasSecret {
		newLines = append(newLines, fmt.Sprintf("GITLAB_OAUTH_CLIENT_SECRET=%s", secret))
	}

	// Backup existing .env
	if _, err := os.Stat(".env"); err == nil {
		backupName := fmt.Sprintf(".env.backup.%s", time.Now().Format("20060102-150405"))
		if err := exec.Command("cp", ".env", backupName).Run(); err == nil {
			fmt.Printf("Backup created: %s\n", backupName)
		}
	}

	// Write updated content
	content := strings.Join(newLines, "\n")
	if err := os.WriteFile(".env", []byte(content), 0644); err != nil {
		return err
	}

	return nil
	// Backup existing .env
	if _, err := os.Stat(".env"); err == nil {
		backupName := fmt.Sprintf(".env.backup.%s", time.Now().Format("20060102-150405"))
		if err := exec.Command("cp", ".env", backupName).Run(); err == nil {
			fmt.Printf("Backup created: %s\n", backupName)
		}
	}

	// Append to .env
	f, err := os.OpenFile(".env", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return err
	}
	defer f.Close()

	fmt.Fprintf(f, "\n# GitLab CI/CD OAuth (Updated %s)\n", time.Now().Format("2006-01-02"))
	fmt.Fprintf(f, "GITLAB_URL=%s\n", gitlabURL)
	fmt.Fprintf(f, "GITLAB_OAUTH_APP_ID=%s\n", appID)
	fmt.Fprintf(f, "GITLAB_OAUTH_CLIENT_SECRET=%s\n", secret)

	return nil
}
