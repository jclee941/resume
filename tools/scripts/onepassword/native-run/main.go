package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"strings"
	"time"
)

func main() {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	if err := run(ctx, os.Args[1:], os.LookupEnv); err != nil {
		var commandErr *commandExitError
		if errors.As(err, &commandErr) {
			os.Exit(commandErr.ExitCode())
		}
		fmt.Fprintln(os.Stderr, err)
		printUsage()
		os.Exit(1)
	}
}

func run(ctx context.Context, args []string, lookupEnv lookupEnvFunc) error {
	cfg, err := parseArgs(args)
	if err != nil {
		return err
	}
	client, err := newOnePasswordClient(ctx, cfg, lookupEnv)
	if err != nil {
		return err
	}
	refs, err := parseEnvFile(cfg.envFile)
	if err != nil {
		return fmt.Errorf("parse %s: %w", cfg.envFile, err)
	}
	env, err := resolveEnv(ctx, client.Secrets(), refs)
	if err != nil {
		return err
	}
	return runCommand(cfg.command, append(os.Environ(), env...))
}

type secretResolver interface {
	Resolve(ctx context.Context, secretReference string) (string, error)
}

func resolveEnv(ctx context.Context, resolver secretResolver, refs []EnvRef) ([]string, error) {
	env := make([]string, 0, len(refs))
	for _, ref := range refs {
		value := ref.Value
		if strings.HasPrefix(value, "op://") {
			resolved, err := resolver.Resolve(ctx, value)
			if err != nil {
				return nil, fmt.Errorf("resolve %s from 1Password SDK: %w", ref.Name, err)
			}
			value = resolved
		}
		env = append(env, ref.Name+"="+value)
	}
	return env, nil
}

func runCommand(command []string, env []string) error {
	cmd := exec.Command(command[0], command[1:]...)
	cmd.Env = env
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		var exitErr *exec.ExitError
		if errors.As(err, &exitErr) {
			return &commandExitError{
				code: exitErr.ExitCode(),
				err:  fmt.Errorf("run command: %w", err),
			}
		}
		return fmt.Errorf("run command: %w", err)
	}
	return nil
}

type commandExitError struct {
	code int
	err  error
}

func (e *commandExitError) Error() string {
	return e.err.Error()
}

func (e *commandExitError) Unwrap() error {
	return e.err
}

func (e *commandExitError) ExitCode() int {
	return e.code
}

func printUsage() {
	fmt.Fprintln(os.Stderr, "usage: npm run op:native:run -- [--env-file ../../.env.1password] [--auth service-account|desktop] [--account name-or-uuid] -- <command> [args...]")
}
