package main

import (
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"time"
)

func removeOlderThan(root, suffix string, age time.Duration) {
	cutoff := time.Now().Add(-age)
	filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() || !strings.HasSuffix(d.Name(), suffix) {
			return nil
		}
		if info, statErr := d.Info(); statErr == nil && info.ModTime().Before(cutoff) {
			_ = os.Remove(path)
		}
		return nil
	})
}

func removePatternOlderThan(root, contains string, age time.Duration) {
	cutoff := time.Now().Add(-age)
	filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() || !strings.Contains(d.Name(), contains) {
			return nil
		}
		if info, statErr := d.Info(); statErr == nil && info.ModTime().Before(cutoff) {
			_ = os.Remove(path)
		}
		return nil
	})
}

func removePattern(root, suffix string) {
	filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() || !strings.HasSuffix(d.Name(), suffix) {
			return nil
		}
		_ = os.Remove(path)
		return nil
	})
}

func removeSuffix(root, suffix string) {
	filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() || !strings.HasSuffix(d.Name(), suffix) {
			return nil
		}
		_ = os.Remove(path)
		return nil
	})
}

func pruneOldDirs(root string, age time.Duration) {
	entries, err := os.ReadDir(root)
	if err != nil {
		return
	}
	cutoff := time.Now().Add(-age)
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		info, err := entry.Info()
		if err == nil && info.ModTime().Before(cutoff) {
			_ = os.RemoveAll(filepath.Join(root, entry.Name()))
		}
	}
}

func countMatching(root, suffix string) int {
	count := 0
	filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
		if err == nil && !d.IsDir() && strings.HasSuffix(d.Name(), suffix) {
			count++
		}
		return nil
	})
	return count
}
