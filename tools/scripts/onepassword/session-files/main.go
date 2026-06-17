package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"time"
)

const (
	defaultRoot  = "../.."
	defaultVault = "homelab"
)

type action string

const (
	actionSeed    action = "seed"
	actionRestore action = "restore"
)

type config struct {
	action action
	vault  string
	root   string
	force  bool
}

type sessionDocument struct {
	path     string
	title    string
	fileName string
}

func main() {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	if err := run(ctx, os.Args[1:]); err != nil {
		fmt.Fprintln(os.Stderr, err)
		printUsage()
		os.Exit(1)
	}
}

func run(ctx context.Context, args []string) error {
	cfg, err := parseArgs(args)
	if err != nil {
		return err
	}
	if err := ensureSignedIn(ctx); err != nil {
		return fmt.Errorf("1Password CLI is not ready: %w", err)
	}
	switch cfg.action {
	case actionSeed:
		return seedSessions(ctx, cfg)
	case actionRestore:
		return restoreSessions(ctx, cfg)
	default:
		return fmt.Errorf("unsupported action: %s", cfg.action)
	}
}

func parseArgs(args []string) (config, error) {
	if len(args) == 0 {
		return config{}, errors.New("missing action")
	}
	cfg := config{action: action(args[0]), vault: defaultVault, root: defaultRoot}
	if cfg.action != actionSeed && cfg.action != actionRestore {
		return config{}, fmt.Errorf("unknown action: %s", args[0])
	}
	for rest := args[1:]; len(rest) > 0; {
		switch rest[0] {
		case "--vault":
			if len(rest) < 2 {
				return config{}, errors.New("--vault requires a name")
			}
			cfg.vault = rest[1]
			rest = rest[2:]
		case "--root":
			if len(rest) < 2 {
				return config{}, errors.New("--root requires a path")
			}
			cfg.root = rest[1]
			rest = rest[2:]
		case "--force":
			cfg.force = true
			rest = rest[1:]
		default:
			return config{}, fmt.Errorf("unknown argument: %s", rest[0])
		}
	}
	return cfg, nil
}

func sessionDocuments(root string) []sessionDocument {
	return []sessionDocument{
		{
			path:     filepath.Join(root, "sessions.json"),
			title:    "resume-sessions-json",
			fileName: "sessions.json",
		},
		{
			path:     filepath.Join(root, "wanted-session.json"),
			title:    "resume-wanted-session-json",
			fileName: "wanted-session.json",
		},
	}
}

func seedSessions(ctx context.Context, cfg config) error {
	updated := 0
	for _, doc := range sessionDocuments(cfg.root) {
		payload, err := readSessionPayload(doc.path)
		if errors.Is(err, os.ErrNotExist) {
			fmt.Printf("[SKIP] %s is missing\n", doc.path)
			continue
		}
		if err != nil {
			return err
		}
		exists, err := documentExists(ctx, cfg.vault, doc.title)
		if err != nil {
			return err
		}
		if err := storeDocument(ctx, cfg.vault, doc, payload, exists); err != nil {
			return err
		}
		fmt.Printf("[OK] stored %s in 1Password document %s/%s\n", doc.fileName, cfg.vault, doc.title)
		updated++
	}
	if updated == 0 {
		return errors.New("no session files were stored")
	}
	fmt.Printf("Stored %d session file(s). Plaintext values were not printed.\n", updated)
	return nil
}

func restoreSessions(ctx context.Context, cfg config) error {
	restored := 0
	for _, doc := range sessionDocuments(cfg.root) {
		exists, err := documentExists(ctx, cfg.vault, doc.title)
		if err != nil {
			return err
		}
		if !exists {
			fmt.Printf("[SKIP] 1Password document %s/%s is missing\n", cfg.vault, doc.title)
			continue
		}
		if err := restoreDocument(ctx, cfg, doc); err != nil {
			return err
		}
		fmt.Printf("[OK] restored %s from 1Password document %s/%s\n", doc.path, cfg.vault, doc.title)
		restored++
	}
	if restored == 0 {
		return errors.New("no session files were restored")
	}
	return nil
}

func readSessionPayload(path string) ([]byte, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	payload := bytes.TrimSpace(data)
	if len(payload) == 0 {
		return nil, fmt.Errorf("%s is empty", path)
	}
	if !json.Valid(payload) {
		return nil, fmt.Errorf("%s is not valid JSON", path)
	}
	return append(payload, '\n'), nil
}

func storeDocument(ctx context.Context, vault string, doc sessionDocument, payload []byte, exists bool) error {
	if exists {
		return runOpDiscard(ctx, bytes.NewReader(payload), "document", "edit", doc.title, "-", "--vault", vault, "--file-name", doc.fileName)
	}
	return runOpDiscard(ctx, bytes.NewReader(payload), "document", "create", "-", "--vault", vault, "--title", doc.title, "--file-name", doc.fileName, "--tags", "resume,automation,secrets")
}

func restoreDocument(ctx context.Context, cfg config, doc sessionDocument) error {
	if _, err := os.Stat(doc.path); err == nil && !cfg.force {
		return fmt.Errorf("%s already exists; pass --force to overwrite", doc.path)
	}
	if err := os.MkdirAll(filepath.Dir(doc.path), 0o700); err != nil {
		return err
	}
	return runOpDiscard(ctx, nil, "document", "get", doc.title, "--vault", cfg.vault, "--out-file", doc.path, "--file-mode", "0600", "--force")
}

func printUsage() {
	fmt.Fprintln(os.Stderr, "usage: npm run op:seed:sessions -- [--vault homelab] [--root ../..]\n       npm run op:restore:sessions -- [--vault homelab] [--root ../..] [--force]")
}
