package main

import (
	"bufio"
	"fmt"
	"os"
	"strings"
)

const defaultGitLabURL = "http://gitlab.jclee.me"

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
	fmt.Println("  node tools/scripts/verification/gitlab/index.js")
}
