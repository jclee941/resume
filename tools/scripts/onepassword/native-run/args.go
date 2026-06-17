package main

import (
	"errors"
	"fmt"
)

func parseArgs(args []string) (runnerConfig, error) {
	cfg := runnerConfig{
		envFile:            defaultEnvFile,
		auth:               authServiceAccount,
		integrationName:    defaultIntegrationName,
		integrationVersion: defaultIntegrationVersion,
	}
	for len(args) > 0 {
		switch args[0] {
		case "--env-file":
			if len(args) < 2 {
				return runnerConfig{}, errors.New("--env-file requires a path")
			}
			cfg.envFile = args[1]
			args = args[2:]
		case "--auth":
			if len(args) < 2 {
				return runnerConfig{}, errors.New("--auth requires service-account or desktop")
			}
			mode := authMode(args[1])
			if mode != authServiceAccount && mode != authDesktop {
				return runnerConfig{}, fmt.Errorf("unsupported auth mode: %s", args[1])
			}
			cfg.auth = mode
			args = args[2:]
		case "--account":
			if len(args) < 2 {
				return runnerConfig{}, errors.New("--account requires a 1Password account name or UUID")
			}
			cfg.account = args[1]
			args = args[2:]
		case "--integration-name":
			if len(args) < 2 {
				return runnerConfig{}, errors.New("--integration-name requires a value")
			}
			cfg.integrationName = args[1]
			args = args[2:]
		case "--integration-version":
			if len(args) < 2 {
				return runnerConfig{}, errors.New("--integration-version requires a value")
			}
			cfg.integrationVersion = args[1]
			args = args[2:]
		case "--":
			cfg.command = args[1:]
			if len(cfg.command) == 0 {
				return runnerConfig{}, errors.New("missing command after --")
			}
			return validateConfig(cfg)
		default:
			return runnerConfig{}, fmt.Errorf("unknown argument: %s", args[0])
		}
	}
	return runnerConfig{}, errors.New("missing -- command separator")
}

func validateConfig(cfg runnerConfig) (runnerConfig, error) {
	if cfg.auth == authDesktop && cfg.account == "" {
		return runnerConfig{}, errors.New("--account is required when --auth desktop")
	}
	return cfg, nil
}
