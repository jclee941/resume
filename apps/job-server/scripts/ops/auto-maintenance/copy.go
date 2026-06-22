package main

import (
	"io/fs"
	"os"
	"path/filepath"
)

func copyIfExists(src, dst string) {
	info, err := os.Stat(src)
	if err != nil {
		return
	}
	if info.IsDir() {
		_ = filepath.Walk(src, func(path string, info fs.FileInfo, err error) error {
			if err != nil {
				return nil
			}
			rel, _ := filepath.Rel(src, path)
			target := filepath.Join(dst, rel)
			if info.IsDir() {
				return os.MkdirAll(target, 0o755)
			}
			data, readErr := os.ReadFile(path)
			if readErr == nil {
				_ = os.MkdirAll(filepath.Dir(target), 0o755)
				_ = os.WriteFile(target, data, 0o644)
			}
			return nil
		})
		return
	}
	data, err := os.ReadFile(src)
	if err == nil {
		_ = os.WriteFile(dst, data, 0o644)
	}
}
