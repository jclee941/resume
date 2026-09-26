package main

import (
	"flag"
	"fmt"
	"os"
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
