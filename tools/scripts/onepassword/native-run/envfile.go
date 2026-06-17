package main

import (
	"bufio"
	"fmt"
	"os"
	"strings"
)

func parseEnvFile(path string) ([]EnvRef, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	var refs []EnvRef
	scanner := bufio.NewScanner(file)
	lineNumber := 0
	for scanner.Scan() {
		lineNumber++
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		line = strings.TrimPrefix(line, "export ")
		name, value, ok := strings.Cut(line, "=")
		if !ok {
			return nil, fmt.Errorf("invalid env line %d: missing key/value separator", lineNumber)
		}
		name = strings.TrimSpace(name)
		value = strings.Trim(strings.TrimSpace(value), "\"")
		if name == "" {
			return nil, fmt.Errorf("invalid env line %d: empty key", lineNumber)
		}
		refs = append(refs, EnvRef{Name: name, Value: value})
	}
	return refs, scanner.Err()
}
