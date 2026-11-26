// Command pr runs the fast CI gates locally, then opens a pull request for the current feature
// branch and enables squash auto-merge. Required checks must pass before GitHub merges; see
// .github/AGENTS.md for the policy.
package main

import (
	"fmt"
	"os"
	"os/exec"
	"strings"
)

const baseRef = "origin/master"

// preflight mirrors the Validate steps that most often rejected first pushes: lint and both
// typecheck passes (CI runs tsconfig.strict.json, which local edits rarely exercised).
var preflight = [][]string{
	{"npm", "run", "lint"},
	{"npm", "run", "typecheck"},
	{"npm", "run", "typecheck:strict"},
}

func run(name string, args ...string) (string, error) {
	cmd := exec.Command(name, args...)
	cmd.Stderr = os.Stderr
	out, err := cmd.Output()
	return strings.TrimSpace(string(out)), err
}

func fail(format string, args ...any) {
	fmt.Fprintf(os.Stderr, "pr: "+format+"\n", args...)
	os.Exit(1)
}

func must(name string, args ...string) string {
	out, err := run(name, args...)
	if err != nil {
		fail("%s %s failed: %v", name, strings.Join(args, " "), err)
	}
	return out
}

func main() {
	branch := must("git", "rev-parse", "--abbrev-ref", "HEAD")
	if branch == "master" || branch == "HEAD" {
		fail("refusing to run on '%s'; switch to a feature branch", branch)
	}
	if must("git", "status", "--porcelain") != "" {
		fail("working tree is dirty; commit or stash first")
	}
	must("git", "fetch", "origin", "master")
	if must("git", "log", baseRef+"..HEAD", "--oneline") == "" {
		fail("no commits ahead of %s", baseRef)
	}

	title := must("git", "log", "-1", "--format=%s")
	body := must("git", "log", baseRef+"..HEAD", "--format=- %s")

	for _, step := range preflight {
		cmd := exec.Command(step[0], step[1:]...)
		cmd.Stdout = os.Stderr
		cmd.Stderr = os.Stderr
		if err := cmd.Run(); err != nil {
			fail("preflight %s failed: %v; fix it before pushing", strings.Join(step, " "), err)
		}
	}

	must("git", "push", "--set-upstream", "origin", branch)
	url := must("gh", "pr", "create", "--base", "master", "--head", branch, "--title", title, "--body", body)
	must("gh", "pr", "merge", url, "--auto", "--squash", "--delete-branch")
	fmt.Println(url)
}
