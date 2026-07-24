package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestWriteJSONObjectReplacesSymlinkWithoutMutatingTarget(t *testing.T) {
	// Given
	dir := t.TempDir()
	victim := filepath.Join(dir, "victim.json")
	destination := filepath.Join(dir, "resume.json")
	original := []byte("{\"protected\":true}\n")
	if err := os.WriteFile(victim, original, 0o644); err != nil {
		t.Fatalf("write victim: %v", err)
	}
	if err := os.Symlink(victim, destination); err != nil {
		t.Fatalf("create destination symlink: %v", err)
	}

	// When
	if err := writeJSONObject(destination, map[string]any{"updated": true}); err != nil {
		t.Fatalf("write object: %v", err)
	}

	// Then
	gotVictim, err := os.ReadFile(victim)
	if err != nil {
		t.Fatalf("read victim: %v", err)
	}
	if string(gotVictim) != string(original) {
		t.Fatalf("symlink target changed: got %q, want %q", gotVictim, original)
	}
	if info, err := os.Lstat(destination); err != nil {
		t.Fatalf("stat destination: %v", err)
	} else if info.Mode()&os.ModeSymlink != 0 {
		t.Fatal("destination should be an atomically replaced regular file")
	}
}
