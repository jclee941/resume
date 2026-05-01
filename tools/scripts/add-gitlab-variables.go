package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
)

// Variable metadata for GitLab CI/CD
type Variable struct {
	Key       string
	Value     string
	Protected bool
	Masked    bool
}

// API response when checking if variable exists
type VariableResponse struct {
	Key string `json:"key"`
}

func main() {
	// Parse command line flags
	gitlabToken := flag.String("token", "", "GitLab API token (or set GITLAB_TOKEN env var)")
	projectID := flag.String("project", "", "GitLab project ID (default: root%2Fresume)")
	flag.Parse()

	// Get token from flag or environment
	token := *gitlabToken
	if token == "" {
		token = os.Getenv("GITLAB_TOKEN")
	}
	if token == "" {
		fmt.Fprintln(os.Stderr, "Error: GitLab token required")
		fmt.Fprintln(os.Stderr, "Usage: go run add-gitlab-variables.go -token <GITLAB_TOKEN>")
		fmt.Fprintln(os.Stderr, "   or: GITLAB_TOKEN=<token> go run add-gitlab-variables.go")
		fmt.Fprintln(os.Stderr, "")
		fmt.Fprintln(os.Stderr, "To create a token:")
		fmt.Fprintln(os.Stderr, "1. Go to GitLab → Profile → Access Tokens")
		fmt.Fprintln(os.Stderr, "2. Create token with 'api' scope")
		os.Exit(1)
	}

	// Get project ID from flag or environment or default
	projID := *projectID
	if projID == "" {
		projID = os.Getenv("PROJECT_ID")
	}
	if projID == "" {
		projID = "root%2Fresume"
	}

	// Capture and validate environment variables
	cfAPIKey := os.Getenv("CLOUDFLARE_API_KEY")
	cfEmail := os.Getenv("CLOUDFLARE_EMAIL")
	cfAccountID := os.Getenv("CLOUDFLARE_ACCOUNT_ID")
	gitlabURL := os.Getenv("GITLAB_URL")

	if cfAPIKey == "" || cfEmail == "" || cfAccountID == "" {
		fmt.Fprintln(os.Stderr, "Error: Required environment variables not set")
		fmt.Fprintln(os.Stderr, "Please set: CLOUDFLARE_API_KEY, CLOUDFLARE_EMAIL, CLOUDFLARE_ACCOUNT_ID")
		os.Exit(1)
	}

	if gitlabURL == "" {
		fmt.Fprintln(os.Stderr, "Error: GITLAB_URL environment variable not set")
		fmt.Fprintln(os.Stderr, "Please set GITLAB_URL to your GitLab instance URL")
		os.Exit(1)
	}

	// Normalize GitLab URL (remove trailing slash)
	gitlabURL = strings.TrimSuffix(gitlabURL, "/")

	fmt.Println("Adding CI/CD variables to GitLab...")
	fmt.Printf("   URL: %s\n", gitlabURL)
	fmt.Printf("   Project: %s\n", strings.Replace(projID, "%2F", "/", -1))
	fmt.Println()

	// Define variables to add
	variables := []Variable{
		{Key: "CLOUDFLARE_API_KEY", Value: cfAPIKey, Protected: true, Masked: true},
		{Key: "CLOUDFLARE_EMAIL", Value: cfEmail, Protected: true, Masked: false},
		{Key: "CLOUDFLARE_ACCOUNT_ID", Value: cfAccountID, Protected: true, Masked: true},
	}

	// Add each variable
	for i, v := range variables {
		fmt.Printf("%d/%d: Adding %s...\n", i+1, len(variables), v.Key)
		if err := addVariable(gitlabURL, token, projID, v); err != nil {
			fmt.Fprintf(os.Stderr, "   Failed: %v\n", err)
			os.Exit(1)
		}
		fmt.Println()
	}

	fmt.Println("All variables added successfully!")
	fmt.Println()
	fmt.Println("Verify with:")
	fmt.Println("   curl -X GET \\")
	fmt.Printf("     --header \"PRIVATE-TOKEN: <your-token>\" \\\n")
	fmt.Printf("     \"%s/api/v4/projects/%s/variables\"\n", gitlabURL, projID)
}

// addVariable adds or updates a GitLab CI/CD variable
func addVariable(gitlabURL, token, projectID string, v Variable) error {
	apiURL := fmt.Sprintf("%s/api/v4/projects/%s/variables/%s", gitlabURL, projectID, v.Key)

	// Check if variable exists
	exists, err := variableExists(gitlabURL, token, projectID, v.Key)
	if err != nil {
		return fmt.Errorf("check existence: %w", err)
	}

	var req *http.Request
	var method string
	var body []byte

	if exists {
		// Update existing variable
		method = "PUT"
		formData := fmt.Sprintf("value=%s&protected=%t&masked=%t", v.Value, v.Protected, v.Masked)
		req, err = http.NewRequest(method, apiURL, strings.NewReader(formData))
		if err != nil {
			return err
		}
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	} else {
		// Create new variable
		method = "POST"
		apiURL = fmt.Sprintf("%s/api/v4/projects/%s/variables", gitlabURL, projectID)
		formData := fmt.Sprintf("key=%s&value=%s&protected=%t&masked=%t", v.Key, v.Value, v.Protected, v.Masked)
		req, err = http.NewRequest(method, apiURL, strings.NewReader(formData))
		if err != nil {
			return err
		}
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	}

	req.Header.Set("PRIVATE-TOKEN", token)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusCreated {
		fmt.Printf("   Success\n")
		return nil
	}

	// Read error body for debugging
	body, _ = io.ReadAll(resp.Body)
	return fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(body))
}

// variableExists checks if a variable already exists in the project
func variableExists(gitlabURL, token, projectID, key string) (bool, error) {
	apiURL := fmt.Sprintf("%s/api/v4/projects/%s/variables/%s", gitlabURL, projectID, key)

	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return false, err
	}
	req.Header.Set("PRIVATE-TOKEN", token)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return false, err
	}
	defer resp.Body.Close()

	// 200 = exists, 404 = does not exist
	if resp.StatusCode == http.StatusOK {
		// Parse response to confirm it's actually the variable
		var varResp VariableResponse
		if err := json.NewDecoder(resp.Body).Decode(&varResp); err != nil {
			// If we can't parse but got 200, assume it exists
			return true, nil
		}
		return varResp.Key == key, nil
	}

	return false, nil
}
