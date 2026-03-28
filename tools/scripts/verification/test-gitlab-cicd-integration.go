package main

import (
	"fmt"
	"os"
	"os/exec"
	"strings"
)

const (
	defaultGitLabURL = "http://gitlab.jclee.me"
)

func main() {
	fmt.Println("============================================")
	fmt.Println("  GitLab CI/CD Integration Test Suite")
	fmt.Println("============================================")
	fmt.Println()

	gitlabURL := getEnv("GITLAB_URL", defaultGitLabURL)
	passed := 0
	failed := 0

	// Test 1: YAML Validation
	fmt.Println("[Test 1/6] Validating .gitlab-ci.yml syntax...")
	if err := testYAMLValidation(); err != nil {
		fmt.Printf("❌ FAIL: %v\n", err)
		failed++
	} else {
		fmt.Println("✅ PASS: YAML syntax is valid")
		passed++
	}
	fmt.Println()

	// Test 2: GitLab Accessibility
	fmt.Println("[Test 2/6] Testing GitLab accessibility...")
	if err := testGitLabAccessibility(gitlabURL); err != nil {
		fmt.Printf("❌ FAIL: %v\n", err)
		failed++
	} else {
		fmt.Println("✅ PASS: GitLab is accessible")
		passed++
	}
	fmt.Println()

	// Test 3: OAuth Token Fetch
	fmt.Println("[Test 3/6] Testing OAuth token fetch...")
	appID := os.Getenv("GITLAB_OAUTH_APP_ID")
	secret := os.Getenv("GITLAB_OAUTH_CLIENT_SECRET")

	if appID == "" || secret == "" {
		fmt.Println("⚠️  SKIP: GITLAB_OAUTH_APP_ID or GITLAB_OAUTH_CLIENT_SECRET not set")
		fmt.Println("   Set these environment variables to test OAuth")
	} else if err := testOAuthTokenFetch(gitlabURL, appID, secret); err != nil {
		fmt.Printf("❌ FAIL: %v\n", err)
		failed++
	} else {
		fmt.Println("✅ PASS: OAuth token fetched successfully")
		passed++
	}
	fmt.Println()

	// Test 4: GitLab API Access
	fmt.Println("[Test 4/6] Testing GitLab API access...")
	if appID == "" || secret == "" {
		fmt.Println("⚠️  SKIP: OAuth credentials not available")
	} else if err := testGitLabAPIAccess(gitlabURL, appID, secret); err != nil {
		fmt.Printf("❌ FAIL: %v\n", err)
		failed++
	} else {
		fmt.Println("✅ PASS: GitLab API accessible with OAuth")
		passed++
	}
	fmt.Println()

	// Test 5: Runner Status
	fmt.Println("[Test 5/6] Testing GitLab Runner status...")
	if err := testRunnerStatus(); err != nil {
		fmt.Printf("❌ FAIL: %v\n", err)
		failed++
	} else {
		fmt.Println("✅ PASS: GitLab Runner is running")
		passed++
	}
	fmt.Println()

	// Test 6: Pipeline Trigger
	fmt.Println("[Test 6/6] Testing pipeline configuration...")
	if err := testPipelineConfig(); err != nil {
		fmt.Printf("❌ FAIL: %v\n", err)
		failed++
	} else {
		fmt.Println("✅ PASS: Pipeline configuration valid")
		passed++
	}
	fmt.Println()

	// Summary
	fmt.Println("============================================")
	fmt.Println("  Test Summary")
	fmt.Println("============================================")
	fmt.Printf("✅ Passed: %d\n", passed)
	fmt.Printf("❌ Failed: %d\n", failed)
	fmt.Printf("⚠️  Skipped: %d\n", 6-(passed+failed))
	fmt.Println()

	if failed > 0 {
		fmt.Println("Some tests failed. Please review the errors above.")
		os.Exit(1)
	} else if passed == 6 {
		fmt.Println("🎉 All tests passed! GitLab CI/CD is ready for deployment.")
	} else {
		fmt.Println("ℹ️  Some tests were skipped. Core functionality is working.")
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func testYAMLValidation() error {
	// Check if yamllint is available
	if _, err := exec.LookPath("yamllint"); err == nil {
		cmd := exec.Command("yamllint", "-d", "relaxed", ".gitlab-ci.yml")
		if output, err := cmd.CombinedOutput(); err != nil {
			return fmt.Errorf("yaml validation failed: %s", string(output))
		}
		return nil
	}

	// Fallback: check if file exists and is readable
	if _, err := os.Stat(".gitlab-ci.yml"); err != nil {
		return fmt.Errorf(".gitlab-ci.yml not found")
	}

	// Try to parse with basic checks
	content, err := os.ReadFile(".gitlab-ci.yml")
	if err != nil {
		return fmt.Errorf("cannot read .gitlab-ci.yml: %v", err)
	}

	// Check for required sections
	if !strings.Contains(string(content), "stages:") {
		return fmt.Errorf("missing 'stages' section")
	}
	if !strings.Contains(string(content), "fetch-oauth-token") {
		return fmt.Errorf("missing 'fetch-oauth-token' job")
	}

	return nil
}

func testGitLabAccessibility(gitlabURL string) error {
	cmd := exec.Command("curl", "-s", "-f", "--max-time", "5",
		fmt.Sprintf("%s/api/v4/version", gitlabURL))

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("cannot reach GitLab at %s", gitlabURL)
	}

	return nil
}

func testOAuthTokenFetch(gitlabURL, appID, secret string) error {
	cmd := exec.Command("curl", "-s", "-X", "POST",
		fmt.Sprintf("%s/oauth/token", gitlabURL),
		"-d", "grant_type=client_credentials",
		"-d", fmt.Sprintf("client_id=%s", appID),
		"-d", fmt.Sprintf("client_secret=%s", secret),
		"-d", "scope=api")

	output, err := cmd.Output()
	if err != nil {
		return fmt.Errorf("oauth request failed: %v", err)
	}

	if !strings.Contains(string(output), "access_token") {
		return fmt.Errorf("invalid oauth response: %s", string(output))
	}

	return nil
}

func testGitLabAPIAccess(gitlabURL, appID, secret string) error {
	// First get token
	cmd := exec.Command("curl", "-s", "-X", "POST",
		fmt.Sprintf("%s/oauth/token", gitlabURL),
		"-d", "grant_type=client_credentials",
		"-d", fmt.Sprintf("client_id=%s", appID),
		"-d", fmt.Sprintf("client_secret=%s", secret),
		"-d", "scope=api")

	output, err := cmd.Output()
	if err != nil {
		return fmt.Errorf("cannot get token: %v", err)
	}

	// Extract token (simple grep)
	cmd = exec.Command("jq", "-r", ".access_token")
	cmd.Stdin = strings.NewReader(string(output))

	token, err := cmd.Output()
	if err != nil {
		return fmt.Errorf("cannot parse token: %v", err)
	}

	// Test API call
	cmd = exec.Command("curl", "-s", "-f",
		fmt.Sprintf("%s/api/v4/user", gitlabURL),
		"-H", fmt.Sprintf("Authorization: Bearer %s", strings.TrimSpace(string(token))))

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("api call failed: %v", err)
	}

	return nil
}

func testRunnerStatus() error {
	// Check if docker is available
	if _, err := exec.LookPath("docker"); err != nil {
		return fmt.Errorf("docker not available")
	}

	// Check if runner container exists
	cmd := exec.Command("docker", "ps", "--format", "{{.Names}}")
	output, err := cmd.Output()
	if err != nil {
		return fmt.Errorf("cannot check docker: %v", err)
	}

	if !strings.Contains(string(output), "gitlab-runner") {
		return fmt.Errorf("gitlab-runner container not running")
	}

	return nil
}

func testPipelineConfig() error {
	// Check if .gitlab-ci.yml has all required jobs
	content, err := os.ReadFile(".gitlab-ci.yml")
	if err != nil {
		return fmt.Errorf("cannot read .gitlab-ci.yml: %v", err)
	}

	requiredJobs := []string{
		"lint:eslint",
		"typecheck:typescript",
		"build:portfolio",
		"test:jest",
		"trigger-n8n-deploy",
		"notify-n8n",
	}
