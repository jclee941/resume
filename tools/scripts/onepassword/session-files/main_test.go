package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestParseArgs_whenSeedUsesDefaults(t *testing.T) {
	cfg, err := parseArgs([]string{"seed"})
	if err != nil {
		t.Fatalf("parseArgs returned error: %v", err)
	}

	if cfg.action != actionSeed {
		t.Fatalf("action = %q, want %q", cfg.action, actionSeed)
	}
	if cfg.vault != defaultVault {
		t.Fatalf("vault = %q, want %q", cfg.vault, defaultVault)
	}
	if cfg.root != defaultRoot {
		t.Fatalf("root = %q, want %q", cfg.root, defaultRoot)
	}
}

func TestParseArgs_whenRestoreUsesCustomOptions(t *testing.T) {
	cfg, err := parseArgs([]string{"restore", "--vault", "ops", "--root", "repo", "--force"})
	if err != nil {
		t.Fatalf("parseArgs returned error: %v", err)
	}

	if cfg.action != actionRestore {
		t.Fatalf("action = %q, want %q", cfg.action, actionRestore)
	}
	if cfg.vault != "ops" {
		t.Fatalf("vault = %q, want ops", cfg.vault)
	}
	if cfg.root != "repo" {
		t.Fatalf("root = %q, want repo", cfg.root)
	}
	if !cfg.force {
		t.Fatal("force = false, want true")
	}
}

func TestSessionDocuments_whenRootProvided(t *testing.T) {
	docs := sessionDocuments("repo")

	want := []sessionDocument{
		{
			path:     filepath.Join("repo", "sessions.json"),
			title:    "resume-sessions-json",
			fileName: "sessions.json",
		},
		{
			path:     filepath.Join("repo", "wanted-session.json"),
			title:    "resume-wanted-session-json",
			fileName: "wanted-session.json",
		},
	}

	if len(docs) != len(want) {
		t.Fatalf("len(docs) = %d, want %d", len(docs), len(want))
	}
	for index := range want {
		if docs[index] != want[index] {
			t.Fatalf("docs[%d] = %#v, want %#v", index, docs[index], want[index])
		}
	}
}

func TestReadSessionPayload_whenJsonInvalid(t *testing.T) {
	path := filepath.Join(t.TempDir(), "sessions.json")
	if err := os.WriteFile(path, []byte("{bad-json"), 0o600); err != nil {
		t.Fatalf("write fixture: %v", err)
	}

	if _, err := readSessionPayload(path); err == nil {
		t.Fatal("readSessionPayload returned nil error for invalid JSON")
	}
}
