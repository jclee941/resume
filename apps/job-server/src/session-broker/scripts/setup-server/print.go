package main

import (
	"fmt"
	"strings"
)

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
