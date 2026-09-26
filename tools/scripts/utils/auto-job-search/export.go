package main

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/csv"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

func (a *App) exportResults() error {
	if !a.cfg.ExportEnabled {
		return nil
	}
	if err := a.exportJSON(); err != nil {
		a.logWarning(fmt.Sprintf("json export failed: %v", err))
	}
	if err := a.exportCSV(); err != nil {
		a.logWarning(fmt.Sprintf("csv export failed: %v", err))
	}
	return nil
}

func (a *App) exportJSON() error {
	if strings.TrimSpace(a.cfg.ExportJSONPath) == "" {
		return nil
	}
	if err := os.MkdirAll(filepath.Dir(a.cfg.ExportJSONPath), 0o755); err != nil {
		return err
	}
	b, err := json.MarshalIndent(a.jobs, "", "  ")
	if err != nil {
		return err
	}
	if err := os.WriteFile(a.cfg.ExportJSONPath, b, 0o644); err != nil {
		return err
	}
	a.logSuccess("Exported JSON: " + a.cfg.ExportJSONPath)
	return nil
}

func (a *App) exportCSV() error {
	if strings.TrimSpace(a.cfg.ExportCSVPath) == "" {
		return nil
	}
	if err := os.MkdirAll(filepath.Dir(a.cfg.ExportCSVPath), 0o755); err != nil {
		return err
	}
	f, err := os.Create(a.cfg.ExportCSVPath)
	if err != nil {
		return err
	}
	defer f.Close()

	w := csv.NewWriter(f)
	defer w.Flush()
	_ = w.Write([]string{"platform", "id", "title", "company", "location", "url", "experience_min", "experience_max"})
	for _, j := range a.jobs {
		min := ""
		max := ""
		if j.ExperienceMin != nil {
			min = strconv.Itoa(*j.ExperienceMin)
		}
		if j.ExperienceMax != nil {
			max = strconv.Itoa(*j.ExperienceMax)
		}
		_ = w.Write([]string{j.Platform, j.ID, j.Title, j.Company, j.Location, j.URL, min, max})
	}
	if err := w.Error(); err != nil {
		return err
	}
	a.logSuccess("Exported CSV: " + a.cfg.ExportCSVPath)
	return nil
}

func (a *App) sendWebhook(success bool, message string) error {
	if strings.TrimSpace(a.cfg.WebhookURL) == "" {
		return nil
	}
	payload := map[string]any{
		"timestamp":    time.Now().Format(time.RFC3339),
		"command":      a.activeCmd,
		"success":      success,
		"message":      message,
		"total_jobs":   len(a.jobs),
		"search_calls": a.searchCalls,
		"search_hits":  a.searchHits,
		"platforms":    a.cfg.Platforms,
	}
	b, _ := json.Marshal(payload)
	req, err := http.NewRequest(http.MethodPost, a.cfg.WebhookURL, bytes.NewReader(b))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	if strings.TrimSpace(a.cfg.WebhookAuthToken) != "" {
		req.Header.Set("Authorization", "Bearer "+a.cfg.WebhookAuthToken)
	}
	if strings.TrimSpace(a.cfg.WebhookSecret) != "" {
		h := hmac.New(sha256.New, []byte(a.cfg.WebhookSecret))
		_, _ = h.Write(b)
		req.Header.Set("X-Webhook-Signature", "sha256="+hex.EncodeToString(h.Sum(nil)))
	}

	resp, err := a.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("webhook status %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}
	a.logSuccess("Webhook notification sent")
	return nil
}

func errString(err error) string {
	if err == nil {
		return "ok"
	}
	return err.Error()
}
