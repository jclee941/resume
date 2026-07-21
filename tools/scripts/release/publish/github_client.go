package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os/exec"
	"strings"
)

type GitHubClient struct {
	runner CommandRunner
	repo   string
	remote string
}

func NewGitHubClient(runner CommandRunner, repo, remote string) GitHubClient {
	return GitHubClient{runner: runner, repo: repo, remote: remote}
}

func (client GitHubClient) Snapshot(ctx context.Context, tag, marker string) (ReleaseSnapshot, error) {
	output, err := client.runner.Run(ctx, "gh", []string{"api", "--paginate", "--slurp", "repos/" + client.repo + "/releases"}, nil)
	if err != nil {
		return ReleaseSnapshot{}, err
	}
	var pages [][]Release
	if err := json.Unmarshal(output, &pages); err != nil {
		return ReleaseSnapshot{}, fmt.Errorf("decode releases: %w", err)
	}
	var snapshot ReleaseSnapshot
	for _, page := range pages {
		for _, release := range page {
			if release.Tag != tag {
				continue
			}
			if release.Draft && strings.Contains(release.Body, marker) {
				if snapshot.Draft.ID != 0 {
					return ReleaseSnapshot{}, errors.New("duplicate run-owned drafts")
				}
				snapshot.Draft = release
			}
			if !release.Draft {
				if snapshot.Published.ID != 0 {
					return ReleaseSnapshot{}, errors.New("duplicate published releases")
				}
				snapshot.Published = release
			}
		}
	}
	return snapshot, nil
}

func (client GitHubClient) TagTarget(ctx context.Context, tag string) (string, error) {
	output, err := client.runner.Run(ctx, "git", []string{"ls-remote", client.remote, "refs/tags/" + tag, "refs/tags/" + tag + "^{}"}, nil)
	if err != nil {
		return "", err
	}
	var direct string
	for _, line := range strings.Split(strings.TrimSpace(string(output)), "\n") {
		fields := strings.Fields(line)
		if len(fields) != 2 {
			continue
		}
		if strings.HasSuffix(fields[1], "^{}") {
			return fields[0], nil
		}
		direct = fields[0]
	}
	return direct, nil
}

func (client GitHubClient) CurrentTip(ctx context.Context) (string, error) {
	output, err := client.runner.Run(ctx, "git", []string{"ls-remote", client.remote, "refs/heads/master"}, nil)
	if err != nil {
		return "", err
	}
	fields := strings.Fields(string(output))
	if len(fields) != 2 || !publishSHAPattern.MatchString(fields[0]) {
		return "", errors.New("remote master tip is not one 40-hex SHA")
	}
	return fields[0], nil
}

func (client GitHubClient) CreateDraft(ctx context.Context, request DraftRequest) (Release, error) {
	payload := struct {
		Tag        string `json:"tag_name"`
		Target     string `json:"target_commitish"`
		Name       string `json:"name"`
		Body       string `json:"body"`
		Draft      bool   `json:"draft"`
		Prerelease bool   `json:"prerelease"`
		Latest     string `json:"make_latest"`
	}{Tag: request.Tag, Target: request.TargetSHA, Name: request.Tag, Body: request.Body, Draft: true, Latest: "false"}
	encoded, err := json.Marshal(payload)
	if err != nil {
		return Release{}, fmt.Errorf("encode draft: %w", err)
	}
	return client.releaseMutation(ctx, "POST", "repos/"+client.repo+"/releases", encoded)
}

func (client GitHubClient) UploadAsset(ctx context.Context, tag, assetPath string) error {
	_, err := client.runner.Run(ctx, "gh", []string{"release", "upload", tag, assetPath, "--repo", client.repo, "--clobber"}, nil)
	return err
}

func (client GitHubClient) GetRelease(ctx context.Context, id int64) (Release, error) {
	output, err := client.runner.Run(ctx, "gh", []string{"api", fmt.Sprintf("repos/%s/releases/%d", client.repo, id)}, nil)
	if err != nil {
		return Release{}, err
	}
	var release Release
	if err := json.Unmarshal(output, &release); err != nil {
		return Release{}, fmt.Errorf("decode release: %w", err)
	}
	return release, nil
}

func (client GitHubClient) DeleteRelease(ctx context.Context, id int64) error {
	_, err := client.runner.Run(ctx, "gh", []string{"api", "--method", "DELETE", fmt.Sprintf("repos/%s/releases/%d", client.repo, id)}, nil)
	return err
}

func (client GitHubClient) DeleteTag(ctx context.Context, tag string) error {
	_, err := client.runner.Run(ctx, "gh", []string{"api", "--method", "DELETE", "repos/" + client.repo + "/git/refs/tags/" + tag}, nil)
	return err
}

func (client GitHubClient) PublishRelease(ctx context.Context, id int64) error {
	payload := struct {
		Draft      bool   `json:"draft"`
		Prerelease bool   `json:"prerelease"`
		Latest     string `json:"make_latest"`
	}{Latest: "true"}
	encoded, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("encode publication: %w", err)
	}
	_, err = client.releaseMutation(ctx, "PATCH", fmt.Sprintf("repos/%s/releases/%d", client.repo, id), encoded)
	return err
}

func (client GitHubClient) releaseMutation(ctx context.Context, method, endpoint string, encoded []byte) (Release, error) {
	output, err := client.runner.Run(ctx, "gh", []string{"api", "--method", method, endpoint, "--input", "-"}, encoded)
	if err != nil {
		return Release{}, err
	}
	var release Release
	if len(output) > 0 {
		if err := json.Unmarshal(output, &release); err != nil {
			return Release{}, fmt.Errorf("decode release mutation: %w", err)
		}
	}
	return release, nil
}

type OSRunner struct{}

func (OSRunner) Run(ctx context.Context, name string, args []string, stdin []byte) ([]byte, error) {
	command := exec.CommandContext(ctx, name, args...)
	command.Stdin = bytes.NewReader(stdin)
	output, err := command.CombinedOutput()
	if err != nil {
		return nil, fmt.Errorf("%s %s: %w: %s", name, strings.Join(args, " "), err, strings.TrimSpace(string(output)))
	}
	return output, nil
}
