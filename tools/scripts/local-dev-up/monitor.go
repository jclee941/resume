package main

import (
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

func renderSpinner(spec serviceSpec, printer *linePrinter, done <-chan struct{}) {
	frames := []string{"⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"}
	ticker := time.NewTicker(180 * time.Millisecond)
	defer ticker.Stop()

	idx := 0
	for {
		select {
		case <-done:
			return
		case <-ticker.C:
			printer.print("%s[%s]%s Starting %s... %s\n", spec.Color, spec.DisplayName, ldColorReset, spec.DisplayName, frames[idx])
			idx = (idx + 1) % len(frames)
		}
	}
}

func streamLogs(spec serviceSpec, reader io.Reader, printer *linePrinter) {
	buf := make([]byte, 0, 32*1024)
	chunk := make([]byte, 4096)
	for {
		n, err := reader.Read(chunk)
		if n > 0 {
			buf = append(buf, chunk[:n]...)
			for {
				idx := bytesIndexByte(buf, '\n')
				if idx < 0 {
					break
				}
				line := strings.TrimRight(string(buf[:idx]), "\r")
				printer.print("%s[%s]%s %s\n", spec.Color, spec.DisplayName, ldColorReset, line)
				buf = buf[idx+1:]
			}
		}
		if err != nil {
			if !errors.Is(err, io.EOF) {
				printer.print("%s[%s]%s log stream error: %v\n", ldColorRed, spec.DisplayName, ldColorReset, err)
			}
			if len(buf) > 0 {
				line := strings.TrimRight(string(buf), "\r")
				printer.print("%s[%s]%s %s\n", spec.Color, spec.DisplayName, ldColorReset, line)
			}
			return
		}
	}
}

func waitForHealth(spec serviceSpec, exitCh chan error) error {
	deadline := time.Now().Add(spec.HealthTimeout)
	client := &http.Client{Timeout: 2 * time.Second}

	for {
		select {
		case err := <-exitCh:
			select {
			case exitCh <- err:
			default:
			}
			if err == nil {
				return errors.New("process exited before becoming healthy")
			}
			return fmt.Errorf("process exited before becoming healthy: %w", err)
		default:
		}

		if time.Now().After(deadline) {
			return fmt.Errorf("timeout after %s", spec.HealthTimeout.Round(time.Second))
		}

		resp, err := client.Get(spec.HealthURL)
		if err == nil {
			resp.Body.Close()
			if resp.StatusCode >= 200 && resp.StatusCode < 500 {
				return nil
			}
		}

		time.Sleep(600 * time.Millisecond)
	}
}
