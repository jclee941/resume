package main

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
)

func ldResolveRepoRoot() (string, error) {
	wd, err := os.Getwd()
	if err != nil {
		return "", err
	}

	cur := wd
	for {
		if hasPath(cur, "apps/portfolio") && hasPath(cur, "apps/job-dashboard") {
			return cur, nil
		}
		parent := filepath.Dir(cur)
		if parent == cur {
			return "", errors.New("repository root not found")
		}
		cur = parent
	}
}

func hasPath(base, rel string) bool {
	_, err := os.Stat(filepath.Join(base, rel))
	return err == nil
}

func ldShellJoin(parts []string) string {
	if len(parts) == 0 {
		return ""
	}
	out := make([]string, len(parts))
	for i, p := range parts {
		if p == "" {
			out[i] = "\"\""
			continue
		}
		if strings.ContainsAny(p, " \t\n\"'") {
			out[i] = "\"" + strings.ReplaceAll(p, "\"", "\\\"") + "\""
			continue
		}
		out[i] = p
	}
	return strings.Join(out, " ")
}

func bytesIndexByte(b []byte, c byte) int {
	for i := range b {
		if b[i] == c {
			return i
		}
	}
	return -1
}
