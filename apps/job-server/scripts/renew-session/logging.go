package main

import (
	"fmt"
	"os"
	"path/filepath"
	"time"
)

func sessionRenewalLogPath(platform string) string {
	home, err := os.UserHomeDir()
	if err != nil {
		home = os.TempDir()
	}
	return filepath.Join(home, ".opencode", "logs", fmt.Sprintf("session-renewal-%s.log", platform))
}

func log(msg string, logFile string) {
	timestamp := time.Now().Format("2006-01-02 15:04:05")
	full := fmt.Sprintf("[%s] %s", timestamp, msg)
	fmt.Println(full)
	if logFile != "" {
		f, err := os.OpenFile(logFile, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
		if err == nil {
			defer f.Close()
			f.WriteString(full + "\n")
		}
	}
}

func logTee(msg string, logFile string) {
	timestamp := time.Now().Format("2006-01-02 15:04:05")
	full := fmt.Sprintf("[%s] %s", timestamp, msg)
	fmt.Println(full)
	if logFile != "" {
		f, err := os.OpenFile(logFile, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
		if err == nil {
			defer f.Close()
			f.WriteString(full + "\n")
			// Also write to stdout for tee effect
		}
	}
}

func ensureLogDir(logFile string) {
	dir := filepath.Dir(logFile)
	os.MkdirAll(dir, 0755)
}
