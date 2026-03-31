package main

import (
	"fmt"
	"os"
	"os/exec"
	"strings"
	"time"
)

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
