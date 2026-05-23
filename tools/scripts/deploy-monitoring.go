package main

import (
	"flag"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

const (
	colorReset  = "\033[0m"
	colorRed    = "\033[31m"
	colorGreen  = "\033[32m"
	colorYellow = "\033[33m"
	colorBlue   = "\033[34m"
	colorCyan   = "\033[36m"
)

type fileMapping struct {
	local  string
	remote string
}

func main() {
	var (
		targetHost = flag.String("host", "192.168.50.215", "Target Docker host IP or hostname")
		sshUser    = flag.String("user", "root", "SSH user for remote host")
		sshKey     = flag.String("ssh-key", filepath.Join(os.Getenv("HOME"), ".ssh", "id_rsa"), "Path to SSH private key")
		remoteDir  = flag.String("remote-dir", "/opt/monitoring", "Remote deployment directory")
		dryRun     = flag.Bool("dry-run", false, "Show what would be done without executing")
	)
	flag.Parse()

	repoRoot, err := resolveRepoRoot()
	if err != nil {
		fatalf("failed to resolve repository root: %v", err)
	}

	printHeader(*targetHost, *remoteDir)

	if *dryRun {
		infof("dry-run mode enabled; no remote changes will be made")
	}

	// Resolve local paths relative to repo root
	composeSource := filepath.Join(repoRoot, "infrastructure", "docker", "docker-compose.monitoring.yml")

	mappings := []fileMapping{
		{local: composeSource, remote: filepath.Join(*remoteDir, "docker-compose.yml")},
		{local: filepath.Join(repoRoot, "infrastructure", "configs", "grafana", "grafana.ini"), remote: filepath.Join(*remoteDir, "configs", "grafana", "grafana.ini")},
		{local: filepath.Join(repoRoot, "infrastructure", "configs", "grafana", "provisioning", "datasources", "datasources.yml"), remote: filepath.Join(*remoteDir, "configs", "grafana", "provisioning", "datasources", "datasources.yml")},
		{local: filepath.Join(repoRoot, "infrastructure", "configs", "grafana", "resume-portfolio-dashboard.json"), remote: filepath.Join(*remoteDir, "configs", "grafana", "resume-portfolio-dashboard.json")},
		{local: filepath.Join(repoRoot, "infrastructure", "configs", "prometheus", "prometheus.yml"), remote: filepath.Join(*remoteDir, "configs", "prometheus", "prometheus.yml")},
		{local: filepath.Join(repoRoot, "infrastructure", "configs", "prometheus", "blackbox.yml"), remote: filepath.Join(*remoteDir, "configs", "prometheus", "blackbox.yml")},
		{local: filepath.Join(repoRoot, "infrastructure", "configs", "prometheus", "rules", "resume-portfolio.yml"), remote: filepath.Join(*remoteDir, "configs", "prometheus", "rules", "resume-portfolio.yml")},
		{local: filepath.Join(repoRoot, "infrastructure", "configs", "alertmanager", "alertmanager.yml"), remote: filepath.Join(*remoteDir, "configs", "alertmanager", "alertmanager.yml")},
	}

	// Validate local files exist
	for _, m := range mappings {
		if _, err := os.Stat(m.local); err != nil {
			fatalf("local file not found: %s", m.local)
		}
	}

	// Step 1: create remote directory structure
	infof("creating remote directory structure on %s...", *targetHost)
	dirs := []string{
		filepath.Join(*remoteDir, "configs", "grafana", "provisioning", "datasources"),
		filepath.Join(*remoteDir, "configs", "prometheus", "rules"),
		filepath.Join(*remoteDir, "configs", "alertmanager"),
	}
	for _, d := range dirs {
		if err := sshMkdir(*targetHost, *sshUser, *sshKey, d, *dryRun); err != nil {
			fatalf("failed to create remote directory %s: %v", d, err)
		}
	}
	okf("remote directories ready")

	// Step 2: copy docker-compose with adjusted volume paths
	infof("preparing docker-compose.yml with adjusted paths...")
	if err := copyComposeAdjusted(composeSource, *targetHost, *sshUser, *sshKey, filepath.Join(*remoteDir, "docker-compose.yml"), *dryRun); err != nil {
		fatalf("failed to copy docker-compose.yml: %v", err)
	}
	okf("docker-compose.yml copied")

	// Step 3: SCP configs
	infof("copying configuration files...")
	for _, m := range mappings[1:] {
		if err := scpFile(m.local, *targetHost, *sshUser, *sshKey, m.remote, *dryRun); err != nil {
			fatalf("failed to copy %s: %v", m.local, err)
		}
	}
	okf("configuration files copied (%d files)", len(mappings)-1)

	// Step 4: deploy via SSH
	infof("starting monitoring stack on %s...", *targetHost)
	deployCmd := fmt.Sprintf("cd %s && docker compose -f docker-compose.yml up -d", *remoteDir)
	if err := sshRun(*targetHost, *sshUser, *sshKey, deployCmd, *dryRun); err != nil {
		fatalf("docker compose up failed: %v", err)
	}
	okf("docker compose up completed")

	if *dryRun {
		infof("dry-run complete; no verification performed")
		fmt.Printf("\n%sDashboard URL:%s https://grafana.jclee.me\n", colorCyan, colorReset)
		return
	}

	// Step 5: verification
	infof("waiting for containers to stabilize...")
	time.Sleep(3 * time.Second)

	infof("verifying container status...")
	verifyCmd := fmt.Sprintf("cd %s && docker compose ps --format 'table {{.Name}}\t{{.Status}}\t{{.State}}'", *remoteDir)
	out, err := sshOutput(*targetHost, *sshUser, *sshKey, verifyCmd)
	if err != nil {
		warnf("verification check failed: %v", err)
	} else {
		fmt.Println()
		fmt.Println(out)
	}

	// Check that expected containers are running
	expectedContainers := []string{"grafana", "prometheus", "loki", "alertmanager", "jaeger"}
	allRunning := true
	for _, name := range expectedContainers {
		checkCmd := fmt.Sprintf("cd %s && docker compose ps -q %s | xargs -r docker inspect -f '{{.State.Running}}'", *remoteDir, name)
		status, err := sshOutput(*targetHost, *sshUser, *sshKey, checkCmd)
		if err != nil || strings.TrimSpace(status) != "true" {
			warnf("container %s is not running", name)
			allRunning = false
		}
	}

	fmt.Println()
	if allRunning {
		fmt.Printf("%sAll containers are running.%s\n", colorGreen, colorReset)
	} else {
		fmt.Printf("%sSome containers are not running. Check logs with:%s\n", colorYellow, colorReset)
		fmt.Printf("  ssh -i %s %s@%s 'cd %s && docker compose logs'\n", *sshKey, *sshUser, *targetHost, *remoteDir)
	}

	fmt.Printf("\n%sDashboard URL:%s     https://grafana.jclee.me\n", colorCyan, colorReset)
	fmt.Printf("%sPrometheus URL:%s   http://%s:9090\n", colorCyan, colorReset, *targetHost)
	fmt.Printf("%sAlertmanager URL:%s http://%s:9093\n", colorCyan, colorReset, *targetHost)
	fmt.Printf("%sJaeger URL:%s       http://%s:16686\n", colorCyan, colorReset, *targetHost)
}

func resolveRepoRoot() (string, error) {
	cwd, err := os.Getwd()
	if err != nil {
		return "", err
	}
	// If already at repo root (or below tools/scripts), walk up until we find a marker
	dir := cwd
	for {
		if _, err := os.Stat(filepath.Join(dir, "package.json")); err == nil {
			return dir, nil
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}
	return cwd, nil
}

func sshMkdir(host, user, keyPath, remoteDir string, dryRun bool) error {
	cmdStr := fmt.Sprintf("mkdir -p %s", remoteDir)
	return sshRun(host, user, keyPath, cmdStr, dryRun)
}

func scpFile(localPath, host, user, keyPath, remotePath string, dryRun bool) error {
	if dryRun {
		infof("[dry-run] would scp %s → %s:%s", localPath, host, remotePath)
		return nil
	}
	cmd := exec.Command("scp", "-i", keyPath, "-o", "StrictHostKeyChecking=no", "-o", "UserKnownHostsFile=/dev/null", localPath, fmt.Sprintf("%s@%s:%s", user, host, remotePath))
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

func sshRun(host, user, keyPath, command string, dryRun bool) error {
	if dryRun {
		infof("[dry-run] would ssh %s@%s '%s'", user, host, command)
		return nil
	}
	cmd := exec.Command("ssh", "-i", keyPath, "-o", "StrictHostKeyChecking=no", "-o", "UserKnownHostsFile=/dev/null", fmt.Sprintf("%s@%s", user, host), command)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

func sshOutput(host, user, keyPath, command string) (string, error) {
	cmd := exec.Command("ssh", "-i", keyPath, "-o", "StrictHostKeyChecking=no", "-o", "UserKnownHostsFile=/dev/null", fmt.Sprintf("%s@%s", user, host), command)
	out, err := cmd.CombinedOutput()
	return string(out), err
}

func copyComposeAdjusted(sourcePath, host, user, keyPath, remotePath string, dryRun bool) error {
	data, err := os.ReadFile(sourcePath)
	if err != nil {
		return err
	}
	// Rewrite relative volume paths from ../configs/ to ./configs/
	adjusted := strings.ReplaceAll(string(data), "../configs/", "./configs/")
	// Also rewrite the reference comment about deployment path
	adjusted = strings.ReplaceAll(adjusted, "docker-compose.monitoring.yml", "docker-compose.yml")

	tmpFile, err := os.CreateTemp("", "docker-compose-*.yml")
	if err != nil {
		return err
	}
	defer os.Remove(tmpFile.Name())

	if _, err := tmpFile.WriteString(adjusted); err != nil {
		tmpFile.Close()
		return err
	}
	tmpFile.Close()

	return scpFile(tmpFile.Name(), host, user, keyPath, remotePath, dryRun)
}

func printHeader(host, remoteDir string) {
	fmt.Printf("%sMonitoring Stack Deployment%s\n", colorBlue, colorReset)
	fmt.Printf("target host: %s\n", host)
	fmt.Printf("remote dir:  %s\n\n", remoteDir)
}

func infof(format string, args ...any) {
	fmt.Printf("%s[INFO]%s %s\n", colorBlue, colorReset, fmt.Sprintf(format, args...))
}

func okf(format string, args ...any) {
	fmt.Printf("%s[OK]%s   %s\n", colorGreen, colorReset, fmt.Sprintf(format, args...))
}

func warnf(format string, args ...any) {
	fmt.Printf("%s[WARN]%s %s\n", colorYellow, colorReset, fmt.Sprintf(format, args...))
}

func fatalf(format string, args ...any) {
	fmt.Printf("%s[FATAL]%s %s\n", colorRed, colorReset, fmt.Sprintf(format, args...))
	os.Exit(1)
}
