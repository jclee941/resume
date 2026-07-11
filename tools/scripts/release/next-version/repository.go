package main

import (
	"bytes"
	"fmt"
	"os/exec"
	"strings"
)

func listVersionTags(repository string) ([]versionTag, error) {
	output, err := git(repository, "for-each-ref", "--format=%(refname:short)%00%(*objectname)%00%(objectname)", "refs/tags")
	if err != nil {
		return nil, fmt.Errorf("list tags: %w", err)
	}
	var tags []versionTag
	for _, line := range strings.Split(strings.TrimSpace(output), "\n") {
		parts := strings.Split(line, "\x00")
		if len(parts) != 3 {
			continue
		}
		parsed, ok := parseVersion(parts[0])
		if !ok {
			continue
		}
		commit := parts[1]
		if commit == "" {
			resolved, resolveErr := git(repository, "rev-parse", parts[0]+"^{commit}")
			if resolveErr != nil {
				return nil, fmt.Errorf("resolve tag %s: %w", parts[0], resolveErr)
			}
			commit = strings.TrimSpace(resolved)
		}
		tags = append(tags, versionTag{name: parts[0], version: parsed, commit: commit})
	}
	return tags, nil
}

func commitMessages(repository, rangeSpec string) ([]CommitMessage, error) {
	output, err := gitBytes(repository, "log", "--format=%s%x00%b%x00", rangeSpec)
	if err != nil {
		return nil, fmt.Errorf("read commit range %s: %w", rangeSpec, err)
	}
	fields := bytes.Split(output, []byte{0})
	messages := make([]CommitMessage, 0, len(fields)/2)
	for index := 0; index+1 < len(fields); index += 2 {
		subject := strings.TrimSpace(string(fields[index]))
		body := strings.TrimSpace(string(fields[index+1]))
		if subject != "" {
			messages = append(messages, CommitMessage{Subject: subject, Body: body})
		}
	}
	return messages, nil
}

func git(repository string, args ...string) (string, error) {
	output, err := gitBytes(repository, args...)
	return string(output), err
}

func gitBytes(repository string, args ...string) ([]byte, error) {
	command := exec.Command("git", args...)
	command.Dir = repository
	output, err := command.Output()
	if err != nil {
		return nil, fmt.Errorf("git %s: %w", strings.Join(args, " "), err)
	}
	return output, nil
}
