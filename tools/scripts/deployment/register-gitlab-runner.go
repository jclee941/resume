package main

import (
	"bufio"
	"fmt"
	"os"
	"os/exec"
	"strings"
)

const (
	defaultGitLabURL  = "http://gitlab.jclee.me"
	defaultRunnerName = "Docker Runner for Resume"
	defaultRunnerTags = "docker,linux"
)

func main() {
	gitlabURL := getEnv("GITLAB_URL", defaultGitLabURL)
	registrationToken := getRegistrationToken()
	runnerName := getEnv("RUNNER_NAME", defaultRunnerName)
	runnerTags := getEnv("RUNNER_TAGS", defaultRunnerTags)

	if registrationToken == "" {
		printUsage(gitlabURL)
		os.Exit(1)
	}

	// Check if docker is available
	if !commandExists("docker") {
		fmt.Println("❌ Docker is not installed or not in PATH")
		os.Exit(1)
	}

	// Setup config directory
	configDir := getEnv("RUNNER_CONFIG_DIR", os.Getenv("HOME")+"/.gitlab-runner/config")
	if err := os.MkdirAll(configDir, 0755); err != nil {
		fmt.Printf("❌ Cannot create config directory: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("ℹ️  Using config directory: %s\n", configDir)

	// Check if runner container exists
	if containerExists("gitlab-runner") {
		fmt.Println("⚠️  GitLab Runner container already exists")
		fmt.Print("Do you want to remove and recreate it? (y/N): ")

		reader := bufio.NewReader(os.Stdin)
		response, _ := reader.ReadString('\n')
		response = strings.TrimSpace(strings.ToLower(response))

		if response == "y" || response == "yes" {
			fmt.Println("Stopping and removing existing runner...")
			exec.Command("docker", "stop", "gitlab-runner").Run()
			exec.Command("docker", "rm", "gitlab-runner").Run()
		} else {
			fmt.Println("Using existing runner container")
			if err := registerExistingRunner(gitlabURL, registrationToken, runnerName, runnerTags); err != nil {
				fmt.Printf("❌ Registration failed: %v\n", err)
				os.Exit(1)
			}
			fmt.Println("✅ Runner registered successfully!")
			printNextSteps()
			return
		}
	}

	// Create runner container
	fmt.Println("Creating GitLab Runner container...")
	if err := createRunnerContainer(configDir); err != nil {
		fmt.Printf("❌ Failed to create container: %v\n", err)
		os.Exit(1)
	}

	// Wait for container
	fmt.Println("Waiting for runner to be ready...")
	exec.Command("sleep", "3").Run()

	// Register runner
	fmt.Println("Registering runner with GitLab...")
	if err := registerRunner(gitlabURL, registrationToken, runnerName, runnerTags); err != nil {
		fmt.Printf("❌ Registration failed: %v\n", err)
		fmt.Println("Check logs: docker logs gitlab-runner")
		os.Exit(1)
	}

	fmt.Println("✅ Runner registered successfully!")
	printNextSteps()
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getRegistrationToken() string {
	if len(os.Args) > 1 {
		return os.Args[1]
	}
	return os.Getenv("GITLAB_REGISTRATION_TOKEN")
}

func printUsage(gitlabURL string) {
	fmt.Println("❌ Registration token not provided!")
	fmt.Println("Usage: go run setup-gitlab-runner.go [REGISTRATION_TOKEN]")
	fmt.Println()
	fmt.Println("To get a registration token:")
	fmt.Printf("1. Go to: %s/admin/runners (for shared runner)\n", gitlabURL)
	fmt.Println("2. Or: Project → Settings → CI/CD → Runners (for project runner)")
	fmt.Println("3. Copy the registration token")
}

func commandExists(cmd string) bool {
	_, err := exec.LookPath(cmd)
	return err == nil
}

func containerExists(name string) bool {
	cmd := exec.Command("docker", "ps", "-a", "--format", "{{.Names}}")
	output, err := cmd.Output()
	if err != nil {
		return false
	}
	return strings.Contains(string(output), name)
}

func createRunnerContainer(configDir string) error {
	cmd := exec.Command("docker", "run", "-d", "--name", "gitlab-runner",
		"--restart", "always",
		"-v", "/var/run/docker.sock:/var/run/docker.sock",
		"-v", configDir+":/etc/gitlab-runner",
		"gitlab/gitlab-runner:latest")
	return cmd.Run()
}

func registerRunner(gitlabURL, token, name, tags string) error {
	cmd := exec.Command("docker", "exec", "gitlab-runner", "gitlab-runner", "register",
		"--non-interactive",
		"--url", gitlabURL,
		"--token", token,
		"--executor", "docker",
		"--docker-image", "node:22-alpine",
		"--description", name,
		"--tag-list", tags,
		"--run-untagged=false",
		"--locked=false",
		"--access-level=not_protected")
	return cmd.Run()
}

func registerExistingRunner(gitlabURL, token, name, tags string) error {
	return registerRunner(gitlabURL, token, name, tags)
}

func printNextSteps() {
	fmt.Println()
	fmt.Println("Verify registration:")
	fmt.Println("  docker exec gitlab-runner gitlab-runner list")
	fmt.Println()
	fmt.Println("View runner in GitLab:")
	fmt.Println("  http://gitlab.jclee.me/admin/runners")
}

func parseRunnerTags(tags string) []string {
	return strings.Split(tags, ",")
}
