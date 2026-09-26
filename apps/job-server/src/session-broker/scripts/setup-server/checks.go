package main

import (
	"fmt"
	"net"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"time"
)

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
