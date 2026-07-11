package main

import "context"

type Outcome string

const (
	OutcomePublished  Outcome = "published"
	OutcomeIdempotent Outcome = "idempotent"
	OutcomeSuperseded Outcome = "superseded"
)

type PublishRequest struct {
	TargetSHA string
	Tag       string
	AssetPath string
	AssetName string
	Digest    string
	Size      int64
	RunMarker string
	Notes     string
}

type DraftRequest struct {
	Tag           string
	TargetSHA     string
	Body          string
	RunCreatedTag bool
}

type ReleaseAsset struct {
	Name   string `json:"name"`
	Digest string `json:"digest"`
	Size   int64  `json:"size"`
}

type Release struct {
	ID        int64          `json:"id"`
	Tag       string         `json:"tag_name"`
	TargetSHA string         `json:"target_commitish"`
	Body      string         `json:"body"`
	Draft     bool           `json:"draft"`
	Assets    []ReleaseAsset `json:"assets"`
}

type ReleaseSnapshot struct {
	Published Release
	Draft     Release
}

type ReleaseClient interface {
	Snapshot(context.Context, string, string) (ReleaseSnapshot, error)
	TagTarget(context.Context, string) (string, error)
	CurrentTip(context.Context) (string, error)
	CreateDraft(context.Context, DraftRequest) (Release, error)
	UploadAsset(context.Context, string, string) error
	GetRelease(context.Context, int64) (Release, error)
	DeleteRelease(context.Context, int64) error
	DeleteTag(context.Context, string) error
	PublishRelease(context.Context, int64) error
}

type CommandRunner interface {
	Run(context.Context, string, []string, []byte) ([]byte, error)
}
