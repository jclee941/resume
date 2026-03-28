// Install systemd timers for resume sync and daily job automation
package main

import (
	"fmt"
	"os"
	"os/exec"
	"os/user"
	"path/filepath"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
	os.Exit(0)
}

func run() error {
	// Get current user
	curUser, err := user.Current()
	if err != nil {
		return fmt.Errorf("failed to get current user: %w", err)
	}
	username := curUser.Username

	// Get script directory (directory where the executable is located)
	execPath, err := os.Executable()
	if err != nil {
		return fmt.Errorf("failed to get executable path: %w", err)
	}
	scriptDir := filepath.Dir(execPath)

	// Copy resume-sync service files
	if err := sudoCp(filepath.Join(scriptDir, "resume-sync.service"), "/etc/systemd/system/resume-sync@.service"); err != nil {
		return err
	}
	if err := sudoCp(filepath.Join(scriptDir, "resume-sync.timer"), "/etc/systemd/system/resume-sync@.timer"); err != nil {
		return err
	}

	// Enable and start resume-sync timer
	if err := sudoSystemctl("daemon-reload"); err != nil {
		return err
	}
	if err := sudoSystemctl("enable", fmt.Sprintf("resume-sync@%s.timer", username)); err != nil {
		return err
	}
	if err := sudoSystemctl("start", fmt.Sprintf("resume-sync@%s.timer", username)); err != nil {
		return err
	}

	// Copy job-daily-run service files
	if err := sudoCp(filepath.Join(scriptDir, "job-daily-run.service"), "/etc/systemd/system/job-daily-run@.service"); err != nil {
		return err
	}
	if err := sudoCp(filepath.Join(scriptDir, "job-daily-run.timer"), "/etc/systemd/system/job-daily-run@.timer"); err != nil {
		return err
	}
	if err := sudoSystemctl("daemon-reload"); err != nil {
		return err
	}
	if err := sudoSystemctl("enable", fmt.Sprintf("job-daily-run@%s.timer", username)); err != nil {
		return err
	}
	if err := sudoSystemctl("start", fmt.Sprintf("job-daily-run@%s.timer", username)); err != nil {
		return err
	}

	fmt.Println("✓ Installed resume-sync timer (09:00 KST daily)")
	fmt.Println("✓ Installed job-daily-run timer (10:00 KST daily)")
	fmt.Println("  Check: systemctl list-timers --all | grep -E 'resume-sync|job-daily'")
	fmt.Printf("  Logs:  journalctl -u resume-sync@%s.service\n", username)
	fmt.Printf("  Logs:  journalctl -u job-daily-run@%s.service\n", username)

	return nil
}

func sudoCp(src, dst string) error {
	cmd := exec.Command("sudo", "cp", src, dst)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to copy %s to %s: %w", src, dst, err)
	}
	return nil
}

func sudoSystemctl(args ...string) error {
	cmd := exec.Command("sudo", append([]string{"systemctl"}, args...)...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("systemctl %v failed: %w", args, err)
	}
	return nil
}
