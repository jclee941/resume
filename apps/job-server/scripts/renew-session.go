// Session Renewal Automation (Wanted + JobKorea)
//
// Runs before auto-apply to ensure valid session. Executes CDP cookie
// extraction when the session is expired or expiring soon.
package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"time"
)

const (
	platformWanted   = "wanted"
	platformJobKorea = "jobkorea"

	logFileTemplate = "/home/jclee/.opencode/logs/session-renewal-%s.log"
	resumeDir       = "/home/jclee/dev/resume"
	chromeDebugURL  = "http://127.0.0.1:9222/json/version"
)

var (
	flagPlatform string
)

func init() {
	flag.StringVar(&flagPlatform, "platform", "wanted", "Platform to renew: wanted or jobkorea")
}

type sessionStatus struct {
	Valid   bool   `json:"valid"`
	Age     int64  `json:"age"`
	TTL     int64  `json:"ttl"`
	Message string `json:"message,omitempty"`
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

func runNodeCheck(platform string, thresholdMs int, logFile string) (bool, error) {
	script := fmt.Sprintf(`
const { SessionManager } = require('./src/shared/services/session');
const status = SessionManager.checkHealth('%s', %d);
console.log(JSON.stringify(status, null, 2));
process.exit(status.valid ? 0 : 1);
`, platform, thresholdMs)

	cmd := exec.Command("node", "-e", script)
	cmd.Dir = filepath.Join(resumeDir, "apps", "job-server")

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	output := stdout.String()

	// Also print output for tee effect
	if output != "" {
		fmt.Print(output)
		if logFile != "" {
			f, _ := os.OpenFile(logFile, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
			if f != nil {
				f.WriteString(output)
				f.Close()
			}
		}
	}
	if stderr.String() != "" {
		fmt.Print(stderr.String())
	}

	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			return false, exitErr
		}
		return false, err
	}
	return true, nil
}

func checkChromeAvailable() bool {
	client := &http.Client{Timeout: 2 * time.Second}
	resp, err := client.Get(chromeDebugURL)
	if err != nil {
		return false
	}
	resp.Body.Close()
	return resp.StatusCode == http.StatusOK
}

func runExtractCookies(platform string, logFile string) error {
	scriptPath := filepath.Join(resumeDir, "apps", "job-server", "scripts", "extract-cookies-cdp.js")
	cmd := exec.Command("node", scriptPath, platform)
	cmd.Dir = filepath.Join(resumeDir, "apps", "job-server")

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	output := stdout.String()

	// Also print output for tee effect
	if output != "" {
		fmt.Print(output)
		if logFile != "" {
			f, _ := os.OpenFile(logFile, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
			if f != nil {
				f.WriteString(output)
				f.Close()
			}
		}
	}
	if stderr.String() != "" {
		fmt.Print(stderr.String())
	}

	return err
}

func sendNotification(webhookURL, event, platform, reason, message string) error {
	if webhookURL == "" {
		return nil
	}

	payload := map[string]string{
		"event":     event,
		"platform":  platform,
		"reason":    reason,
		"timestamp": time.Now().Format(time.RFC3339),
		"message":   message,
	}

	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	req, err := http.NewRequest("POST", webhookURL, bytes.NewReader(data))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	io.ReadAll(resp.Body)
	return nil
}

func main() {
	flag.Parse()

	platform := flagPlatform
	if platform != platformWanted && platform != platformJobKorea {
		fmt.Fprintf(os.Stderr, "Usage: %s [wanted|jobkorea]\n", os.Args[0])
		os.Exit(2)
	}

	logFile := fmt.Sprintf(logFileTemplate, platform)
	ensureLogDir(logFile)

	log(fmt.Sprintf("=== Session Renewal Started: %s ===", platform), logFile)

	// Check current session (4 hour threshold)
	valid, err := runNodeCheck(platform, 4*60*60*1000, logFile)
	if err == nil && valid {
		log("✅ Session is valid, no renewal needed", logFile)
		os.Exit(0)
	}

	log("⚠️  Session expired or expiring soon, attempting CDP renewal...", logFile)

	// Check if Chrome is running with remote debugging
	if !checkChromeAvailable() {
		log("❌ Chrome DevTools not available", logFile)
		log("   Please start Chrome with: google-chrome --remote-debugging-port=9222", logFile)
		log("   Or login manually and run: node scripts/extract-cookies-cdp.js "+platform, logFile)

		if n8nURL := os.Getenv("N8N_WEBHOOK_URL"); n8nURL != "" {
			msg := fmt.Sprintf("⚠️ '%s' session renewal failed. Please login manually.", platform)
			sendNotification(n8nURL, "session_renewal_failed", platform, "chrome_devtools_not_available", msg)
		}

		os.Exit(1)
	}

	// Extract cookies via CDP
	log("🔐 Extracting cookies via CDP...", logFile)
	if err := runExtractCookies(platform, logFile); err != nil {
		log("❌ Cookie extraction failed", logFile)
		os.Exit(1)
	}

	// Verify new session (24 hour threshold)
	valid, err = runNodeCheck(platform, 24*60*60*1000, logFile)
	if err == nil && valid {
		log("✅ Session renewed successfully", logFile)

		if n8nURL := os.Getenv("N8N_WEBHOOK_URL"); n8nURL != "" {
			msg := fmt.Sprintf("✅ '%s' session renewed successfully", platform)
			sendNotification(n8nURL, "session_renewal_success", platform, "", msg)
		}

		os.Exit(0)
	}

	log("❌ Session renewal failed", logFile)
	os.Exit(1)
}
