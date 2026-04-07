package main

import (
	"errors"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"runtime"
	"strconv"
	"strings"
	"time"
)

const (
	colorReset        = "\033[0m"
	colorRed          = "\033[31m"
	colorGreen        = "\033[32m"
	colorYellow       = "\033[33m"
	colorBlue         = "\033[34m"

	profilesDir       = "/opt/wanted-profiles"
	logDir            = "/var/log/session-broker"
	defaultStealthURL = "http://localhost:8080"
	defaultWantedURL  = "https://www.wanted.co.kr/"
)

var hex64Pattern = regexp.MustCompile(`^[0-9a-fA-F]{64}$`)

type checkResult struct {
	name        string
	ok          bool
	detail      string
	remediation string
	value       string
	skipped     bool
}

func main() {
	useXvfb := isTruthy(os.Getenv("SESSION_BROKER_USE_XVFB")) || hasFlag("--use-xvfb")
	stealthURL := envOrDefault("STEALTH_BROWSER_ENDPOINT", defaultStealthURL)
	wantedURL := envOrDefault("SESSION_BROKER_WANTED_REACHABILITY_URL", defaultWantedURL)

	results := []checkResult{
		checkOS(),
		checkBinaryVersion("Chrome/Chromium", []string{"google-chrome", "chromium", "chromium-browser"}, 0, 0),
		checkBinaryVersion("Python", []string{"python3"}, 3, 10),
		checkCloakBrowser(),
		checkBinaryVersion("Node.js", []string{"node"}, 18, 0),
		ensureDirectory(profilesDir, 0o750, true),
		ensureDirectory(logDir, 0o755, false),
		checkWriteAccess(profilesDir),
		checkEnv("SESSION_ENCRYPTION_KEY", validateEncryptionKey),
		checkEnv("WANTED_EMAIL", validateNonEmpty),
		checkWantedSecret(),
		checkEnv("JOB_SERVER_URL", validateURL),
		checkEnv("JOB_SERVER_ADMIN_TOKEN", validateNonEmpty),
		checkConnectivity("Stealth browser", stealthURL),
		checkConnectivity("Wanted API", wantedURL),
		checkXvfb(useXvfb),
	}

	printHeader("Session Broker Server Setup Verification")
	failed := 0
	for _, result := range results {
		printResult(result)
		if !result.ok && !result.skipped {
			failed++
		}
	}

	printSummary(results, stealthURL, wantedURL, useXvfb)
	printServiceInstructions()

	if failed > 0 {
		os.Exit(1)
	}
	os.Exit(0)
}

func checkOS() checkResult {
	if runtime.GOOS != "linux" {
		return checkResult{
			name:        "Operating system",
			ok:          false,
			detail:      fmt.Sprintf("unsupported OS %q; Linux server setup expected", runtime.GOOS),
			remediation: "Run this script on the target Linux host or adapt the setup paths for your platform.",
			value:       runtime.GOOS,
		}
	}
	return checkResult{name: "Operating system", ok: true, detail: "Linux host detected", value: runtime.GOOS}
}

func checkXvfb(required bool) checkResult {
	if !required {
		return checkResult{name: "Xvfb", ok: true, skipped: true, detail: "skipped; SESSION_BROKER_USE_XVFB/--use-xvfb not enabled"}
	}
	result := checkBinaryVersion("Xvfb", []string{"Xvfb"}, 0, 0)
	if !result.ok {
		result.remediation = "Install Xvfb (for example: sudo apt-get install xvfb) or disable the Xvfb mode flag."
	}
	return result
}

func checkBinaryVersion(name string, binaries []string, minMajor, minMinor int) checkResult {
	for _, binary := range binaries {
		path, err := exec.LookPath(binary)
		if err != nil {
			continue
		}
		versionText, versionErr := firstCommandOutput(path, "--version", "-version", "version")
		if versionErr != nil && minMajor == 0 {
			return checkResult{name: name, ok: true, detail: fmt.Sprintf("found at %s", path), value: path}
		}
		if versionErr != nil {
			return checkResult{name: name, ok: false, detail: fmt.Sprintf("found at %s but version could not be determined", path), remediation: "Confirm the binary is runnable and returns a version string.", value: path}
		}
		if minMajor == 0 {
			return checkResult{name: name, ok: true, detail: strings.TrimSpace(versionText), value: path}
		}
		major, minor, parseErr := parseSemver(versionText)
		if parseErr != nil {
			return checkResult{name: name, ok: false, detail: fmt.Sprintf("unable to parse version from %q", strings.TrimSpace(versionText)), remediation: fmt.Sprintf("Install %s %d.%d+ and ensure --version output is standard.", name, minMajor, minMinor), value: path}
		}
		if major < minMajor || (major == minMajor && minor < minMinor) {
			return checkResult{name: name, ok: false, detail: fmt.Sprintf("found %d.%d but require %d.%d+", major, minor, minMajor, minMinor), remediation: fmt.Sprintf("Upgrade %s to version %d.%d or newer.", name, minMajor, minMinor), value: path}
		}
		return checkResult{name: name, ok: true, detail: strings.TrimSpace(versionText), value: path}
	}
	return checkResult{name: name, ok: false, detail: "not found in PATH", remediation: fmt.Sprintf("Install %s and ensure it is available in PATH.", name)}
}

func checkCloakBrowser() checkResult {
	pythonPath, err := exec.LookPath("python3")
	if err != nil {
		return checkResult{name: "CloakBrowser", ok: false, detail: "python3 not found", remediation: "Install Python 3.10+ and pip, then install cloakbrowser with: python3 -m pip install cloakbrowser"}
	}
	output, cmdErr := runCommand(10*time.Second, pythonPath, "-m", "pip", "show", "cloakbrowser")
	if cmdErr != nil {
		return checkResult{name: "CloakBrowser", ok: false, detail: strings.TrimSpace(output), remediation: "Install CloakBrowser with: python3 -m pip install cloakbrowser", value: pythonPath}
	}
	return checkResult{name: "CloakBrowser", ok: true, detail: firstNonEmptyLine(output), value: pythonPath}
}

func ensureDirectory(path string, mode os.FileMode, sensitive bool) checkResult {
	if err := os.MkdirAll(path, mode); err != nil {
		return checkResult{name: fmt.Sprintf("Directory %s", path), ok: false, detail: err.Error(), remediation: fmt.Sprintf("Create the directory with sudo mkdir -p %s and set permissions to %04o.", path, mode)}
	}
	if err := os.Chmod(path, mode); err != nil {
		return checkResult{name: fmt.Sprintf("Directory %s", path), ok: false, detail: err.Error(), remediation: fmt.Sprintf("Run sudo chmod %04o %s", mode, path), value: path}
	}
	detail := fmt.Sprintf("exists with mode %04o", mode)
	if sensitive {
		detail += "; persistent profiles protected"
	}
	return checkResult{name: fmt.Sprintf("Directory %s", path), ok: true, detail: detail, value: path}
}

func checkWriteAccess(path string) checkResult {
	probePath := filepath.Join(path, ".setup-server-write-test")
	content := []byte(strconv.FormatInt(time.Now().UnixNano(), 10))
	if err := os.WriteFile(probePath, content, 0o600); err != nil {
		return checkResult{name: fmt.Sprintf("Write access %s", path), ok: false, detail: err.Error(), remediation: fmt.Sprintf("Grant the session broker user write access to %s.", path), value: path}
	}
	_ = os.Remove(probePath)
	return checkResult{name: fmt.Sprintf("Write access %s", path), ok: true, detail: "temporary write probe succeeded", value: path}
}

func checkEnv(name string, validator func(string) error) checkResult {
	value, ok := os.LookupEnv(name)
	if !ok || strings.TrimSpace(value) == "" {
		return checkResult{name: name, ok: false, detail: "not set", remediation: fmt.Sprintf("Export %s before starting Session Broker.", name)}
	}
	if err := validator(value); err != nil {
		return checkResult{name: name, ok: false, detail: err.Error(), remediation: fmt.Sprintf("Fix %s and rerun the setup verification.", name), value: maskedValue(name, value)}
	}
	return checkResult{name: name, ok: true, detail: "configured", value: maskedValue(name, value)}
}

func checkWantedSecret() checkResult {
	if value := strings.TrimSpace(os.Getenv("WANTED_PASSWORD")); value != "" {
		return checkResult{name: "WANTED_PASSWORD / 1Password", ok: true, detail: "WANTED_PASSWORD configured", value: maskedValue("WANTED_PASSWORD", value)}
	}
	_, opErr := exec.LookPath("op")
	hasToken := strings.TrimSpace(os.Getenv("OP_SERVICE_ACCOUNT_TOKEN")) != "" || strings.TrimSpace(os.Getenv("OP_SESSION")) != "" || strings.TrimSpace(os.Getenv("OP_CONNECT_TOKEN")) != ""
	if opErr == nil && hasToken {
		return checkResult{name: "WANTED_PASSWORD / 1Password", ok: true, detail: "1Password CLI prerequisites detected", value: "op CLI + token/session present"}
	}
	return checkResult{name: "WANTED_PASSWORD / 1Password", ok: false, detail: "WANTED_PASSWORD unset and 1Password CLI prerequisites missing", remediation: "Set WANTED_PASSWORD or configure 1Password CLI access (op plus OP_SERVICE_ACCOUNT_TOKEN/OP_SESSION/OP_CONNECT_TOKEN)."}
}

func checkConnectivity(name, endpoint string) checkResult {
	parsedURL, err := url.Parse(endpoint)
	if err != nil || parsedURL.Scheme == "" || parsedURL.Host == "" {
		return checkResult{name: name, ok: false, detail: fmt.Sprintf("invalid endpoint %q", endpoint), remediation: fmt.Sprintf("Fix the %s endpoint URL.", name), value: endpoint}
	}
	hostPort := parsedURL.Host
	if parsedURL.Port() == "" {
		switch parsedURL.Scheme {
		case "https":
			hostPort = net.JoinHostPort(parsedURL.Hostname(), "443")
		case "http":
			hostPort = net.JoinHostPort(parsedURL.Hostname(), "80")
		}
	}
	conn, dialErr := net.DialTimeout("tcp", hostPort, 3*time.Second)
	if dialErr != nil {
		return checkResult{name: name, ok: false, detail: dialErr.Error(), remediation: fmt.Sprintf("Ensure %s is listening at %s and reachable from this host.", name, endpoint), value: endpoint}
	}
	_ = conn.Close()

	client := &http.Client{Timeout: 5 * time.Second}
	req, err := http.NewRequest(http.MethodGet, endpoint, nil)
	if err != nil {
		return checkResult{name: name, ok: false, detail: err.Error(), remediation: fmt.Sprintf("Fix the %s URL syntax.", name), value: endpoint}
	}
	resp, err := client.Do(req)
	if err != nil {
		if strings.Contains(endpoint, "localhost:8080") {
			return checkResult{name: name, ok: true, detail: fmt.Sprintf("TCP reachable at %s; GET probe not supported (%v)", endpoint, err), value: endpoint}
		}
		return checkResult{name: name, ok: false, detail: err.Error(), remediation: fmt.Sprintf("Check the %s service health and firewall rules for %s.", name, endpoint), value: endpoint}
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 500 {
		return checkResult{name: name, ok: false, detail: fmt.Sprintf("HTTP %d from %s", resp.StatusCode, endpoint), remediation: fmt.Sprintf("Inspect the %s service logs and upstream availability.", name), value: endpoint}
	}
	return checkResult{name: name, ok: true, detail: fmt.Sprintf("reachable; HTTP %d", resp.StatusCode), value: endpoint}
}

func printHeader(title string) {
	fmt.Printf("%s%s%s\n", colorBlue, title, colorReset)
	fmt.Println(strings.Repeat("=", len(title)))
}

func printResult(result checkResult) {
	icon, color := "✓", colorGreen
	status := "PASS"
	if result.skipped {
		icon, color, status = "-", colorYellow, "SKIP"
	} else if !result.ok {
		icon, color, status = "✗", colorRed, "FAIL"
	}
	fmt.Printf("%s%s%s [%s] %s", color, icon, colorReset, status, result.name)
	if result.detail != "" {
		fmt.Printf(" — %s", result.detail)
	}
	if result.value != "" {
		fmt.Printf(" (%s)", result.value)
	}
	fmt.Println()
	if result.remediation != "" && !result.ok {
		fmt.Printf("    remediation: %s\n", result.remediation)
	}
}

func printSummary(results []checkResult, stealthURL, wantedURL string, useXvfb bool) {
	fmt.Println()
	fmt.Printf("%sConfiguration Summary%s\n", colorBlue, colorReset)
	fmt.Println("---------------------")
	fmt.Printf("profiles dir : %s\n", profilesDir)
	fmt.Printf("log dir      : %s\n", logDir)
	fmt.Printf("stealth      : %s\n", stealthURL)
	fmt.Printf("wanted check : %s\n", wantedURL)
	fmt.Printf("xvfb mode    : %t\n", useXvfb)
	fmt.Println()
	pass, fail, skip := 0, 0, 0
	for _, result := range results {
		switch {
		case result.skipped:
			skip++
		case result.ok:
			pass++
		default:
			fail++
		}
	}
	fmt.Printf("passed=%d failed=%d skipped=%d\n", pass, fail, skip)
}

func printServiceInstructions() {
	template := `[Unit]
Description=Session Broker
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=/home/session-broker/app
EnvironmentFile=/etc/session-broker/session-broker.env
ExecStart=/usr/bin/env node apps/job-server/src/session-broker/server/index.js
Restart=on-failure
RestartSec=5
StandardOutput=append:/var/log/session-broker/session-broker.log
StandardError=append:/var/log/session-broker/session-broker.error.log

[Install]
WantedBy=multi-user.target`

	fmt.Println()
	fmt.Printf("%sSystemd Service Template%s\n", colorBlue, colorReset)
	fmt.Println("-----------------------")
	fmt.Printf("Suggested path: %s\n\n%s\n", "/etc/systemd/system/session-broker.service", template)
	fmt.Println()
	fmt.Println("Enable service:")
	fmt.Println("  sudo cp <template-file> /etc/systemd/system/session-broker.service")
	fmt.Println("  sudo systemctl daemon-reload")
	fmt.Println("  sudo systemctl enable --now session-broker.service")
	fmt.Println("  sudo systemctl status session-broker.service")
	fmt.Println("  sudo journalctl -u session-broker.service -f")
}

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
