package main

import (
	"fmt"
	"os"
	"os/exec"
	"strings"
	"time"
)

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
