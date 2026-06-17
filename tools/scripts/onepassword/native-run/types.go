package main

type authMode string

const (
	authServiceAccount authMode = "service-account"
	authDesktop        authMode = "desktop"

	defaultEnvFile            = ".env.1password"
	defaultIntegrationName    = "resume-native-1password"
	defaultIntegrationVersion = "v0.1.0"
)

type runnerConfig struct {
	envFile            string
	auth               authMode
	account            string
	integrationName    string
	integrationVersion string
	command            []string
}

type EnvRef struct {
	Name  string
	Value string
}
