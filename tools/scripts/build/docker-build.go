package main

import (
	"fmt"
	"os"
	"os/exec"
	"strings"
)

const (
	RED    = "\033[0;31m"
	GREEN  = "\033[0;32m"
	YELLOW = "\033[1;33m"
	NC     = "\033[0m"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "%sError: %s%s\n", RED, err, NC)
		os.Exit(1)
	}
}

func run() error {
	// Get version from package.json
	version, err := getVersion()
	if err != nil {
		return fmt.Errorf("failed to get version: %w", err)
	}

	imageName := "resume"
	tag := fmt.Sprintf("%s:%s", imageName, version)
	latestTag := fmt.Sprintf("%s:latest", imageName)
	devTag := fmt.Sprintf("%s:dev", imageName)

	fmt.Printf("%sBuilding Docker images for Resume service%s\n", GREEN, NC)
	fmt.Printf("%sVersion: %s%s\n", YELLOW, version, NC)
	fmt.Println()

	// Check if Docker is running
	if err := checkDocker(); err != nil {
		return err
	}

	// Clean previous images
	fmt.Printf("%sCleaning previous images...%s\n", YELLOW, NC)
	cleanImages(latestTag, devTag)

	// Build production image
	fmt.Printf("%sBuilding production image (%s)...%s\n", YELLOW, tag, NC)
	if err := buildProductionImage(tag, latestTag, version); err != nil {
		return err
	}

	// Build development image
	fmt.Printf("%sBuilding development image (%s)...%s\n", YELLOW, devTag, NC)
	if err := buildDevImage(devTag, version); err != nil {
		return err
	}

	// Create .docker.env file
	fmt.Printf("%sUpdating .docker.env...%s\n", YELLOW, NC)
	if err := createDockerEnv(version); err != nil {
		return fmt.Errorf("failed to create .docker.env: %w", err)
	}

	fmt.Println()
	fmt.Printf("%sBuild completed successfully!%s\n", GREEN, NC)
	fmt.Printf("%sImages created:%s\n", YELLOW, NC)
	fmt.Printf("  - %s\n", tag)
	fmt.Printf("  - %s\n", latestTag)
	fmt.Printf("  - %s\n", devTag)
	fmt.Println()
	fmt.Printf("%sTo run:%s\n", YELLOW, NC)
	fmt.Println("  Production:  npm run docker:run")
	fmt.Println("  Development:  npm run docker:run:dev")
	fmt.Println("  Docker Compose:  npm run docker:compose")

	return nil
}

func getVersion() (string, error) {
	cmd := exec.Command("node", "-p", "require('./package.json').version")
	cmd.Dir = getProjectRoot()

	output, err := cmd.Output()
	if err != nil {
		return "", fmt.Errorf("node command failed: %w", err)
	}

	return strings.TrimSpace(string(output)), nil
}

func getProjectRoot() string {
	return "../../"
}

func checkDocker() error {
	cmd := exec.Command("docker", "info")
	cmd.Stdout = nil
	cmd.Stderr = nil

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("Docker is not running")
	}
	return nil
}

func cleanImages(tags ...string) {
	for _, tag := range tags {
		cmd := exec.Command("docker", "rmi", tag)
		cmd.Run() // Ignore errors
	}
}

func buildProductionImage(tag, latestTag, version string) error {
	args := []string{
		"build",
		"--tag", tag,
		"--tag", latestTag,
		"--build-arg", fmt.Sprintf("VERSION=%s", version),
		".",
	}

	cmd := exec.Command("docker", args...)
	cmd.Dir = getProjectRoot()

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("docker build failed: %w", err)
	}
	return nil
}

func buildDevImage(devTag, version string) error {
	args := []string{
		"build",
		"--target", "builder",
		"--tag", devTag,
		"--build-arg", fmt.Sprintf("VERSION=%s", version),
		".",
	}

	cmd := exec.Command("docker", args...)
	cmd.Dir = getProjectRoot()

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("docker build failed: %w", err)
	}
	return nil
}

func createDockerEnv(version string) error {
	content := fmt.Sprintf(`# Docker environment variables
NODE_ENV=production
PORT=3000

# Version (auto-populated from package.json)
npm_package_version=%s

# Add any additional environment variables here
# API_ENDPOINTS=...
`, version)

	return os.WriteFile(".docker.env", []byte(content), 0644)
}
