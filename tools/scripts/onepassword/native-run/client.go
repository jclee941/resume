package main

import (
	"context"
	"errors"

	onepassword "github.com/1password/onepassword-sdk-go"
)

type lookupEnvFunc func(string) (string, bool)

func buildClientOptions(cfg runnerConfig, lookupEnv lookupEnvFunc) ([]onepassword.ClientOption, error) {
	options := []onepassword.ClientOption{
		onepassword.WithIntegrationInfo(cfg.integrationName, cfg.integrationVersion),
	}
	switch cfg.auth {
	case authServiceAccount:
		token, ok := lookupEnv("OP_SERVICE_ACCOUNT_TOKEN")
		if !ok || token == "" {
			return nil, errors.New("OP_SERVICE_ACCOUNT_TOKEN is required for --auth service-account")
		}
		options = append(options, onepassword.WithServiceAccountToken(token))
	case authDesktop:
		options = append(options, onepassword.WithDesktopAppIntegration(cfg.account))
	default:
		return nil, errors.New("unsupported 1Password SDK auth mode")
	}
	return options, nil
}

func newOnePasswordClient(ctx context.Context, cfg runnerConfig, lookupEnv lookupEnvFunc) (*onepassword.Client, error) {
	options, err := buildClientOptions(cfg, lookupEnv)
	if err != nil {
		return nil, err
	}
	return onepassword.NewClient(ctx, options...)
}
