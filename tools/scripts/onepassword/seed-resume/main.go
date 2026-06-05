package main

import (
	"bufio"
	"bytes"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"strings"
)

const (
	defaultEnvFile = ".env"
	defaultVault   = "homelab"
	defaultItem    = "resume"
)

var allowedKeys = map[string]bool{
	"WANTED_EMAIL":           true,
	"WANTED_PASSWORD":        true,
	"WANTED_ONEID_CLIENT_ID": true,
	"WANTED_RESUME_ID":       true,
	"WANTED_COOKIES":         true,
	"JOBKOREA_USERNAME":      true,
	"JOBKOREA_EMAIL":         true,
	"JOBKOREA_PASSWORD":      true,
	"JOBKOREA_RNO":           true,
	"JOBKOREA_COOKIES":       true,
	"CLIPROXY_BASE":          true,
	"CLIPROXY_API_KEY":       true,
	"ADMIN_TOKEN":            true,
	"N8N_WEBHOOK_SECRET":     true,
	"AUTH_SYNC_SECRET":       true,
	"SESSION_ENCRYPTION_KEY": true,
	"CLOUDFLARE_ACCOUNT_ID":  true,
	"CLOUDFLARE_API_KEY":     true,
	"CLOUDFLARE_API_TOKEN":   true,
	"CLOUDFLARE_EMAIL":       true,
}

type EnvValue struct {
	Name  string
	Value string
}

func main() {
	envFile, vault, item, err := parseArgs(os.Args[1:])
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		printSeedUsage()
		os.Exit(2)
	}

	values, err := readEnvValues(envFile)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to read %s: %v\n", envFile, err)
		os.Exit(1)
	}
	if len(values) == 0 {
		fmt.Fprintf(os.Stderr, "no supported resume secret keys found in %s\n", envFile)
		os.Exit(1)
	}

	if err := ensureSignedIn(); err != nil {
		fmt.Fprintf(os.Stderr, "1Password CLI is not ready: %v\n", err)
		os.Exit(1)
	}

	updated := 0
	for _, value := range values {
		if err := setField(vault, item, value); err != nil {
			fmt.Fprintf(os.Stderr, "failed to set %s: %v\n", value.Name, err)
			os.Exit(1)
		}
		fmt.Printf("[OK] stored %s in 1Password item %s/%s\n", value.Name, vault, item)
		updated++
	}
	fmt.Printf("Stored %d resume secret reference value(s). Plaintext values were not printed.\n", updated)
}

func parseArgs(args []string) (string, string, string, error) {
	envFile := defaultEnvFile
	vault := defaultVault
	item := defaultItem
	for len(args) > 0 {
		switch args[0] {
		case "--env-file":
			if len(args) < 2 {
				return "", "", "", errors.New("--env-file requires a path")
			}
			envFile = args[1]
			args = args[2:]
		case "--vault":
			if len(args) < 2 {
				return "", "", "", errors.New("--vault requires a name")
			}
			vault = args[1]
			args = args[2:]
		case "--item":
			if len(args) < 2 {
				return "", "", "", errors.New("--item requires a title")
			}
			item = args[1]
			args = args[2:]
		default:
			return "", "", "", fmt.Errorf("unknown argument: %s", args[0])
		}
	}
	return envFile, vault, item, nil
}

func readEnvValues(path string) ([]EnvValue, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	var values []EnvValue
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		line = strings.TrimPrefix(line, "export ")
		name, raw, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		name = strings.TrimSpace(name)
		if !allowedKeys[name] {
			continue
		}
		value := strings.Trim(strings.TrimSpace(raw), "\"")
		if value == "" || strings.HasPrefix(value, "op://") {
			continue
		}
		values = append(values, EnvValue{Name: name, Value: value})
	}
	return values, scanner.Err()
}

func ensureSignedIn() error {
	cmd := exec.Command("op", "account", "list")
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		message := strings.TrimSpace(stderr.String())
		if message == "" {
			message = err.Error()
		}
		return errors.New(message)
	}
	return nil
}

func setField(vault, item string, value EnvValue) error {
	assignment := fmt.Sprintf("%s[password]=%s", value.Name, value.Value)
	cmd := exec.Command("op", "item", "edit", item, "--vault", vault, assignment)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		message := strings.TrimSpace(stderr.String())
		if message == "" {
			message = err.Error()
		}
		return errors.New(message)
	}
	return nil
}

func printSeedUsage() {
	fmt.Fprintln(os.Stderr, "usage: npm run op:seed:resume -- [--env-file ../../.env] [--vault homelab] [--item resume]")
}
