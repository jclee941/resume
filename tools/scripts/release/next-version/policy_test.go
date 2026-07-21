package main

import (
	"os"
	"os/exec"
	"path/filepath"
	"testing"
)

func TestClassifyBump_usesExactConventionalCommitPolicy(t *testing.T) {
	tests := []struct {
		name string
		logs []CommitMessage
		want Bump
	}{
		{name: "breaking footer is major", logs: []CommitMessage{{Subject: "docs: explain", Body: "BREAKING CHANGE: contract"}}, want: BumpMajor},
		{name: "bang is major", logs: []CommitMessage{{Subject: "feat(api)!: replace"}}, want: BumpMajor},
		{name: "feature is minor", logs: []CommitMessage{{Subject: "feat(ui): add"}}, want: BumpMinor},
		{name: "fix performance and refactor are patch", logs: []CommitMessage{{Subject: "perf: tune"}, {Subject: "refactor(core): split"}, {Subject: "fix: correct"}}, want: BumpPatch},
		{name: "other types are none", logs: []CommitMessage{{Subject: "docs: explain"}, {Subject: "chore: tidy"}}, want: BumpNone},
		{name: "injection text remains data", logs: []CommitMessage{{Subject: "docs: $(gh release create pwned); ${{ secrets.TOKEN }}"}}, want: BumpNone},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := ClassifyBump(tt.logs); got != tt.want {
				t.Fatalf("ClassifyBump() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestIncrement_appliesExactMajorMinorPatchAndNoneMappings(t *testing.T) {
	tests := []struct {
		bump Bump
		want string
	}{
		{bump: BumpMajor, want: "v4.0.0"},
		{bump: BumpMinor, want: "v3.8.0"},
		{bump: BumpPatch, want: "v3.7.10"},
		{bump: BumpNone, want: "v3.7.9"},
	}
	for _, tt := range tests {
		t.Run(string(tt.bump), func(t *testing.T) {
			if got := formatVersion(increment(version{major: 3, minor: 7, patch: 9}, tt.bump)); got != tt.want {
				t.Fatalf("increment() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestDecide_selectsHighestReachableAndGlobalSemVer(t *testing.T) {
	repo := newPolicyRepo(t)
	base := repo.commit(t, "fix: base")
	repo.tag(t, "v1.2.0", base)
	repo.tag(t, "v1.3.0", base)
	target := repo.commit(t, "fix: next")

	decision, err := Decide(repo.path, Request{TargetSHA: target, RemoteTipSHA: target, Trigger: TriggerManual})
	if err != nil {
		t.Fatal(err)
	}
	if decision.PreviousTag != "v1.3.0" || decision.NextTag != "v1.3.1" || decision.Decision != DecisionPublish {
		t.Fatalf("unexpected decision: %+v", decision)
	}
}

func TestDecide_rejectsGlobalTagNotReachableFromTarget(t *testing.T) {
	repo := newPolicyRepo(t)
	base := repo.commit(t, "fix: base")
	repo.tag(t, "v1.0.0", base)
	target := repo.commit(t, "fix: target")
	repo.run(t, "checkout", "--orphan", "other")
	other := repo.commit(t, "fix: elsewhere")
	repo.tag(t, "v2.0.0", other)

	if _, err := Decide(repo.path, Request{TargetSHA: target, RemoteTipSHA: target, Trigger: TriggerManual}); err == nil {
		t.Fatal("Decide() succeeded with globally newer unreachable tag")
	}
}

func TestDecide_returnsNoReleaseForNoneOnlyRange(t *testing.T) {
	repo := newPolicyRepo(t)
	base := repo.commit(t, "fix: base")
	repo.tag(t, "v2.4.1", base)
	target := repo.commit(t, "docs: explain only")

	decision, err := Decide(repo.path, Request{TargetSHA: target, RemoteTipSHA: target, Trigger: TriggerManual})
	if err != nil {
		t.Fatal(err)
	}
	if decision.Decision != DecisionNoRelease || decision.PreviousTag != "v2.4.1" || decision.NextTag != "" {
		t.Fatalf("unexpected decision: %+v", decision)
	}
}

func TestDecide_marksStaleAutomatedRunSupersededAndRejectsStaleManual(t *testing.T) {
	repo := newPolicyRepo(t)
	target := repo.commit(t, "fix: target")
	tip := repo.commit(t, "fix: later")

	automated, err := Decide(repo.path, Request{TargetSHA: target, RemoteTipSHA: tip, Trigger: TriggerAutomated})
	if err != nil || automated.Decision != DecisionSuperseded {
		t.Fatalf("automated stale result = %+v, %v", automated, err)
	}
	if _, err := Decide(repo.path, Request{TargetSHA: target, RemoteTipSHA: tip, Trigger: TriggerManual}); err == nil {
		t.Fatal("manual stale target succeeded")
	}
}

func TestDecide_rejectsMalformedSHAAndIgnoresMalformedSemVerTag(t *testing.T) {
	repo := newPolicyRepo(t)
	target := repo.commit(t, "fix: target")
	repo.tag(t, "v01.2.3", target)
	if _, err := Decide(repo.path, Request{TargetSHA: "HEAD", RemoteTipSHA: target, Trigger: TriggerManual}); err == nil {
		t.Fatal("malformed target SHA succeeded")
	}
	decision, err := Decide(repo.path, Request{TargetSHA: target, RemoteTipSHA: target, Trigger: TriggerManual})
	if err != nil {
		t.Fatal(err)
	}
	if decision.PreviousTag != "" || decision.NextTag != "v0.0.1" {
		t.Fatalf("malformed tag affected SemVer selection: %+v", decision)
	}
}

func TestDecide_ignoresDirtyWorktreeAndUsesTargetCommitOnly(t *testing.T) {
	repo := newPolicyRepo(t)
	target := repo.commit(t, "fix: target")
	if err := os.WriteFile(filepath.Join(repo.path, "dirty.txt"), []byte("feat: must remain untrusted data\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	decision, err := Decide(repo.path, Request{TargetSHA: target, RemoteTipSHA: target, Trigger: TriggerManual})
	if err != nil {
		t.Fatal(err)
	}
	if decision.NextTag != "v0.0.1" {
		t.Fatalf("dirty worktree changed decision: %+v", decision)
	}
}

type policyRepo struct{ path string }

func newPolicyRepo(t *testing.T) policyRepo {
	t.Helper()
	repo := policyRepo{path: t.TempDir()}
	repo.run(t, "init", "-q", "-b", "master")
	repo.run(t, "config", "user.email", "test@example.com")
	repo.run(t, "config", "user.name", "Release Test")
	return repo
}

func (r policyRepo) commit(t *testing.T, message string) string {
	t.Helper()
	file := filepath.Join(r.path, "content.txt")
	f, err := os.OpenFile(file, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o600)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := f.WriteString(message + "\n"); err != nil {
		t.Fatal(err)
	}
	if err := f.Close(); err != nil {
		t.Fatal(err)
	}
	r.run(t, "add", "content.txt")
	r.run(t, "commit", "-q", "-m", message)
	return r.output(t, "rev-parse", "HEAD")
}

func (r policyRepo) tag(t *testing.T, tag, sha string) { r.run(t, "tag", tag, sha) }

func (r policyRepo) run(t *testing.T, args ...string) {
	t.Helper()
	cmd := exec.Command("git", args...)
	cmd.Dir = r.path
	if output, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("git %v: %v\n%s", args, err, output)
	}
}

func (r policyRepo) output(t *testing.T, args ...string) string {
	t.Helper()
	cmd := exec.Command("git", args...)
	cmd.Dir = r.path
	output, err := cmd.Output()
	if err != nil {
		t.Fatalf("git %v: %v", args, err)
	}
	return string(output[:len(output)-1])
}
