// check-env-schema-drift.go — fail CI when a required env key declared in
// any @resume/env Zod schema is missing from .dev.vars.example.
//
// SSOT-031 / issue #35. The wrangler-secret listing comparison is added in
// a follow-up once a `wrangler secret list` parser exists; this first cut
// catches the most common drift (operator forgets to update .dev.vars.example
// after adding a new required env var to a Zod schema).
//
// Required env vars are detected by scanning packages/env/src/schemas/*.js
// for `z.string().min(1...` and similar non-optional Zod calls on top-level
// keys. The detection is intentionally simple: we look for KEY: z.string()
// (or .number()/.enum()) without an .optional() before the comma/newline.
//
// Exit codes:
//
//	0 — no drift
//	1 — drift detected (CI must fail)
//	2 — script invocation error
//
// Usage:
//
//	go run ./tools/ci/check-env-schema-drift.go
//
// Run from repository root.
package main

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
)

const (
	schemaDir   = "packages/env/src/schemas"
	exampleFile = ".dev.vars.example"
)

var (
	// Match an object-property key followed by `z.<something>(...)` and either
	// a comma or end-of-line, with `.optional()` NOT appearing before the comma.
	requiredKeyRe = regexp.MustCompile(`(?m)^\s+([A-Z][A-Z0-9_]*)\s*:\s*z\.[a-zA-Z]+\s*\(.*?\)([\s.a-zA-Z()'"\d{}]*?)[,\n]`)

	// Detect optional() in the suffix.
	optionalRe = regexp.MustCompile(`\.optional\s*\(\s*\)`)
)

func main() {
	required, err := requiredKeysFromSchemas(schemaDir)
	if err != nil {
		fmt.Fprintln(os.Stderr, "check-env-schema-drift:", err)
		os.Exit(2)
	}
	if len(required) == 0 {
		fmt.Println("check-env-schema-drift: no required keys found in", schemaDir)
		os.Exit(0)
	}

	declared, err := keysFromDevVarsExample(exampleFile)
	if err != nil {
		fmt.Fprintln(os.Stderr, "check-env-schema-drift:", err)
		os.Exit(2)
	}

	var missing []string
	for _, key := range required {
		if !declared[key] {
			missing = append(missing, key)
		}
	}
	sort.Strings(missing)

	if len(missing) > 0 {
		fmt.Println()
		fmt.Println("❌ check-env-schema-drift: required env keys missing from", exampleFile+":")
		for _, k := range missing {
			fmt.Println("  -", k)
		}
		fmt.Println()
		fmt.Println("   Each schema-declared required key must appear in", exampleFile,
			"so operators have a discoverable list of values to provision before")
		fmt.Println("   running locally / deploying. Add a placeholder line such as:")
		fmt.Println()
		for _, k := range missing {
			fmt.Printf("     %s=replace-with-real-value\n", k)
		}
		os.Exit(1)
	}

	fmt.Printf("✅ check-env-schema-drift: %d required env key(s) all declared in %s\n", len(required), exampleFile)
}

// requiredKeysFromSchemas walks `dir` for *.js files and returns every
// top-level Zod key whose declaration does not include `.optional()`.
func requiredKeysFromSchemas(dir string) ([]string, error) {
	seen := map[string]bool{}
	var keys []string

	err := filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() || !strings.HasSuffix(path, ".js") {
			return nil
		}
		body, readErr := os.ReadFile(path)
		if readErr != nil {
			return readErr
		}

		matches := requiredKeyRe.FindAllStringSubmatch(string(body), -1)
		for _, m := range matches {
			key := m[1]
			suffix := m[2]
			if optionalRe.MatchString(suffix) {
				continue
			}
			if seen[key] {
				continue
			}
			seen[key] = true
			keys = append(keys, key)
		}
		return nil
	})
	if err != nil {
		return nil, fmt.Errorf("walk %s: %w", dir, err)
	}
	sort.Strings(keys)
	return keys, nil
}

// keysFromDevVarsExample reads `path` and returns the set of `KEY=` names.
func keysFromDevVarsExample(path string) (map[string]bool, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("open %s: %w", path, err)
	}
	defer f.Close()

	out := map[string]bool{}
	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		eq := strings.Index(line, "=")
		if eq <= 0 {
			continue
		}
		key := strings.TrimSpace(line[:eq])
		if key != "" {
			out[key] = true
		}
	}
	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("scan %s: %w", path, err)
	}
	return out, nil
}
