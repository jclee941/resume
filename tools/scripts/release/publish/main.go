package main

import (
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"os"
)

func main() {
	if err := run(context.Background(), os.Args[1:]); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func run(ctx context.Context, arguments []string) error {
	flags := flag.NewFlagSet("publish-release", flag.ContinueOnError)
	flags.SetOutput(os.Stderr)
	target := flags.String("target", "", "immutable target commit SHA")
	tag := flags.String("tag", "", "strict SemVer release tag")
	asset := flags.String("asset", "", "verified source archive")
	manifest := flags.String("manifest", "", "verified release manifest")
	notes := flags.String("notes", "", "verified release notes")
	marker := flags.String("run-marker", "", "run ownership marker")
	repo := flags.String("repo", os.Getenv("GITHUB_REPOSITORY"), "GitHub owner/repository")
	remote := flags.String("remote", "origin", "Git remote name")
	if err := flags.Parse(arguments); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return nil
		}
		return fmt.Errorf("parse flags: %w", err)
	}
	if flags.NArg() != 0 || *repo == "" {
		return errors.New("unexpected arguments or missing repository")
	}
	request, err := loadPublishRequest(inputOptions{TargetSHA: *target, Tag: *tag, AssetPath: *asset, ManifestPath: *manifest, NotesPath: *notes, RunMarker: *marker})
	if err != nil {
		return err
	}
	client := NewGitHubClient(OSRunner{}, *repo, *remote)
	outcome, err := NewPublisher(client).Publish(ctx, request)
	if err != nil {
		return err
	}
	return json.NewEncoder(os.Stdout).Encode(struct {
		Outcome   Outcome `json:"outcome"`
		TargetSHA string  `json:"target_sha"`
		Tag       string  `json:"tag"`
	}{Outcome: outcome, TargetSHA: request.TargetSHA, Tag: request.Tag})
}
