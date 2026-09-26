// skills derives candidate skills from job application history and generates resume proposals.
//
// Usage: go run . [-data=<path>] [-min-freq=<n>]
package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/jclee941/resume/tools/scripts/enrichment/lib"
)

const enrichSource = "skills"

func main() {
	var (
		dataPath = flag.String("data", "", "Path to application records JSON (default: auto-discover)")
		minFreq  = flag.Int("min-freq", 3, "Minimum frequency to propose a skill")
	)
	flag.Parse()

	root, err := lib.RepoRoot()
	if err != nil {
		lib.Fatal(err)
	}

	// Auto-discover application data if not provided.
	if *dataPath == "" {
		*dataPath = findApplicationData(root)
	}

	if *dataPath == "" {
		lib.Fatal(fmt.Errorf("no application data found; provide -data flag with path to application records JSON"))
	}

	records, err := readJSONFileTyped[[]lib.ApplicationRecord](*dataPath)
	if err != nil {
		lib.Fatalf("read application records: %v", err)
	}

	lib.Infof("Loaded %d application records from %s", len(records), *dataPath)

	frequencies := extractSkills(records)
	if len(frequencies) == 0 {
		lib.Infof("No skills extracted from application history")
		return
	}

	if err := generateProposals(root, frequencies, *minFreq); err != nil {
		lib.Fatalf("generate proposals: %v", err)
	}

	fmt.Printf("[DONE] Generated skill proposals from %d application(s)\n", len(records))
}

func findApplicationData(root string) string {
	// Common locations for application data.
	candidates := []string{
		"apps/job-server/data/applications.json",
		"apps/job-server/auto-apply-status.json",
		"apps/job-server/data/job-applications.json",
	}

	for _, candidate := range candidates {
		path := filepath.Join(root, candidate)
		if _, err := os.Stat(path); err == nil {
			lib.Infof("Auto-discovered application data: %s", path)
			return path
		}
	}

	// Try to find any JSON file in job-server that looks like application data.
	dataDir := filepath.Join(root, "apps", "job-server", "data")
	entries, err := os.ReadDir(dataDir)
	if err == nil {
		for _, entry := range entries {
			if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".json") {
				path := filepath.Join(dataDir, entry.Name())
				lib.Infof("Auto-discovered application data: %s", path)
				return path
			}
		}
	}

	return ""
}

// readJSONFileTyped is a helper to read a JSON file into a typed value.
func readJSONFileTyped[T any](path string) (T, error) {
	var v T
	data, err := os.ReadFile(path)
	if err != nil {
		return v, fmt.Errorf("read %s: %w", path, err)
	}
	if err := json.Unmarshal(data, &v); err != nil {
		return v, fmt.Errorf("parse %s: %w", path, err)
	}
	return v, nil
}
