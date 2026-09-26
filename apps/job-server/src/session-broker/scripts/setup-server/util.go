package main

import (
	"errors"
	"net/url"
	"os"
	"os/exec"
	"regexp"
	"strconv"
	"strings"
	"time"
)

var hex64Pattern = regexp.MustCompile(`^[0-9a-fA-F]{64}$`)

func validateEncryptionKey(value string) error {
	if !hex64Pattern.MatchString(strings.TrimSpace(value)) {
		return errors.New("must be a 64-character hex string")
	}
	return nil
}

func validateNonEmpty(value string) error {
	if strings.TrimSpace(value) == "" {
		return errors.New("must not be empty")
	}
	return nil
}

func validateURL(value string) error {
	parsed, err := url.Parse(strings.TrimSpace(value))
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return errors.New("must be a valid http/https URL")
	}
	return nil
}

func firstCommandOutput(path string, args ...string) (string, error) {
	for _, arg := range args {
		output, err := runCommand(5*time.Second, path, arg)
		if err == nil {
			return output, nil
		}
	}
	return "", errors.New("no version flag succeeded")
}

func runCommand(timeout time.Duration, name string, args ...string) (string, error) {
	cmd := exec.Command(name, args...)
	timer := time.AfterFunc(timeout, func() {
		if cmd.Process != nil {
			_ = cmd.Process.Kill()
		}
	})
	defer timer.Stop()
	output, err := cmd.CombinedOutput()
	return string(output), err
}

func parseSemver(text string) (int, int, error) {
	match := regexp.MustCompile(`(\d+)\.(\d+)`).FindStringSubmatch(text)
	if len(match) != 3 {
		return 0, 0, errors.New("version not found")
	}
	major, err := strconv.Atoi(match[1])
	if err != nil {
		return 0, 0, err
	}
	minor, err := strconv.Atoi(match[2])
	if err != nil {
		return 0, 0, err
	}
	return major, minor, nil
}

func firstNonEmptyLine(text string) string {
	for _, line := range strings.Split(text, "\n") {
		trimmed := strings.TrimSpace(line)
		if trimmed != "" {
			return trimmed
		}
	}
	return "installed"
}

func maskedValue(name, value string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return ""
	}
	if strings.Contains(strings.ToUpper(name), "PASSWORD") || strings.Contains(strings.ToUpper(name), "TOKEN") || strings.Contains(strings.ToUpper(name), "KEY") {
		if len(trimmed) <= 4 {
			return "****"
		}
		return trimmed[:2] + strings.Repeat("*", len(trimmed)-4) + trimmed[len(trimmed)-2:]
	}
	if len(trimmed) > 80 {
		return trimmed[:77] + "..."
	}
	return trimmed
}

func envOrDefault(name, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(name)); value != "" {
		return value
	}
	return fallback
}

func hasFlag(flag string) bool {
	for _, arg := range os.Args[1:] {
		if arg == flag {
			return true
		}
	}
	return false
}

func isTruthy(value string) bool {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "1", "true", "yes", "on":
		return true
	default:
		return false
	}
}
