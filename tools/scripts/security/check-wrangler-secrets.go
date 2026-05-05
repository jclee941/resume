// check-wrangler-secrets.go — fail CI when committed wrangler config files
// contain values that look like secrets.
//
// Implements the CI lint guard described in
// docs/security/wrangler-vars-vs-secrets.md (SSOT-030 / issue #37).
//
// Exit codes:
//
//	0  — no suspicious values found
//	1  — at least one suspicious value found (CI must fail)
//	2  — script invocation error
//
// Usage:
//
//	go run ./tools/scripts/security/check-wrangler-secrets.go
//	go run ./tools/scripts/security/check-wrangler-secrets.go apps/foo/wrangler.jsonc
//
// Run from repository root.
package main

import (
	"bufio"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
)

type pattern struct {
	name string
	re   *regexp.Regexp
}

// Allow-listed substrings — when found anywhere on a line, the line is exempt.
// Keep tight; only well-known placeholders / docs hashes / SRI integrity values.
var allowlistRe = regexp.MustCompile(
	`(?i)\$\{[A-Z_]+\}|<[A-Z_]+>|REDACTED|placeholder|example|docs/|sha(256|384|512)-|integrity"`,
)

// Lines whose key clearly identifies a hash/identifier are exempt from the
// long-hex catch-all. Cloudflare KV/D1/R2 IDs are public resource identifiers,
// not credentials.
var hashOrIdKeyRe = regexp.MustCompile(
	`(?i)"(sha[0-9]+|hash|digest|fingerprint|etag|integrity|database_id|"id"|"binding")"`,
)

// "id": "<hex>" — wrangler resource bindings (KV namespace IDs, D1 database
// IDs). These are public identifiers issued by Cloudflare, not secrets.
var resourceIdLineRe = regexp.MustCompile(
	`"(id|database_id|namespace_id|account_id|zone_id|queue_id|bucket_name)"\s*:`,
)

func mustCompile(name, re string) pattern {
	return pattern{name: name, re: regexp.MustCompile(re)}
}

var providerPatterns = []pattern{
	mustCompile("aws-access-key", `AKIA[0-9A-Z]{16}`),
	mustCompile("stripe-live-secret", `sk_live_[0-9a-zA-Z]{16,}`),
	mustCompile("openai-anthropic-style-key", `sk-[A-Za-z0-9_-]{20,}`),
	mustCompile("jwt", `eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}`),
	mustCompile("github-pat", `gh[pous]_[A-Za-z0-9]{30,}`),
	mustCompile("slack-bot-token", `xox[baprs]-[0-9]+-[A-Za-z0-9-]+`),
	mustCompile("google-api-key", `AIza[0-9A-Za-z_-]{35}`),
	mustCompile("private-key-block", `-----BEGIN ([A-Z]+ )?PRIVATE KEY-----`),
}

// Heuristic: a key whose name implies a credential, with a literal string
// value that isn't a known-public placeholder.
var heuristicRe = regexp.MustCompile(
	`(?i)"(api[_-]?key|secret|token|password|passwd|pwd|signing[_-]?key|client[_-]?secret)"\s*:\s*"[^"$<{][^"]{8,}"`,
)

// 32+ contiguous hex chars inside a string literal.
var longHexRe = regexp.MustCompile(`"[a-fA-F0-9]{32,}"`)

// Strip JSON-style line comments (//...) so cautionary fake-key examples in
// comments cannot trigger hits.
var lineCommentRe = regexp.MustCompile(`//.*$`)

func main() {
	files, err := collectFiles(os.Args[1:])
	if err != nil {
		fmt.Fprintln(os.Stderr, "check-wrangler-secrets:", err)
		os.Exit(2)
	}
	if len(files) == 0 {
		fmt.Fprintln(os.Stderr, "check-wrangler-secrets: no wrangler.jsonc or wrangler.toml files found.")
		os.Exit(2)
	}

	totalHits := 0
	for _, f := range files {
		hits := scanFile(f)
		fmt.Printf("check-wrangler-secrets: scanned %s — %d suspicious value(s)\n", f, hits)
		totalHits += hits
	}

	if totalHits > 0 {
		fmt.Println()
		fmt.Printf("❌ check-wrangler-secrets: %d suspicious value(s) found across %d file(s).\n", totalHits, len(files))
		fmt.Println("   See docs/security/wrangler-vars-vs-secrets.md for the boundary policy.")
		fmt.Println("   Move secret values out of wrangler.jsonc and into Workers Secrets:")
		fmt.Println("     wrangler secret put NAME")
		os.Exit(1)
	}

	fmt.Println()
	fmt.Printf("✅ check-wrangler-secrets: no suspicious values across %d file(s).\n", len(files))
}

func collectFiles(args []string) ([]string, error) {
	if len(args) > 0 {
		return args, nil
	}
	// Default: every tracked wrangler.{jsonc,toml} in the repo.
	cmd := exec.Command("git", "ls-files",
		"wrangler.jsonc", "wrangler.toml",
		"*/wrangler.jsonc", "*/wrangler.toml",
		"**/wrangler.jsonc", "**/wrangler.toml",
	)
	out, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("git ls-files failed: %w", err)
	}
	var files []string
	seen := map[string]bool{}
	for _, line := range strings.Split(strings.TrimSpace(string(out)), "\n") {
		line = strings.TrimSpace(line)
		if line == "" || seen[line] {
			continue
		}
		seen[line] = true
		files = append(files, filepath.Clean(line))
	}
	return files, nil
}

func scanFile(path string) int {
	f, err := os.Open(path)
	if err != nil {
		fmt.Fprintf(os.Stderr, "check-wrangler-secrets: skipping %s: %v\n", path, err)
		return 0
	}
	defer f.Close()

	hits := 0
	scanner := bufio.NewScanner(f)
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)

	lineNum := 0
	for scanner.Scan() {
		lineNum++
		raw := scanner.Text()
		stripped := lineCommentRe.ReplaceAllString(raw, "")
		if strings.TrimSpace(stripped) == "" {
			continue
		}
		if allowlistRe.MatchString(stripped) {
			continue
		}

		// Concrete provider patterns
		for _, p := range providerPatterns {
			if p.re.MatchString(stripped) {
				fmt.Printf("::error file=%s,line=%d::Possible secret (%s): %s\n",
					path, lineNum, p.name, strings.TrimSpace(raw))
				hits++
			}
		}

		// Heuristic: credential-shaped key name with literal value
		if heuristicRe.MatchString(stripped) {
			fmt.Printf("::error file=%s,line=%d::Possible secret (heuristic key match): %s\n",
				path, lineNum, strings.TrimSpace(raw))
			hits++
		}

		// Long hex catch-all — but not on hash/identifier keys
		if longHexRe.MatchString(stripped) &&
			!hashOrIdKeyRe.MatchString(stripped) &&
			!resourceIdLineRe.MatchString(stripped) {
			fmt.Printf("::error file=%s,line=%d::Possible secret (long hex blob >=32 chars): %s\n",
				path, lineNum, strings.TrimSpace(raw))
			hits++
		}
	}

	if err := scanner.Err(); err != nil {
		fmt.Fprintf(os.Stderr, "check-wrangler-secrets: read error on %s: %v\n", path, err)
	}
	return hits
}
