package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
)

type inputOptions struct {
	TargetSHA    string
	Tag          string
	AssetPath    string
	ManifestPath string
	NotesPath    string
	RunMarker    string
}

type releaseManifest struct {
	TargetSHA string `json:"target_sha"`
	Tag       string `json:"tag"`
	Name      string `json:"name"`
	Digest    string `json:"digest"`
	Size      int64  `json:"size"`
}

func loadPublishRequest(options inputOptions) (PublishRequest, error) {
	manifestData, err := os.ReadFile(options.ManifestPath)
	if err != nil {
		return PublishRequest{}, fmt.Errorf("read manifest: %w", err)
	}
	var manifest releaseManifest
	if err := json.Unmarshal(manifestData, &manifest); err != nil {
		return PublishRequest{}, fmt.Errorf("decode manifest: %w", err)
	}
	notes, err := os.ReadFile(options.NotesPath)
	if err != nil {
		return PublishRequest{}, fmt.Errorf("read notes: %w", err)
	}
	asset, err := os.ReadFile(options.AssetPath)
	if err != nil {
		return PublishRequest{}, fmt.Errorf("read asset: %w", err)
	}
	info, err := os.Stat(options.AssetPath)
	if err != nil {
		return PublishRequest{}, fmt.Errorf("stat asset: %w", err)
	}
	digest := sha256.Sum256(asset)
	request := PublishRequest{
		TargetSHA: options.TargetSHA,
		Tag:       options.Tag,
		AssetPath: options.AssetPath,
		AssetName: filepath.Base(options.AssetPath),
		Digest:    "sha256:" + hex.EncodeToString(digest[:]),
		Size:      info.Size(),
		RunMarker: options.RunMarker,
		Notes:     string(notes),
	}
	if manifest.TargetSHA != request.TargetSHA || manifest.Tag != request.Tag || manifest.Name != request.AssetName || manifest.Digest != request.Digest || manifest.Size != request.Size {
		return PublishRequest{}, errors.New("manifest does not match target or source asset")
	}
	if err := validatePublishRequest(request); err != nil {
		return PublishRequest{}, err
	}
	return request, nil
}
