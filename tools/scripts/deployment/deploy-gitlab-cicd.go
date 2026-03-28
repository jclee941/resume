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
	fmt.Println("  GitLab CI/CD Full Deployment Automation")
	fmt.Println("============================================")
	fmt.Println()

	gitlabURL := getEnv("GITLAB_URL", defaultGitLabURL)

	// Phase 1: Prerequisites Check
	fmt.Println("[Phase 1/4] Checking Prerequisites...")
	if err := checkPrerequisites(); err != nil {
		fmt.Printf("❌ Prerequisites check failed: %v\n", err)
		os.Exit(1)
	}
	fmt.Println("✅ All prerequisites met")
	fmt.Println()

	// Phase 2: OAuth Setup
	fmt.Println("[Phase 2/4] OAuth Application Setup...")
	fmt.Println("This step requires manual configuration in GitLab UI.")
	fmt.Printf("Please go to: %s/admin/applications\n", gitlabURL)
	fmt.Println()
	fmt.Print("Have you created the OAuth application? (y/N): ")

	reader := bufio.NewReader(os.Stdin)
	response, _ := reader.ReadString('\n')
	response = strings.TrimSpace(strings.ToLower(response))

	if response != "y" && response != "yes" {
		fmt.Println("Please create the OAuth application first:")
		fmt.Println("1. Name: Resume CI/CD Automation")
		fmt.Printf("2. Redirect URI: %s/oauth/token\n", gitlabURL)
		fmt.Println("3. Scopes: api")
		fmt.Println()
		fmt.Println("Then run this script again.")
		os.Exit(1)
	}

	// Get OAuth credentials
	fmt.Print("Enter OAuth Application ID: ")
	appID, _ := reader.ReadString('\n')
	appID = strings.TrimSpace(appID)

	fmt.Print("Enter OAuth Secret: ")
	secret, _ := reader.ReadString('\n')
	secret = strings.TrimSpace(secret)

	if appID == "" || secret == "" {
		fmt.Println("❌ OAuth credentials are required")
		os.Exit(1)
	}

	// Test OAuth credentials
	fmt.Println("Testing OAuth credentials...")
	if err := testOAuthCredentials(gitlabURL, appID, secret); err != nil {
		fmt.Printf("❌ OAuth test failed: %v\n", err)
		os.Exit(1)
	}
	fmt.Println("✅ OAuth credentials verified")
	fmt.Println()

	// Save to .env
	if err := saveCredentials(gitlabURL, appID, secret); err != nil {
		fmt.Printf("⚠️  Could not save credentials: %v\n", err)
	}

	// Phase 3: Runner Setup
	fmt.Println("[Phase 3/4] GitLab Runner Setup...")
	fmt.Println()
	fmt.Print("Do you want to set up a GitLab Runner? (Y/n): ")

	response, _ = reader.ReadString('\n')
	response = strings.TrimSpace(strings.ToLower(response))

	if response == "" || response == "y" || response == "yes" {
		fmt.Println()
		fmt.Printf("Get registration token from: %s/admin/runners\n", gitlabURL)
		fmt.Print("Enter Registration Token: ")

		regToken, _ := reader.ReadString('\n')
		regToken = strings.TrimSpace(regToken)

		if regToken != "" {
			if err := setupRunner(gitlabURL, regToken); err != nil {
				fmt.Printf("⚠️  Runner setup failed: %v\n", err)
				fmt.Println("You can set up the runner manually later.")
			} else {
				fmt.Println("✅ Runner setup complete")
			}
		}
	}
	fmt.Println()

	// Phase 4: CI/CD Variables Configuration
	fmt.Println("[Phase 4/4] CI/CD Variables Configuration...")
	fmt.Println()
	fmt.Printf("Please configure these variables in GitLab:\n")
	fmt.Printf("URL: %s/qws941/resume/-/settings/ci_cd\n", gitlabURL)
	fmt.Println()
	fmt.Println("Required Variables:")
	fmt.Println("  GITLAB_URL: " + gitlabURL)
	fmt.Println("  GITLAB_OAUTH_APP_ID: " + appID)
	fmt.Println("  GITLAB_OAUTH_CLIENT_SECRET: [masked]")
	fmt.Println()
	fmt.Print("Have you configured the CI/CD variables? (y/N): ")

	response, _ = reader.ReadString('\n')
	response = strings.TrimSpace(strings.ToLower(response))

	if response == "y" || response == "yes" {
		fmt.Println()
		fmt.Println("✅ Deployment automation setup complete!")
		fmt.Println()
		fmt.Println("Next steps:")
		fmt.Println("1. Push .gitlab-ci.yml to your repository")
		fmt.Println("2. Trigger the pipeline manually or via git push")
		fmt.Printf("3. Monitor pipeline at: %s/qws941/resume/-/pipelines\n", gitlabURL)
	} else {
		fmt.Println()
		fmt.Println("⚠️  Setup incomplete - CI/CD variables not configured")
		fmt.Println("Please configure the variables and then trigger the pipeline.")
	}

	fmt.Println()
	fmt.Println("============================================")
	fmt.Println("  Deployment Summary")
	fmt.Println("============================================")
	fmt.Println("✅ OAuth Application: Configured")
	fmt.Println("✅ OAuth Credentials: Verified & Saved")
	fmt.Println("✅ Runner Setup: Attempted")
	fmt.Println("⏳ CI/CD Variables: Manual configuration required")
	fmt.Println()
	fmt.Println("To verify the setup, run:")
	fmt.Println("  node tools/scripts/verification/verify-gitlab-cicd.js")
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func checkPrerequisites() error {
	// Check Docker
	if _, err := exec.LookPath("docker"); err != nil {
		return fmt.Errorf("docker not found in PATH")
	}

	// Check curl
	if _, err := exec.LookPath("curl"); err != nil {
		return fmt.Errorf("curl not found in PATH")
	}

	// Check jq
	if _, err := exec.LookPath("jq"); err != nil {
		return fmt.Errorf("jq not found in PATH")
	}

	// Check if .gitlab-ci.yml exists
	if _, err := os.Stat(".gitlab-ci.yml"); os.IsNotExist(err) {
		return fmt.Errorf(".gitlab-ci.yml not found in current directory")
	}

	return nil
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

func saveCredentials(gitlabURL, appID, secret string) error {
	// Read existing .env
	var lines []string
	var hasURL, hasAppID, hasSecret bool

	if _, err := os.Stat(".env"); err == nil {
		content, err := os.ReadFile(".env")
		if err != nil {
			return err
		}
		lines = strings.Split(string(content), "\n")

		// Check which keys exist
		for _, line := range lines {
			if strings.HasPrefix(line, "GITLAB_URL=") {
				hasURL = true
			}
			if strings.HasPrefix(line, "GITLAB_OAUTH_APP_ID=") {
				hasAppID = true
			}
			if strings.HasPrefix(line, "GITLAB_OAUTH_CLIENT_SECRET=") {
				hasSecret = true
			}
		}
	}

	// Update or add keys
	var newLines []string
	for _, line := range lines {
		switch {
		case strings.HasPrefix(line, "GITLAB_URL="):
			newLines = append(newLines, "GITLAB_URL="+gitlabURL)
		case strings.HasPrefix(line, "GITLAB_OAUTH_APP_ID="):
			newLines = append(newLines, "GITLAB_OAUTH_APP_ID="+appID)
		case strings.HasPrefix(line, "GITLAB_OAUTH_CLIENT_SECRET="):
			newLines = append(newLines, "GITLAB_OAUTH_CLIENT_SECRET="+secret)
		default:
			newLines = append(newLines, line)
		}
	}

	// Add missing keys
	if !hasURL {
		newLines = append(newLines, "GITLAB_URL="+gitlabURL)
	}
	if !hasAppID {
		newLines = append(newLines, "GITLAB_OAUTH_APP_ID="+appID)
	}
	if !hasSecret {
		newLines = append(newLines, "GITLAB_OAUTH_CLIENT_SECRET="+secret)
	}

	// Backup existing .env
	if _, err := os.Stat(".env"); err == nil {
		backupName := fmt.Sprintf(".env.backup.%s", time.Now().Format("20060102-150405"))
		exec.Command("cp", ".env", backupName).Run()
	}

	// Write updated content
	content := strings.Join(newLines, "\n")
	return os.WriteFile(".env", []byte(content), 0644)
}

func setupRunner(gitlabURL, regToken string) error {
	// Check if runner container exists
	cmd := exec.Command("docker", "ps", "-a", "--format", "{{.Names}}")
	output, err := cmd.Output()
	if err != nil {
		return fmt.Errorf("cannot check docker containers: %v", err)
	}

	if strings.Contains(string(output), "gitlab-runner") {
		fmt.Println("GitLab Runner container already exists, skipping creation")
		return nil
	}

	// Create config directory
	configDir := os.Getenv("HOME") + "/.gitlab-runner/config"
	if err := os.MkdirAll(configDir, 0755); err != nil {
		return fmt.Errorf("cannot create config directory: %v", err)
	}

	// Create runner container
	fmt.Println("Creating GitLab Runner container...")
	cmd = exec.Command("docker", "run", "-d", "--name", "gitlab-runner",
		"--restart", "always",
		"-v", "/var/run/docker.sock:/var/run/docker.sock",
		"-v", configDir+":/etc/gitlab-runner",
		"gitlab/gitlab-runner:latest")

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to create container: %v", err)
	}

	// Wait for container
	fmt.Println("Waiting for runner to be ready...")
	time.Sleep(3 * time.Second)

	// Register runner
	fmt.Println("Registering runner with GitLab...")
	cmd = exec.Command("docker", "exec", "gitlab-runner", "gitlab-runner", "register",
		"--non-interactive",
		"--url", gitlabURL,
		"--token", regToken,
		"--executor", "docker",
		"--docker-image", "node:22-alpine",
		"--description", "Docker Runner for Resume",
		"--tag-list", "docker,linux",
		"--run-untagged=false",
		"--locked=false",
		"--access-level=not_protected")

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("registration failed: %v", err)
	}

	return nil
}
