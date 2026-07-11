package main

import (
	"context"
	"errors"
)

type fakeClient struct {
	events      []string
	snapshot    ReleaseSnapshot
	tagTarget   string
	tips        []string
	release     Release
	getRelease  Release
	uploadErr   error
	createdBody string
}

func newFakeClient() *fakeClient {
	return &fakeClient{tips: []string{targetSHA, targetSHA}, release: ownedDraft(targetSHA, true)}
}

func (client *fakeClient) Snapshot(context.Context, string, string) (ReleaseSnapshot, error) {
	client.events = append(client.events, "snapshot")
	return client.snapshot, nil
}

func (client *fakeClient) TagTarget(context.Context, string) (string, error) {
	client.events = append(client.events, "tag")
	return client.tagTarget, nil
}

func (client *fakeClient) CurrentTip(context.Context) (string, error) {
	client.events = append(client.events, "tip")
	if len(client.tips) == 0 {
		return "", errors.New("no fake tip")
	}
	tip := client.tips[0]
	client.tips = client.tips[1:]
	return tip, nil
}

func (client *fakeClient) CreateDraft(_ context.Context, request DraftRequest) (Release, error) {
	client.events = append(client.events, "create")
	client.createdBody = request.Body
	client.release = ownedDraft(request.TargetSHA, request.RunCreatedTag)
	if request.RunCreatedTag {
		client.tagTarget = request.TargetSHA
	}
	return client.release, nil
}

func (client *fakeClient) UploadAsset(context.Context, string, string) error {
	client.events = append(client.events, "upload")
	return client.uploadErr
}

func (client *fakeClient) GetRelease(context.Context, int64) (Release, error) {
	client.events = append(client.events, "release")
	if client.getRelease.ID != 0 {
		return client.getRelease, nil
	}
	return client.release, nil
}

func (client *fakeClient) DeleteRelease(context.Context, int64) error {
	client.events = append(client.events, "delete-release")
	return nil
}

func (client *fakeClient) DeleteTag(context.Context, string) error {
	client.events = append(client.events, "delete-tag")
	return nil
}

func (client *fakeClient) PublishRelease(context.Context, int64) error {
	client.events = append(client.events, "publish")
	return nil
}

func ownedDraft(target string, runCreatedTag bool) Release {
	body := "<!-- " + marker + " run-created-tag:false -->"
	if runCreatedTag {
		body = "<!-- " + marker + " run-created-tag:true -->"
	}
	return Release{ID: 7, Tag: tagName, TargetSHA: target, Body: body, Draft: true, Assets: []ReleaseAsset{{Name: "asset.tar.gz", Digest: "sha256:abc", Size: 123}}}
}

func publishedRelease(target, digest string, size int64) Release {
	return Release{ID: 8, Tag: tagName, TargetSHA: target, Draft: false, Assets: []ReleaseAsset{{Name: "asset.tar.gz", Digest: digest, Size: size}}}
}
