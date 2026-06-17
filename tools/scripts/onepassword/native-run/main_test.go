package main

import (
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
)

func TestParseArgs_acceptsServiceAccountAuthAndCommand(t *testing.T) {
	// Given
	args := []string{
		"--env-file", "op-refs.fixture",
		"--auth", "service-account",
		"--",
		"npm", "run", "test:node",
	}

	// When
	cfg, err := parseArgs(args)

	// Then
	if err != nil {
		t.Fatalf("parseArgs returned error: %v", err)
	}
	if cfg.envFile != "op-refs.fixture" {
		t.Fatalf("envFile = %q, want op-refs.fixture", cfg.envFile)
	}
	if cfg.auth != authServiceAccount {
		t.Fatalf("auth = %q, want %q", cfg.auth, authServiceAccount)
	}
	if cfg.account != "" {
		t.Fatalf("account = %q, want empty account for service-account auth", cfg.account)
	}
	wantCommand := []string{"npm", "run", "test:node"}
	if !reflect.DeepEqual(cfg.command, wantCommand) {
		t.Fatalf("command = %#v, want %#v", cfg.command, wantCommand)
	}
}

func TestParseArgs_requiresAccountWhenDesktopAuth(t *testing.T) {
	// Given
	args := []string{
		"--auth", "desktop",
		"--",
		"go", "test", "./onepassword/native-run",
	}

	// When
	_, err := parseArgs(args)

	// Then
	if err == nil {
		t.Fatal("parseArgs returned nil error, want desktop auth to require --account")
	}
	if !strings.Contains(err.Error(), "--account") {
		t.Fatalf("error = %q, want message mentioning --account", err)
	}
}

func TestBuildClientOptions_rejectsMissingServiceAccountToken(t *testing.T) {
	// Given
	cfg := runnerConfig{
		auth:    authServiceAccount,
		envFile: "op-refs.fixture",
		command: []string{"true"},
	}
	lookupEnv := func(string) (string, bool) {
		return "", false
	}

	// When
	_, err := buildClientOptions(cfg, lookupEnv)

	// Then
	if err == nil {
		t.Fatal("buildClientOptions returned nil error, want missing token failure")
	}
	if !strings.Contains(err.Error(), "OP_SERVICE_ACCOUNT_TOKEN") {
		t.Fatalf("error = %q, want message mentioning OP_SERVICE_ACCOUNT_TOKEN", err)
	}
}

func TestRunChecksServiceAccountTokenBeforeReadingEnvFile(t *testing.T) {
	// Given
	args := []string{
		"--env-file", filepath.Join(t.TempDir(), "missing.fixture"),
		"--auth", "service-account",
		"--",
		"node", "-e", "console.log('CHILD_RAN')",
	}
	lookupEnv := func(string) (string, bool) {
		return "", false
	}

	// When
	err := run(t.Context(), args, lookupEnv)

	// Then
	if err == nil {
		t.Fatal("run returned nil error, want missing token failure")
	}
	if !strings.Contains(err.Error(), "OP_SERVICE_ACCOUNT_TOKEN") {
		t.Fatalf("error = %q, want message mentioning OP_SERVICE_ACCOUNT_TOKEN", err)
	}
	if strings.Contains(err.Error(), "missing.fixture") {
		t.Fatalf("error = %q, want auth failure before env file access", err)
	}
}

func TestRunCommand_returnsExitCodeError_whenChildExits(t *testing.T) {
	// Given
	command := []string{
		os.Args[0],
		"-test.run=TestRunCommand_helperProcessExit",
	}
	env := append(os.Environ(), "NATIVE_RUN_EXIT_HELPER=1")

	// When
	err := runCommand(command, env)

	// Then
	if err == nil {
		t.Fatal("runCommand returned nil error, want child exit failure")
	}
	exitErr, ok := err.(interface{ ExitCode() int })
	if !ok {
		t.Fatalf("runCommand error type = %T, want exit-code error", err)
	}
	if exitErr.ExitCode() != 7 {
		t.Fatalf("exit code = %d, want 7", exitErr.ExitCode())
	}
}

func TestRunCommand_helperProcessExit(t *testing.T) {
	if os.Getenv("NATIVE_RUN_EXIT_HELPER") != "1" {
		return
	}
	os.Exit(7)
}

func TestParseEnvFile_parsesOpRefsAndLiteralsFromTempFixture(t *testing.T) {
	// Given
	envPath := filepath.Join(t.TempDir(), "op-refs.fixture")
	content := strings.Join([]string{
		"# committed fixture shape without secret values",
		"export DATABASE_URL=op://homelab/resume/database-url",
		`WANTED_EMAIL="person@example.test"`,
		"PLAIN_VALUE=literal-value",
		"",
	}, "\n")
	if err := os.WriteFile(envPath, []byte(content), 0o600); err != nil {
		t.Fatalf("write fixture: %v", err)
	}

	// When
	got, err := parseEnvFile(envPath)

	// Then
	if err != nil {
		t.Fatalf("parseEnvFile returned error: %v", err)
	}
	want := []EnvRef{
		{Name: "DATABASE_URL", Value: "op://homelab/resume/database-url"},
		{Name: "WANTED_EMAIL", Value: "person@example.test"},
		{Name: "PLAIN_VALUE", Value: "literal-value"},
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("refs = %#v, want %#v", got, want)
	}
}

func TestParseEnvFile_redactsInvalidEnvLineValues(t *testing.T) {
	// Given
	envPath := filepath.Join(t.TempDir(), "bad.fixture")
	secretLine := "PLAINTEXT_SECRET_WITHOUT_SEPARATOR"
	if err := os.WriteFile(envPath, []byte(secretLine+"\n"), 0o600); err != nil {
		t.Fatalf("write fixture: %v", err)
	}

	// When
	_, err := parseEnvFile(envPath)

	// Then
	if err == nil {
		t.Fatal("parseEnvFile returned nil error, want invalid line failure")
	}
	if strings.Contains(err.Error(), secretLine) {
		t.Fatalf("error = %q, must not include raw env line", err)
	}
	if !strings.Contains(err.Error(), "line 1") {
		t.Fatalf("error = %q, want line number for operator repair", err)
	}
}
