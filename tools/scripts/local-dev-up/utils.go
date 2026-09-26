package main

import (
	"errors"
	"fmt"
	"os"
	"os/exec"
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
		if hasPath(cur, "apps/portfolio") && hasPath(cur, "apps/job-server") {
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

func firstAvailableBinary(candidates ...string) (string, bool) {
	for _, c := range candidates {
		if _, err := exec.LookPath(c); err == nil {
			return c, true
		}
	}
	return "", false
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

func infof(printer *linePrinter, spec serviceSpec, format string, args ...any) {
	printer.print("%s[%s]%s %s\n", spec.Color, spec.DisplayName, ldColorReset, fmt.Sprintf(format, args...))
}

func okf(printer *linePrinter, spec serviceSpec, format string, args ...any) {
	printer.print("%s[%s]%s %s%s%s\n", spec.Color, spec.DisplayName, ldColorReset, ldColorGreen, fmt.Sprintf(format, args...), ldColorReset)
}

func ldWarnf(format string, args ...any) {
	fmt.Printf("%sWARN%s %s\n", ldColorYellow, ldColorReset, fmt.Sprintf(format, args...))
}

func ldWarnfWithPrinter(printer *linePrinter, format string, args ...any) {
	printer.print("%sWARN%s %s\n", ldColorYellow, ldColorReset, fmt.Sprintf(format, args...))
}

func ldErrorfWithPrinter(printer *linePrinter, format string, args ...any) {
	printer.print("%sERROR%s %s\n", ldColorRed, ldColorReset, fmt.Sprintf(format, args...))
}

func ldFatalf(format string, args ...any) {
	fmt.Fprintf(os.Stderr, "%sERROR%s %s\n", ldColorRed, ldColorReset, fmt.Sprintf(format, args...))
	os.Exit(1)
}
