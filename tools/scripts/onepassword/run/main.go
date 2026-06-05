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

type EnvRef struct {
	Name  string
	Value string
}

func main() {
	envFile, command, err := parseArgs(os.Args[1:])
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		printUsage()
		os.Exit(2)
	}

	refs, err := parseEnvFile(envFile)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to parse %s: %v\n", envFile, err)
		os.Exit(1)
	}

	env := os.Environ()
	for _, ref := range refs {
		value := ref.Value
		if strings.HasPrefix(value, "op://") {
			value, err = readOnePassword(value)
			if err != nil {
				fmt.Fprintf(os.Stderr, "failed to resolve %s from 1Password: %v\n", ref.Name, err)
				os.Exit(1)
			}
		}
		env = append(env, ref.Name+"="+value)
	}

	cmd := exec.Command(command[0], command[1:]...)
	cmd.Env = env
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		var exitErr *exec.ExitError
		if errors.As(err, &exitErr) {
			os.Exit(exitErr.ExitCode())
		}
		fmt.Fprintf(os.Stderr, "failed to run command: %v\n", err)
		os.Exit(1)
	}
}

func parseArgs(args []string) (string, []string, error) {
	envFile := ".env.1password"
	for len(args) > 0 {
		switch args[0] {
		case "--env-file":
			if len(args) < 2 {
				return "", nil, errors.New("--env-file requires a path")
			}
			envFile = args[1]
			args = args[2:]
		case "--":
			args = args[1:]
			if len(args) == 0 {
				return "", nil, errors.New("missing command after --")
			}
			return envFile, args, nil
		default:
			return "", nil, fmt.Errorf("unknown argument: %s", args[0])
		}
	}
	return "", nil, errors.New("missing -- command separator")
}

func parseEnvFile(path string) ([]EnvRef, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	var refs []EnvRef
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		line = strings.TrimPrefix(line, "export ")
		name, value, ok := strings.Cut(line, "=")
		if !ok {
			return nil, fmt.Errorf("invalid env line: %s", line)
		}
		name = strings.TrimSpace(name)
		value = strings.Trim(strings.TrimSpace(value), "\"")
		if name == "" {
			return nil, fmt.Errorf("empty env key in line: %s", line)
		}
		refs = append(refs, EnvRef{Name: name, Value: value})
	}
	return refs, scanner.Err()
}

func readOnePassword(reference string) (string, error) {
	cmd := exec.Command("op", "read", reference)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	output, err := cmd.Output()
	if err != nil {
		message := strings.TrimSpace(stderr.String())
		if message == "" {
			message = err.Error()
		}
		return "", errors.New(message)
	}
	return strings.TrimRight(string(output), "\r\n"), nil
}

func printUsage() {
	fmt.Fprintln(os.Stderr, "usage: npm run op:run -- [--env-file ../../.env.1password] -- <command> [args...]")
}
