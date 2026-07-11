package main

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"strings"
)

var (
	publishSHAPattern = regexp.MustCompile(`^[0-9a-f]{40}$`)
	publishTagPattern = regexp.MustCompile(`^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$`)
	markerPattern     = regexp.MustCompile(`^release-run:[0-9]+$`)
)

type Publisher struct{ client ReleaseClient }

func NewPublisher(client ReleaseClient) Publisher { return Publisher{client: client} }

func (publisher Publisher) Publish(ctx context.Context, request PublishRequest) (Outcome, error) {
	if err := validatePublishRequest(request); err != nil {
		return "", err
	}
	snapshot, err := publisher.client.Snapshot(ctx, request.Tag, request.RunMarker)
	if err != nil {
		return "", fmt.Errorf("release snapshot: %w", err)
	}
	if snapshot.Published.ID != 0 {
		if !matchesPublished(snapshot.Published, request) {
			return "", errors.New("published release does not match target asset contract")
		}
		return OutcomeIdempotent, nil
	}

	tagTarget, err := publisher.client.TagTarget(ctx, request.Tag)
	if err != nil {
		return "", fmt.Errorf("preflight tag: %w", err)
	}
	draft := snapshot.Draft
	runCreatedTag := tagTarget == ""
	if draft.ID != 0 {
		if err := validateOwnedDraft(draft, request); err != nil {
			return "", err
		}
		if tagTarget != request.TargetSHA {
			return "", errors.New("owned draft tag does not target immutable commit")
		}
		runCreatedTag = strings.Contains(draft.Body, "run-created-tag:true")
	} else if tagTarget != "" && tagTarget != request.TargetSHA {
		return "", errors.New("preexisting tag targets a different commit")
	}

	body := draftBody(request, runCreatedTag)
	tip, err := publisher.client.CurrentTip(ctx)
	if err != nil {
		return "", fmt.Errorf("guard before first write: %w", err)
	}
	if tip != request.TargetSHA {
		return OutcomeSuperseded, nil
	}
	if draft.ID == 0 {
		draft, err = publisher.client.CreateDraft(ctx, DraftRequest{Tag: request.Tag, TargetSHA: request.TargetSHA, Body: body, RunCreatedTag: runCreatedTag})
		if err != nil {
			return "", fmt.Errorf("create draft: %w", err)
		}
		if err := validateOwnedDraft(draft, request); err != nil {
			return "", errors.Join(err, publisher.cleanup(ctx, draft.ID, request, runCreatedTag))
		}
	}

	if err := publisher.client.UploadAsset(ctx, request.Tag, request.AssetPath); err != nil {
		return "", errors.Join(fmt.Errorf("upload asset: %w", err), publisher.cleanup(ctx, draft.ID, request, runCreatedTag))
	}
	verified, err := publisher.client.GetRelease(ctx, draft.ID)
	if err != nil {
		return "", errors.Join(fmt.Errorf("verify draft: %w", err), publisher.cleanup(ctx, draft.ID, request, runCreatedTag))
	}
	if err := validateOwnedDraft(verified, request); err != nil || !hasAsset(verified, request) {
		verificationErr := errors.New("draft target, ownership, or asset verification failed")
		return "", errors.Join(verificationErr, err, publisher.cleanup(ctx, draft.ID, request, runCreatedTag))
	}

	tip, err = publisher.client.CurrentTip(ctx)
	if err != nil {
		return "", errors.Join(fmt.Errorf("guard before publish: %w", err), publisher.cleanup(ctx, draft.ID, request, runCreatedTag))
	}
	if tip != request.TargetSHA {
		if err := publisher.cleanup(ctx, draft.ID, request, runCreatedTag); err != nil {
			return "", err
		}
		return OutcomeSuperseded, nil
	}
	if err := publisher.client.PublishRelease(ctx, draft.ID); err != nil {
		return "", fmt.Errorf("publish release: %w", err)
	}
	return OutcomePublished, nil
}

func (publisher Publisher) cleanup(ctx context.Context, draftID int64, request PublishRequest, runCreatedTag bool) error {
	release, releaseErr := publisher.client.GetRelease(ctx, draftID)
	tagTarget, tagErr := publisher.client.TagTarget(ctx, request.Tag)
	if releaseErr != nil || tagErr != nil {
		return fmt.Errorf("cleanup ownership re-fetch: %w", errors.Join(releaseErr, tagErr))
	}
	if err := validateOwnedDraft(release, request); err != nil {
		return fmt.Errorf("cleanup ownership mismatch: %w", err)
	}
	if tagTarget != request.TargetSHA || !strings.Contains(release.Body, fmt.Sprintf("run-created-tag:%t", runCreatedTag)) {
		return errors.New("cleanup ownership mismatch: tag ownership or target changed")
	}
	if err := publisher.client.DeleteRelease(ctx, draftID); err != nil {
		return fmt.Errorf("delete owned draft: %w", err)
	}
	if runCreatedTag {
		if err := publisher.client.DeleteTag(ctx, request.Tag); err != nil {
			return fmt.Errorf("delete run-created tag: %w", err)
		}
	}
	return nil
}

func validatePublishRequest(request PublishRequest) error {
	if !publishSHAPattern.MatchString(request.TargetSHA) || !publishTagPattern.MatchString(request.Tag) || !markerPattern.MatchString(request.RunMarker) {
		return errors.New("invalid target SHA, SemVer tag, or run marker")
	}
	if request.AssetPath == "" || request.AssetName == "" || request.Digest == "" || request.Size <= 0 {
		return errors.New("invalid asset contract")
	}
	return nil
}

func validateOwnedDraft(release Release, request PublishRequest) error {
	if release.ID == 0 || !release.Draft || release.Tag != request.Tag || release.TargetSHA != request.TargetSHA || !strings.Contains(release.Body, request.RunMarker) {
		return errors.New("draft ownership or target mismatch")
	}
	return nil
}

func matchesPublished(release Release, request PublishRequest) bool {
	return !release.Draft && release.Tag == request.Tag && release.TargetSHA == request.TargetSHA && hasAsset(release, request)
}

func hasAsset(release Release, request PublishRequest) bool {
	for _, asset := range release.Assets {
		if asset.Name == request.AssetName && asset.Digest == request.Digest && asset.Size == request.Size {
			return true
		}
	}
	return false
}

func draftBody(request PublishRequest, runCreatedTag bool) string {
	return fmt.Sprintf("Verified source release for %s.\n\n%s\n<!-- %s run-created-tag:%t -->", request.TargetSHA, request.Notes, request.RunMarker, runCreatedTag)
}
