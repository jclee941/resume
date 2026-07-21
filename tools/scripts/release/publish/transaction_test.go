package main

import (
	"context"
	"errors"
	"reflect"
	"strings"
	"testing"
)

const (
	targetSHA = "1111111111111111111111111111111111111111"
	otherSHA  = "2222222222222222222222222222222222222222"
	tagName   = "v1.2.3"
	marker    = "release-run:42"
)

func TestPublish_stopsBeforeFirstWriteWhenTipAdvancesAfterDiscovery(t *testing.T) {
	client := newFakeClient()
	client.tips = []string{otherSHA}

	outcome, err := NewPublisher(client).Publish(context.Background(), testRequest())

	if err != nil || outcome != OutcomeSuperseded {
		t.Fatalf("outcome=%q error=%v", outcome, err)
	}
	assertEvents(t, client.events, "snapshot", "tag", "tip")
}

func TestPublish_cleansOwnedDraftWhenTipAdvancesBeforePublish(t *testing.T) {
	client := newFakeClient()
	client.tips = []string{targetSHA, otherSHA}

	outcome, err := NewPublisher(client).Publish(context.Background(), testRequest())

	if err != nil || outcome != OutcomeSuperseded {
		t.Fatalf("outcome=%q error=%v", outcome, err)
	}
	assertEvents(t, client.events, "snapshot", "tag", "tip", "create", "upload", "release", "tip", "release", "tag", "delete-release", "delete-tag")
}

func TestPublish_resumesInterruptedSameRunDraft(t *testing.T) {
	client := newFakeClient()
	client.snapshot.Draft = ownedDraft(targetSHA, true)
	client.tagTarget = targetSHA
	client.release = client.snapshot.Draft

	outcome, err := NewPublisher(client).Publish(context.Background(), testRequest())

	if err != nil || outcome != OutcomePublished {
		t.Fatalf("outcome=%q error=%v", outcome, err)
	}
	assertEvents(t, client.events, "snapshot", "tag", "tip", "upload", "release", "tip", "publish")
}

func TestPublish_cleanupTargetMismatchDeletesNothing(t *testing.T) {
	client := newFakeClient()
	client.uploadErr = errors.New("upload failed")
	client.getRelease = ownedDraft(otherSHA, true)

	_, err := NewPublisher(client).Publish(context.Background(), testRequest())

	if err == nil || !strings.Contains(err.Error(), "cleanup ownership") {
		t.Fatalf("unexpected error: %v", err)
	}
	assertEvents(t, client.events, "snapshot", "tag", "tip", "create", "upload", "release", "tag")
	assertNoDelete(t, client.events)
}

func TestPublish_cleanupTagOwnershipMismatchDeletesNothing(t *testing.T) {
	client := newFakeClient()
	client.uploadErr = errors.New("upload failed")
	client.getRelease = ownedDraft(targetSHA, false)

	_, err := NewPublisher(client).Publish(context.Background(), testRequest())

	if err == nil || !strings.Contains(err.Error(), "cleanup ownership") {
		t.Fatalf("unexpected error: %v", err)
	}
	assertEvents(t, client.events, "snapshot", "tag", "tip", "create", "upload", "release", "tag")
	assertNoDelete(t, client.events)
}

func TestPublish_preexistingTagIsNeverDeleted(t *testing.T) {
	client := newFakeClient()
	client.tagTarget = targetSHA
	client.uploadErr = errors.New("upload failed")
	client.release = ownedDraft(targetSHA, false)

	_, err := NewPublisher(client).Publish(context.Background(), testRequest())

	if err == nil {
		t.Fatal("upload failure succeeded")
	}
	if contains(client.events, "delete-tag") {
		t.Fatalf("preexisting tag deleted: %v", client.events)
	}
	assertEvents(t, client.events, "snapshot", "tag", "tip", "create", "upload", "release", "tag", "delete-release")
}

func TestPublish_exactPublishedRerunIsIdempotent(t *testing.T) {
	client := newFakeClient()
	client.snapshot.Published = publishedRelease(targetSHA, "sha256:abc", 123)

	outcome, err := NewPublisher(client).Publish(context.Background(), testRequest())

	if err != nil || outcome != OutcomeIdempotent {
		t.Fatalf("outcome=%q error=%v", outcome, err)
	}
	assertEvents(t, client.events, "snapshot")
}

func TestPublish_mismatchedPublishedRerunFailsWithoutWrite(t *testing.T) {
	client := newFakeClient()
	client.snapshot.Published = publishedRelease(targetSHA, "sha256:wrong", 123)

	_, err := NewPublisher(client).Publish(context.Background(), testRequest())

	if err == nil {
		t.Fatal("mismatched published release succeeded")
	}
	assertEvents(t, client.events, "snapshot")
}

func TestPublish_untrustedNotesRemainExactInDraftBody(t *testing.T) {
	client := newFakeClient()
	request := testRequest()
	request.Notes = "- fix: $(gh release delete v1.2.3); `${{ secrets.TOKEN }}`\n"

	_, err := NewPublisher(client).Publish(context.Background(), request)

	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(client.createdBody, request.Notes) {
		t.Fatalf("notes changed or executed: %q", client.createdBody)
	}
}

func testRequest() PublishRequest {
	return PublishRequest{TargetSHA: targetSHA, Tag: tagName, AssetPath: "asset.tar.gz", AssetName: "asset.tar.gz", Digest: "sha256:abc", Size: 123, RunMarker: marker, Notes: "- fix: safe\n"}
}

func assertEvents(t *testing.T, got []string, want ...string) {
	t.Helper()
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("events=%v want=%v", got, want)
	}
}

func assertNoDelete(t *testing.T, events []string) {
	t.Helper()
	if contains(events, "delete-release") || contains(events, "delete-tag") {
		t.Fatalf("unexpected delete: %v", events)
	}
}

func contains(values []string, want string) bool {
	for _, value := range values {
		if value == want {
			return true
		}
	}
	return false
}
