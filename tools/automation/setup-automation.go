//go:build setup_automation

package main

import (
	"bufio"
	"errors"
	"flag"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

const envTemplate = `# Resume Automation Environment Variables
# Source this file before running automation: source .env.automation

# JobKorea Credentials
# export RESUME_JOBKOREA_USER=your_username
# export RESUME_JOBKOREA_PASS=your_password

# Wanted Credentials
# export RESUME_WANTED_EMAIL=your_email@example.com
# export RESUME_WANTED_PASS=your_password


# Automation Settings
export RESUME_MAX_APPLY=5
export RESUME_DRY_RUN=false

# Optional: Notification settings
# export RESUME_NOTIFY_EMAIL=your-email@example.com
# export RESUME_NOTIFY_WEBHOOK=https://hooks.slack.com/...
`

func main() {
	forceEnvOverwrite := flag.Bool("force-env-overwrite", false, "overwrite .env.automation without prompt")
	nonInteractive := flag.Bool("non-interactive", false, "disable prompts and keep existing files")
	flag.Parse()

	scriptDir, projectRoot, err := detectProjectRoot()
	if err != nil {
		fatalf("failed to detect project root from script location: %v", err)
	}
	_ = scriptDir

	userHome, err := resolveHomeDir()
	if err != nil {
		fatalf("failed to resolve user home directory: %v", err)
	}

	euid := os.Geteuid()
	serviceUser := os.Getenv("USER")
	if euid == 0 {
		fmt.Println("==================================")
		fmt.Println("Resume Automation Setup")
		fmt.Println("==================================")
		fmt.Println()
		fmt.Println("⚠️  Warning: Running as root. Service will be created for root user.")
		serviceUser = "root"
	} else {
		if serviceUser == "" {
			serviceUser = "root"
		}
		fmt.Println("==================================")
		fmt.Println("Resume Automation Setup")
		fmt.Println("==================================")
		fmt.Println()
	}

	fmt.Println("📁 Creating log directory...")
	logDir := filepath.Join(userHome, ".opencode", "data", "automation-logs")
	if err := os.MkdirAll(logDir, 0o755); err != nil {
		fatalf("failed to create log directory %s: %v", logDir, err)
	}

	fmt.Println()
	fmt.Println("🔐 Creating environment configuration...")
	envFile := filepath.Join(projectRoot, ".env.automation")
	if err := ensureEnvironmentFile(envFile, *forceEnvOverwrite, *nonInteractive); err != nil {
		fatalf("failed to configure environment file: %v", err)
	}

	fmt.Println()
	fmt.Println("🔧 Creating systemd service...")
	if euid == 0 {
		if err := setupSystemdFiles(projectRoot, serviceUser); err != nil {
			fatalf("failed to create systemd service/timer: %v", err)
		}
		fmt.Println("✅ Created systemd service and timer")
		fmt.Println()
		fmt.Println("To enable and start:")
		fmt.Println("  sudo systemctl daemon-reload")
		fmt.Println("  sudo systemctl enable resume-automation.timer")
		fmt.Println("  sudo systemctl start resume-automation.timer")
		fmt.Println()
		fmt.Println("To check status:")
		fmt.Println("  sudo systemctl status resume-automation.timer")
		fmt.Println("  sudo journalctl -u resume-automation -f")
	} else {
		fmt.Println("⏭️  Skipping systemd setup (requires root). Use crontab instead.")
	}

	fmt.Println()
	fmt.Println("📅 Setting up crontab...")
	if err := ensureCrontabEntry(projectRoot, userHome); err != nil {
		fatalf("failed to configure crontab: %v", err)
	}

	fmt.Println()
	fmt.Println("🧪 Testing automation (dry-run mode)...")
	if err := runDryRun(projectRoot, envFile); err != nil {
		fmt.Println("⚠️  Test run had issues, but setup is complete.")
		fmt.Printf("   Check logs at: %s/\n", logDir)
	}

	fmt.Println()
	fmt.Println("==================================")
	fmt.Println("Setup Complete!")
	fmt.Println("==================================")
	fmt.Println()
	fmt.Println("📋 Next Steps:")
	fmt.Printf("1. Review/edit credentials: %s\n", envFile)
	fmt.Println("2. Run manually: source .env.automation && node tools/automation/resume-automation.js")
	fmt.Printf("3. Check logs: tail -f %s/automation-%s.log\n", logDir, time.Now().Format("2006-01-02"))
	fmt.Println()
	fmt.Println("⏰ Scheduled Runs:")
	fmt.Println("   - Daily at 9:00 AM (crontab)")
	if euid == 0 {
		fmt.Println("   - Daily at 9:00 AM (systemd timer - enable with: sudo systemctl enable resume-automation.timer)")
	}
	fmt.Println()
	fmt.Println("🔧 Useful Commands:")
	fmt.Println("   Manual run:        node tools/automation/resume-automation.js")
	fmt.Println("   Check sessions:    node apps/job-server/scripts/auth-persistent.js --status")
	fmt.Println("   View logs:         ls -la ~/.opencode/data/automation-logs/")
	fmt.Println("   Test sync:         cd apps/job-server && node scripts/profile-sync.js jobkorea --diff")
	fmt.Println()
}

func detectProjectRoot() (scriptDir string, projectRoot string, err error) {
	if _, sourceFile, _, ok := runtime.Caller(0); ok {
		scriptDir = filepath.Dir(sourceFile)
		projectRoot = filepath.Dir(filepath.Dir(scriptDir))
		return scriptDir, projectRoot, nil
	}

	execPath, execErr := os.Executable()
	if execErr != nil {
		return "", "", execErr
	}
	realExecPath, evalErr := filepath.EvalSymlinks(execPath)
	if evalErr == nil {
		execPath = realExecPath
	}
	scriptDir = filepath.Dir(execPath)
	projectRoot = filepath.Dir(filepath.Dir(scriptDir))
	return scriptDir, projectRoot, nil
}

func resolveHomeDir() (string, error) {
	if home := os.Getenv("HOME"); home != "" {
		return home, nil
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	if home == "" {
		return "", errors.New("empty home directory")
	}
	return home, nil
}

func ensureEnvironmentFile(envFile string, forceOverwrite bool, nonInteractive bool) error {
	_, err := os.Stat(envFile)
	if err == nil {
		fmt.Printf("⚠️  Environment file already exists: %s\n", envFile)
		overwrite := forceOverwrite
		if !overwrite {
			if nonInteractive {
				overwrite = false
			} else {
				choice, inputErr := promptYesNo("Overwrite? (y/N): ")
				if inputErr != nil {
					return fmt.Errorf("failed to read overwrite confirmation: %w", inputErr)
				}
				overwrite = choice
			}
		}

		if !overwrite {
			fmt.Println("Skipping environment setup.")
			return nil
		}
	} else if !errors.Is(err, os.ErrNotExist) {
		return fmt.Errorf("failed to inspect environment file %s: %w", envFile, err)
	}

	if writeErr := os.WriteFile(envFile, []byte(envTemplate), 0o644); writeErr != nil {
		return fmt.Errorf("failed to write environment file %s: %w", envFile, writeErr)
	}

	fmt.Printf("✅ Created: %s\n", envFile)
	fmt.Printf("⚠️  Please review and update credentials in %s\n", envFile)
	return nil
}

func promptYesNo(prompt string) (bool, error) {
	fmt.Print(prompt)
	reader := bufio.NewReader(os.Stdin)
	input, err := reader.ReadString('\n')
	if err != nil {
		if errors.Is(err, io.EOF) {
			input = strings.TrimSpace(input)
			return strings.EqualFold(input, "y"), nil
		}
		return false, err
	}
	input = strings.TrimSpace(input)
	return strings.EqualFold(input, "y"), nil
}

func setupSystemdFiles(projectRoot string, serviceUser string) error {
	servicePath := "/etc/systemd/system/resume-automation.service"
	timerPath := "/etc/systemd/system/resume-automation.timer"

	serviceContent := fmt.Sprintf(`[Unit]
Description=Resume Auto-Apply and Sync Automation
After=network.target

[Service]
Type=oneshot
User=%s
WorkingDirectory=%s
Environment=NODE_ENV=production
EnvironmentFile=%s
ExecStart=/usr/bin/node %s
StandardOutput=append:/var/log/resume-automation.log
StandardError=append:/var/log/resume-automation.log

[Install]
WantedBy=multi-user.target
`, serviceUser, projectRoot, filepath.Join(projectRoot, ".env.automation"), filepath.Join(projectRoot, "tools", "automation", "resume-automation.js"))

	timerContent := `[Unit]
Description=Run Resume Automation daily at 9 AM

[Timer]
OnCalendar=*-*-* 09:00:00
Persistent=true

[Install]
WantedBy=timers.target
`

	if err := os.WriteFile(servicePath, []byte(serviceContent), 0o644); err != nil {
		return fmt.Errorf("failed to write %s: %w", servicePath, err)
	}
	if err := os.WriteFile(timerPath, []byte(timerContent), 0o644); err != nil {
		return fmt.Errorf("failed to write %s: %w", timerPath, err)
	}

	return nil
}

func ensureCrontabEntry(projectRoot string, userHome string) error {
	if _, err := exec.LookPath("crontab"); err != nil {
		return fmt.Errorf("crontab command not found: %w", err)
	}

	cronLine := fmt.Sprintf("0 9 * * * cd %s && source %s && /usr/bin/node %s >> %s 2>&1",
		projectRoot,
		filepath.Join(projectRoot, ".env.automation"),
		filepath.Join(projectRoot, "tools", "automation", "resume-automation.js"),
		filepath.Join(userHome, ".opencode", "data", "automation-logs", "cron.log"),
	)

	currentEntries, err := crontabList()
	if err != nil {
		return err
	}

	if strings.Contains(currentEntries, "resume-automation.js") {
		fmt.Println("⚠️  Crontab entry already exists")
		return nil
	}

	var builder strings.Builder
	trimmed := strings.TrimRight(currentEntries, "\n")
	if trimmed != "" {
		builder.WriteString(trimmed)
		builder.WriteString("\n")
	}
	builder.WriteString(cronLine)
	builder.WriteString("\n")

	setCmd := exec.Command("crontab", "-")
	setCmd.Stdin = strings.NewReader(builder.String())
	setCmd.Stdout = os.Stdout
	setCmd.Stderr = os.Stderr
	if runErr := setCmd.Run(); runErr != nil {
		return fmt.Errorf("failed to install crontab entry: %w", runErr)
	}

	fmt.Println("✅ Added crontab entry (runs daily at 9 AM)")
	return nil
}

func crontabList() (string, error) {
	cmd := exec.Command("crontab", "-l")
	output, err := cmd.CombinedOutput()
	if err != nil {
		var exitErr *exec.ExitError
		if errors.As(err, &exitErr) {
			return "", nil
		}
		return "", fmt.Errorf("failed to read existing crontab: %w", err)
	}
	return string(output), nil
}

func runDryRun(projectRoot string, envFile string) error {
	cmd := exec.Command("/usr/bin/node", filepath.Join(projectRoot, "tools", "automation", "resume-automation.js"))
	cmd.Dir = projectRoot
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	fileEnv, err := parseEnvFile(envFile)
	if err != nil {
		return fmt.Errorf("failed to parse environment file %s: %w", envFile, err)
	}

	env := append([]string{}, os.Environ()...)
	for key, value := range fileEnv {
		env = append(env, fmt.Sprintf("%s=%s", key, value))
	}
	env = append(env, "RESUME_DRY_RUN=true")
	cmd.Env = env

	if runErr := cmd.Run(); runErr != nil {
		return runErr
	}
	return nil
}

func parseEnvFile(path string) (map[string]string, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	values := make(map[string]string)
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		if rest, ok := strings.CutPrefix(line, "export "); ok {
			line = strings.TrimSpace(rest)
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}
		key := strings.TrimSpace(parts[0])
		value := strings.TrimSpace(parts[1])
		value = strings.Trim(value, `"'`)
		if key != "" {
			values[key] = value
		}
	}

	if scanErr := scanner.Err(); scanErr != nil {
		return nil, scanErr
	}

	return values, nil
}

func fatalf(format string, args ...any) {
	fmt.Fprintf(os.Stderr, "error: "+format+"\n", args...)
	os.Exit(1)
}
