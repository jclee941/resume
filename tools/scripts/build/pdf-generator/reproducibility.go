package main

import (
	"bytes"
	"crypto/md5"
	"encoding/hex"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
)

func deterministicEnv(source string) []string {
	env := os.Environ()
	env = append(env, "FORCE_SOURCE_DATE=1")
	env = append(env, "SOURCE_DATE_EPOCH="+strconv.FormatInt(sourceDateEpoch(source), 10))
	return env
}

func sourceDateEpoch(source string) int64 {
	abs := source
	if !filepath.IsAbs(abs) {
		abs = filepath.Join(projectRoot, source)
	}
	cmd := exec.Command("git", "log", "-1", "--format=%ct", "--", abs)
	cmd.Dir = projectRoot
	if out, err := cmd.Output(); err == nil {
		if ts, parseErr := strconv.ParseInt(strings.TrimSpace(string(out)), 10, 64); parseErr == nil && ts > 0 {
			return ts
		}
	}
	if info, err := os.Stat(abs); err == nil {
		return info.ModTime().Unix()
	}
	return 1704067200
}

var pdfIDPattern = regexp.MustCompile(`/ID\s*\[\s*<[0-9A-Fa-f]+>\s*<[0-9A-Fa-f]+>\s*\]`)

func normalizePdfID(pdf []byte) []byte {
	matches := pdfIDPattern.FindAllIndex(pdf, -1)
	if len(matches) == 0 {
		return pdf
	}
	trailerIdx := bytes.LastIndex(pdf, []byte("trailer"))
	loc := matches[len(matches)-1]
	if trailerIdx >= 0 {
		for _, match := range matches {
			if match[0] >= trailerIdx {
				loc = match
				break
			}
		}
	}
	withoutID := make([]byte, 0, len(pdf))
	withoutID = append(withoutID, pdf[:loc[0]]...)
	withoutID = append(withoutID, pdf[loc[1]:]...)
	sum := md5.Sum(withoutID)
	id := strings.ToUpper(hex.EncodeToString(sum[:]))
	replacement := fmt.Sprintf("/ID [<%s><%s>]", id, id)
	out := make([]byte, 0, loc[0]+len(replacement)+(len(pdf)-loc[1]))
	out = append(out, pdf[:loc[0]]...)
	out = append(out, []byte(replacement)...)
	out = append(out, pdf[loc[1]:]...)
	return out
}

func normalizePdfFile(path string) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	return os.WriteFile(path, normalizePdfID(data), 0o644)
}
