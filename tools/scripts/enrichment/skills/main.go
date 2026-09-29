// skills derives candidate skills from job application history and generates resume proposals.
//
// Usage: go run . -data=<path> [-min-freq=<n>]
package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"

	"github.com/jclee941/resume/tools/scripts/enrichment/lib"
)

const enrichSource = "skills"

func main() {
	var (
		dataPath = flag.String("data", "", "Path to application records JSON (required)")
		minFreq  = flag.Int("min-freq", 3, "Minimum frequency to propose a skill")
	)
	flag.Parse()

	root, err := lib.RepoRoot()
	if err != nil {
		lib.Fatal(err)
	}

	if *dataPath == "" {
		lib.Fatal(fmt.Errorf("provide -data flag with path to application records JSON"))
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
